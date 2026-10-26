// 组卷网取题：给讲义找题时，先从组卷网（已登录的组卷工具浏览器）拿真题。
// 保存题目、配图，以及当前账号可查看的答案解析；不生成解答。
// 用法：node zujuan_fetch.js < 任务.json，任务 = { zujuanDir, grade: 'middle'|'high', keywords: [方法, 课题] 或 points: ['zsd5554', ...], difficulty, perPoint, maxPoints, out }
//   也可以：node zujuan_fetch.js 任务.json
// 输出：out/zujuan.json，每道题一个 zNN 文件夹（question.png 截图，公式旁标红色编号；fig_k.* 题图）
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { collectAnswers } = require('./answers.cjs');

const job = JSON.parse(fs.readFileSync(process.argv[2] || 0, 'utf8'));
const Z = job.zujuanDir;
const req = m => require(path.join(Z, 'dist', 'lib', m));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const REFERER = 'https://zujuan.xkw.com/';

// 知识点打分：知识点名与“方法”“课题”的二字片段算重合度（兼顾两边，避免“四边形”这种太宽的名字占先），叶子节点优先
function pickPoints(grade, keywords, max) {
  const db = req('knowledge-tree-sqlite');
  db.ensureDatabase();
  const rows = db.getDb().prepare('SELECT * FROM knowledge_nodes WHERE grade = ?').all(grade);
  const children = new Map();
  for (const r of rows) if (r.parent_id) children.set(r.parent_id, (children.get(r.parent_id) || 0) + 1);
  const clean = s => String(s).replace(/[^一-龥A-Za-z0-9]/g, '');
  const longestCommon = (x, y) => { let best = 0; for (let i = 0; i < x.length; i++) for (let j = 0; j < y.length; j++) { let k = 0; while (x[i + k] && x[i + k] === y[j + k]) k++; if (k > best) best = k; } return best; };
  const grams = s => { const t = clean(s); const g = new Set(); for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2)); return g; };
  const want = keywords.map(grams);
  const scored = rows.map(r => {
    const g = grams(r.name);
    if (!g.size) return null;
    const s = want.reduce((sum, w, i) => {
      let hit = 0; for (const x of g) if (w.has(x)) hit++;
      const precision = hit / g.size, recall = w.size ? hit / w.size : 0;
      return sum + (hit ? 2 * precision * recall / (precision + recall) : 0) * (i === 0 ? 1.5 : 1);
    }, 0);
    // 方法里直接出现了知识点名的一大段（如“十字相乘法”“倍长中线”），说明就是这个知识点
    const name = clean(r.name.replace(/[（(].*?[)）]/g, '')), method = clean(keywords[0] || '');
    const common = longestCommon(name, method);
    const bonus = common >= 3 ? 1.2 * common / Math.min(name.length, method.length) : 0;
    // 叶子节点略加分；层级越高的大类（如第 1 层的“三角形”整章）越压低，题会太杂
    const broad = r.level <= 1 ? 0.6 : r.level === 2 ? 0.2 : 0;
    return { id: r.id, name: r.name, score: s + bonus + (children.get(r.id) ? 0 : 0.1) - broad };
  }).filter(x => x && x.score > 0.5).sort((a, b) => b.score - a.score);
  return scored.slice(0, max);
}

async function ensureBrowser() {
  const state = require(path.join(Z, 'dist', 'lib', 'browser-state')).BrowserStateManager;
  if (!state.isBrowserRunning()) {
    // 电脑重启后组卷工具的浏览器没开：用保存的登录状态重新打开（登录过期时它会弹二维码，等不到就算了）
    spawnSync(process.execPath, [path.join(Z, 'dist', 'index.js'), 'start'], { cwd: Z, timeout: 100000, stdio: 'inherit', windowsHide: true });
  }
  const { browserManager } = req('browser');
  await browserManager.connect();
  return browserManager;
}

async function readList(page) {
  return page.evaluate(() => [...document.querySelectorAll('div.tk-quest-item.quesroot')].map(el => {
    const cnt = el.querySelector('div.exam-item__cnt');
    if (!cnt) return null;
    const add = el.querySelector('div.ques-additional');
    const info = { questionType: '', difficulty: '', scoreRate: null };
    add?.querySelectorAll('div.msg-box > div.left-msg span.addi-info > span.info-cnt').forEach(span => {
      const t = span.textContent.trim(), m = t.match(/^(.+?)\(([0-9.]+)\)$/);
      if (m) { info.difficulty = m[1].trim(); info.scoreRate = parseFloat(m[2]); } else if (t.includes('题')) info.questionType = t.split(':')[1]?.trim() || t;
    });
    // 题干文字：公式图换成 ⟦n⟧，题图换成 [图k]，换行保留
    let n = 0, k = 0;
    const figures = [];
    const walk = node => {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return '';
      const tag = node.tagName;
      if (tag === 'IMG') {
        if (node.src.includes('/formula/')) { n++; node.setAttribute('data-f', n); return `⟦${n}⟧`; }
        k++; figures.push(node.src); node.setAttribute('data-g', k); return `[图${k}]`;
      }
      if (tag === 'BR') return '\n';
      const inner = [...node.childNodes].map(walk).join('');
      return /^(P|DIV|TR|LI|TABLE)$/.test(tag) ? '\n' + inner + '\n' : tag === 'TD' ? inner + '\t' : inner;
    };
    const text = walk(cnt).replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().replace(/^\d+\s*[.．、]\s*/, '');
    return {
      qid: el.getAttribute('questionid'), text, formulas: n, figureUrls: figures, html: cnt.innerHTML,
      source: add?.querySelector('span.addi-msg > a')?.getAttribute('title') || '',
      keywords: [...(add?.querySelectorAll('div.knowledge-list-wrapper > div.knowledge-list > a') || [])].map(a => a.getAttribute('title')).filter(Boolean),
      ...info,
    };
  }).filter(Boolean));
}

async function main() {
  const out = path.resolve(job.out);
  fs.mkdirSync(out, { recursive: true });
  const grade = job.grade === 'high' ? 'high' : 'middle';
  req('knowledge-tree-sqlite').ensureDatabase();
  // 也可以直接指定从知识点树查到的编号。
  const points = Array.isArray(job.points) && job.points.length
    ? job.points.slice(0, 4).map(id => String(id).match(/^(?:zsd)?(\d{3,7})$/)).filter(Boolean).map(m => ({ id: 'zsd' + m[1], name: req('knowledge-tree-sqlite').getNodeById('zsd' + m[1], grade)?.name || 'zsd' + m[1] }))
    : pickPoints(grade, job.keywords || [], job.maxPoints || 3);
  // 不用网址里的难度筛选：带难度参数的网址会被组卷网跳到别的知识点。按“综合”排序取（多为适中题），难度交给服务器初筛按标签挑
  if (!points.length) return { ok: false, reason: '组卷网知识点里没找到和这组题相近的', points };
  if (job.dryRun) return { ok: true, points };
  const bm = await ensureBrowser();
  const page = await bm.getPage();
  const { UrlBuilder } = req('url-builder');
  const items = [], seen = new Set();
  let loggedOut = false;
  try {
    // 组卷网难度标签和本组要求对得上的优先；对得上的不够就翻页（最多 5 页），还不够再用对不上的补到每个知识点 perPoint 道
    const level = String(job.difficulty || '');
    const want = /较难|提高|拔高|压轴|难/.test(level) && !/中档|中等/.test(level) ? ['较难', '困难'] : /基础|容易|简单/.test(level) ? ['容易', '较易'] : ['适中'];
    const perPoint = job.perPoint || 8;
    // 同一份讲义别的组已经取过的题跳过（服务器在领任务时给出），往后翻页找新题
    const skip = new Set((job.seen || []).map(String)), maxPages = job.maxPages || 5;
    for (const p of points) {
      const matched = [], others = [];
      for (let pageNo = 1; pageNo <= maxPages && matched.length < perPoint; pageNo++) {
        // “最新”排前面全是本月九年级月考综合题，“最热”排前面多是中考压轴题，“综合”最接近常规难度
        await page.goto(UrlBuilder.buildUrl(p.id, { page: pageNo }, grade, 'comprehensive'), { waitUntil: 'domcontentloaded' });
        await sleep(3500);
        // 题目不登录也能看（本来就不需要解析），掉线了照常取，只记一句
        if (!(await bm.isLoggedIn())) loggedOut = true;
        const list = await readList(page);
        if (!list.length) {
          const body = await page.evaluate(() => document.body.innerText.slice(0, 300));
          // 碰到验证页就停下，不去绕过
          if (/验证|滑块|安全检查|访问过于频繁/.test(body)) return { ok: false, reason: '组卷网要求人工验证，本次不再访问', points };
          break;
        }
        for (const q of list) if (!seen.has(q.qid) && !skip.has(String(q.qid))) { seen.add(q.qid); (want.includes(q.difficulty) ? matched : others).push({ ...q, point: p.name, pointId: p.id, listUrl: page.url() }); }
        await sleep(2000);
      }
      items.push(...matched.slice(0, perPoint), ...others.slice(0, Math.max(0, perPoint - matched.length)));
    }
    // 干净页面里排版截图：网站本身有悬浮导航和动画，直接截会被挡住或一直等不稳
    const ctx = page.context();
    const render = await ctx.newPage();
    await render.route(/https?:\/\/[^/]*xkw\.com\/.*/, route => route.continue({ headers: { ...route.request().headers(), referer: REFERER } }));
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const q = items[i], dir = 'z' + String(i + 1).padStart(2, '0');
      fs.mkdirSync(path.join(out, dir), { recursive: true });
      // 去掉题号；脚本、事件属性不带进来
      const html = q.html.replace(/^\s*\d+\s*[.．、]\s*/, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
      await render.setContent(`<!doctype html><meta charset="utf-8"><style>
        body{margin:0;background:#fff} #q{width:680px;padding:14px 16px;font:16px/1.9 "Microsoft YaHei",sans-serif;color:#111}
        #q img{vertical-align:middle} #q img[data-g]{max-width:360px;display:inline-block}
        .n{color:#d00;font:bold 10px/1 Arial;vertical-align:super;margin:0 1px;border:1px solid #d00;border-radius:3px;padding:0 2px}
        </style><div id="q">${html}</div>`, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
      await render.evaluate(() => {
        let n = 0, k = 0;
        document.querySelectorAll('#q img').forEach(img => {
          const s = document.createElement('span'); s.className = 'n';
          if (img.src.includes('/formula/')) s.textContent = String(++n); else { img.setAttribute('data-g', ++k); s.textContent = '图' + k; }
          img.after(s);
        });
      });
      await render.waitForTimeout(300);
      const shot = path.join(dir, 'question.png');
      await (await render.$('#q')).screenshot({ path: path.join(out, shot), timeout: 15000 }).catch(() => {});
      const figures = [];
      for (let j = 0; j < q.figureUrls.length && j < 4; j++) {
        try {
          const r = await ctx.request.get(q.figureUrls[j], { headers: { referer: REFERER }, timeout: 20000 });
          if (!r.ok()) continue;
          const ext = (/\.(png|jpe?g|gif|webp)(?:\?|$)/i.exec(q.figureUrls[j])?.[1] || 'png').toLowerCase();
          const f = path.join(dir, `fig_${j + 1}.${ext}`);
          fs.writeFileSync(path.join(out, f), await r.body()); figures.push(f.replace(/\\/g, '/'));
        } catch {}
      }
      results.push({ id: dir, qid: q.qid, url: `https://zujuan.xkw.com/2q${q.qid}.html`, point: q.point, source: q.source, questionType: q.questionType,
        difficulty: q.difficulty, scoreRate: q.scoreRate, keywords: q.keywords, text: q.text, formulas: q.formulas,
        screenshot: fs.existsSync(path.join(out, shot)) ? shot.replace(/\\/g, '/') : '', figures });
      await sleep(150);
    }
    await render.close();
    fs.writeFileSync(path.join(out, 'zujuan.json'), JSON.stringify(results, null, 1));
    const answers = await collectAnswers(page, items, results, out, job.answers !== false);
    return { ok: true, points, count: results.length, answers, ...(loggedOut ? { note: '组卷网未登录，答案能否获取取决于网页实际权限。' } : {}) };
  } finally {
    await bm.close().catch(() => {});   // 只断开连接，组卷工具的浏览器留着下次用
  }
}

main().then(r => { console.log(JSON.stringify(r)); process.exit(0); }, e => { console.log(JSON.stringify({ ok: false, reason: String(e && e.message || e).slice(0, 300) })); process.exit(0); });
