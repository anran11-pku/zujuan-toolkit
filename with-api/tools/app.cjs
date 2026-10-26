'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const project = path.join(root, 'project');
const data = path.join(root, 'data');
const output = path.join(root, 'output');
process.env.ZUJUAN_DATA_DIR = data;
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, '.runtime', 'browsers');
const req = createRequire(path.join(project, 'package.json'));
const core = name => require(path.join(project, 'dist', 'lib', name));

function child(script, args = [], options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root, windowsHide: true, stdio: 'inherit', ...options
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('程序未完成，退出码：' + result.status);
  return result;
}

function chooseBrowser() {
  const current = core('config').configManager.get('browserDir');
  const candidates = [current, core('browser-detect').autoDetectBrowser(),
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    req('playwright').chromium.executablePath()];
  return candidates.find(p => p && fs.existsSync(p) && fs.statSync(p).isFile());
}

function prepare() {
  fs.mkdirSync(data, { recursive: true });
  for (const name of ['KNOWLEDGE_TREE_HIGH.txt', 'KNOWLEDGE_TREE_MIDDLE.txt']) {
    fs.copyFileSync(path.join(project, name), path.join(data, name));
  }
  const config = core('config').configManager;
  const browserDir = chooseBrowser();
  if (!browserDir) return false;
  const savedPath = path.join(data, 'config.json');
  let previous = {};
  if (fs.existsSync(savedPath)) previous = JSON.parse(fs.readFileSync(savedPath, 'utf8'));
  const port = previous.browserPort || 19000 + parseInt(crypto.createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0, 6), 16) % 10000;
  config.set({ browserDir, loginQrDir: data, logDir: data,
    treeDb: path.join(data, 'knowledge-tree.db'), outputDir: output,
    browserPort: port, headless: false, visionEnabled: false, qrNotifyDiscord: '' });
  core('knowledge-tree-sqlite').ensureDatabase();
  return true;
}

function loadTask() {
  const taskPath = path.join(root, '任务配置.json');
  let job;
  try { job = JSON.parse(fs.readFileSync(taskPath, 'utf8').replace(/^\uFEFF/, '')); }
  catch (e) { throw new Error('任务配置.json 格式有误：' + e.message); }
  if (!job || typeof job !== 'object' || Array.isArray(job)) throw new Error('任务配置必须是一个 JSON 对象。');
  if (!['middle', 'high'].includes(job.grade)) throw new Error('grade 只能填写 middle 或 high。');
  const points = job.points;
  if (points !== undefined && !Array.isArray(points)) throw new Error('points 必须是编号数组。');
  if (points?.length) {
    if (points.length > 4) throw new Error('一次最多指定4个知识点。');
    job.points = points.map(id => {
      const match = String(id).match(/^(?:zsd)?(\d{3,7})$/);
      if (!match) throw new Error('知识点编号格式错误：' + id);
      const value = 'zsd' + match[1];
      if (!core('knowledge-tree-sqlite').getNodeById(value, job.grade)) {
        throw new Error('该学段找不到知识点：' + value + '，请核对 grade 和 points。');
      }
      return value;
    });
  } else if (!Array.isArray(job.keywords) || !job.keywords.some(s => typeof s === 'string' && s.trim())) {
    throw new Error('请填写 points，或使用 keywords 填写课题关键词。');
  }
  for (const [key, fallback, max] of [['perPoint', 3, 10], ['maxPoints', 1, 4], ['maxPages', 3, 10]]) {
    job[key] ??= fallback;
    if (!Number.isInteger(job[key]) || job[key] < 1 || job[key] > max) throw new Error(key + ' 必须是1到' + max + '的整数。');
  }
  if (job.seen !== undefined && !Array.isArray(job.seen)) throw new Error('seen 必须是数组。');
  if (job.answers !== undefined && typeof job.answers !== 'boolean') throw new Error('answers 只能填写 true 或 false。');
  job.seen ??= [];
  job.zujuanDir = project;
  return job;
}

function fetchTask(job) {
  const result = child(path.join(__dirname, 'fetch.js'), [], {
    input: JSON.stringify(job), encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'],
    maxBuffer: 10 * 1024 * 1024, timeout: 20 * 60 * 1000
  });
  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  let report;
  try { report = JSON.parse(lines.at(-1)); }
  catch { throw new Error('未收到有效结果。' + result.stdout.slice(-500)); }
  if (!report.ok) throw new Error(report.reason || '没有获得可用结果。');
  return report;
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function imagePath(value) {
  const parts = String(value || '').replace(/\\/g, '/').split('/');
  if (parts.some(p => !p || p === '..' || p.includes(':'))) return '';
  return parts.map(encodeURIComponent).join('/');
}
function gallery(folder) {
  const items = JSON.parse(fs.readFileSync(path.join(folder, 'zujuan.json'), 'utf8'));
  if (!Array.isArray(items)) throw new Error('题目清单格式有误。');
  const cards = items.map((q, i) => {
    const screenshot = imagePath(q.screenshot);
    const source = /^https:\/\/zujuan\.xkw\.com\//.test(q.url || '') ? q.url : '';
    const answer = imagePath(q.answerScreenshot);
    const labels = { saved: '已保存', partial: '部分保存，请核对', quota: '查看次数已用完', permission: '账号权限不足', login_required: '需要登录', verification: '需要人工验证', unavailable: '未获取到', error: '获取失败', skipped: '未启用', pending: '尚未完成' };
    const answerSection = `<section class="answer"><h3>答案与解析 · ${esc(labels[q.answerStatus] || '旧结果未包含答案')}</h3>${answer ? `<img src="${answer}" alt="第${i + 1}题答案与解析">` : ''}${q.answerReason ? `<p>${esc(q.answerReason)}</p>` : ''}</section>`;
    return `<article><h2>第 ${i + 1} 题 <small>${esc(q.difficulty)}</small></h2><p>${esc(q.point)} · ${esc(q.questionType)}</p>${screenshot ? `<img src="${screenshot}" alt="第${i + 1}题截图">` : '<p>本题未能保存截图。</p>'}${answerSection}<footer>${esc(q.source)} ${source ? `<a href="${esc(source)}" target="_blank" rel="noopener">查看原题</a>` : ''}</footer></article>`;
  }).join('\n');
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>组卷抓题结果</title><style>body{margin:0;background:#f4f6f9;color:#17212f;font:16px/1.6 "Microsoft YaHei",sans-serif}main{max-width:900px;margin:32px auto;padding:0 16px}h1{font-size:28px}article{background:white;padding:20px;margin:20px 0;border:1px solid #dce2eb;border-radius:12px}h2{font-size:20px;margin:0}small,p,footer{color:#64748b}small{font-size:14px}img{max-width:100%;height:auto;display:block;margin:14px 0}a{color:#2563eb}button{padding:8px 16px;border:1px solid #ccd5e1;background:white;border-radius:6px;cursor:pointer}@media print{body{background:white}button{display:none}article{break-inside:avoid}}</style><main><h1>组卷抓题结果 · ${items.length} 道</h1><p>以下是抓取到的题目，请核对知识点和难度。截图中的红色编号用于对应公式和题图。</p><button onclick="window.print()">打印 / 另存为 PDF</button>${cards}</main></html>`;
  fs.writeFileSync(path.join(folder, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(data, 'latest-result.txt'), path.relative(root, path.join(folder, 'index.html')), 'utf8');
  return items.length;
}

function timestamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${d.getMilliseconds()}`;
}

function main(action) {
  if (action === 'latest') {
    const latest = path.join(data, 'latest-result.txt');
    if (!fs.existsSync(latest)) throw new Error('尚未生成结果，请先运行抓题。');
    const target = path.resolve(root, fs.readFileSync(latest, 'utf8').trim());
    const relative = path.relative(output, target);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(target)) throw new Error('最近结果已移动，请到 output 文件夹查找。');
    console.log(target); return;
  }
  if (action === 'gallery') {
    const folder = path.resolve(root, process.argv[3] || '');
    const relative = path.relative(output, folder);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('请选择 output 内的一批结果。');
    fs.mkdirSync(data, { recursive: true }); gallery(folder); return;
  }
  if (!prepare()) { console.error('未找到浏览器，请重新运行一键安装。'); process.exitCode = 2; return; }
  if (action === 'prepare') { console.log('项目环境和知识点数据库已就绪。'); return; }
  if (action === 'login') { child(path.join(project, 'dist', 'index.js'), ['start']); return; }
  if (action === 'stop') { child(path.join(project, 'dist', 'index.js'), ['shutup']); return; }
  if (action === 'list') {
    const args = process.argv.slice(3);
    child(path.join(project, 'dist', 'index.js'), ['list', ...args]); return;
  }
  if (!['check', 'fetch'].includes(action)) throw new Error('未知操作。');
  const job = loadTask();
  const check = fetchTask({ ...job, dryRun: true, out: path.join(data, 'check') });
  console.log('选中的知识点：' + check.points.map(p => `${p.name} (${p.id})`).join('、'));
  if (action === 'check') { console.log('配置检查通过，未访问网站抓题。'); return; }
  job.dryRun = false;
  job.out = path.join(output, timestamp());
  console.log(job.answers === false ? '正在获取题目（本次不取答案），请等待。' : '正在获取题目和网站答案，请等待。首次使用请先完成扫码登录。');
  const report = fetchTask(job);
  if (!report.count) throw new Error('本次没有抓到题，请检查知识点、登录和网站提示。');
  const count = gallery(job.out);
  console.log(`已保存 ${count} 道题。结果目录：${job.out}`);
  if (report.answers) {
    console.log(`答案：已保存 ${report.answers.saved} 道，部分保存 ${report.answers.partial} 道，未保存 ${report.answers.unavailable} 道。`);
    if (report.answers.note) console.log('网站提示：' + report.answers.note);
  }
  console.log('双击“5-查看结果.cmd”即可浏览，也可直接打开结果目录的 index.html。');
}

if (require.main === module) {
  try { main(process.argv[2] || 'check'); }
  catch (e) { console.error('操作未完成：' + e.message); process.exitCode = 1; }
}
module.exports = { loadTask, gallery, imagePath };
