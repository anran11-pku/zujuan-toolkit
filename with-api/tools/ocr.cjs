'use strict';
// 复用原项目的图片识别模块，不自动解题，也不更改已经抓取的图片。
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.env.ZUJUAN_DATA_DIR = path.join(root, 'data');
const core = name => require(path.join(root, 'project', 'dist', 'lib', name));
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}
function loadSettings() {
  const file = path.join(root, 'api.local.json');
  if (!fs.existsSync(file)) throw new Error('请先运行“配置API.cmd”，填写接口地址、密钥和视觉模型名称。');
  let settings;
  try { settings = readJson(file); }
  catch { throw new Error('api.local.json 格式有误，请检查英文双引号和逗号。'); }
  for (const key of ['visionApiUrl', 'visionApiKey', 'visionModel']) {
    if (typeof settings?.[key] !== 'string' || !settings[key].trim()) throw new Error('API 配置缺少 ' + key + '。');
  }
  let url;
  try { url = new URL(settings.visionApiUrl); } catch { throw new Error('API 地址格式不正确。'); }
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))) {
    throw new Error('API 地址须使用 HTTPS；本机代理可使用 localhost 或 127.0.0.1 的 HTTP 地址。');
  }
  return settings;
}
function inside(parent, relative) {
  if (typeof relative !== 'string' || !relative) throw new Error('结果文件路径无效。');
  const target = path.resolve(parent, relative);
  const check = path.relative(parent, target);
  if (!check || check.startsWith('..') || path.isAbsolute(check)) throw new Error('结果文件路径超出当前批次。');
  return target;
}
function latestFolder() {
  const marker = path.join(root, 'data', 'latest-result.txt');
  if (!fs.existsSync(marker)) throw new Error('还没有抓题结果，请先运行“4-开始抓题.cmd”。');
  const latest = inside(root, fs.readFileSync(marker, 'utf8').trim());
  const folder = path.dirname(latest);
  const rel = path.relative(path.join(root, 'output'), folder);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(path.join(folder, 'zujuan.json'))) {
    throw new Error('最近的抓题结果已移动，请重新抓题后再识别。');
  }
  return folder;
}
async function runOcr() {
  const settings = loadSettings();
  const folder = latestFolder();
  const questions = readJson(path.join(folder, 'zujuan.json'));
  if (!Array.isArray(questions) || !questions.length) throw new Error('本批没有可识别的题目。');
  core('config').configManager.set({
    visionApiUrl: settings.visionApiUrl.trim(), visionApiKey: settings.visionApiKey.trim(),
    visionModel: settings.visionModel.trim(), visionEnabled: true
  });
  const { VisionOCRProcessor } = core('vision-ocr');
  const processor = new VisionOCRProcessor();
  const results = [];
  let failed = 0, recognized = 0;
  const save = () => {
    fs.writeFileSync(path.join(folder, 'ocr.json'), JSON.stringify(results, null, 2), 'utf8');
    const text = ['# 题目与答案图片识别结果', '', '以下文字由 API 识别，请对照原图片核对公式和内容。', ''];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      text.push('## 第 ' + (i + 1) + ' 题', '', '### 题目', '', result.questionText || result.questionNote, '',
        '### 答案与解析', '', result.answerText || result.answerNote, '');
      if (result.answerStatus === 'partial' && result.answerText) text.push('注意：原答案图片仅部分保存，以上识别内容可能不完整。', '');
    }
    fs.writeFileSync(path.join(folder, '识别结果.md'), text.join('\n'), 'utf8');
  };
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log('正在识别第 ' + (i + 1) + '/' + questions.length + ' 题…');
    const result = { id: q.id, qid: q.qid, answerStatus: q.answerStatus || '', questionText: '', answerText: '', questionNote: '', answerNote: '' };
    for (const [imageKey, textKey, noteKey, method] of [
      ['screenshot', 'questionText', 'questionNote', 'imageToMarkdown'],
      ['answerScreenshot', 'answerText', 'answerNote', 'answerToMarkdown']
    ]) {
      if (!q[imageKey]) { result[noteKey] = imageKey === 'screenshot' ? '原题目截图未保存，未调用 API。' : '未获取到答案图片，未调用 API，不自动生成答案。'; continue; }
      try {
        const file = inside(folder, q[imageKey]);
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error('missing image');
        result[textKey] = await processor[method](file);
        recognized++;
      } catch {
        result[noteKey] = '图片识别未完成，请检查图片、API 配置、服务连接和可用额度。';
        failed++;
      }
    }
    results.push(result);
    save();
  }
  console.log('已识别 ' + recognized + ' 张图片，失败 ' + failed + ' 张。原始抓题结果保持不变。');
  console.log('文字结果：' + path.join(folder, '识别结果.md'));
  if (failed) process.exitCode = 1;
  return { recognized, failed };
}
if (require.main === module) {
  const action = process.argv[2];
  Promise.resolve().then(() => {
    if (action === '--check') { loadSettings(); console.log('API 配置格式检查通过，未发送 API 请求。'); }
    else return runOcr();
  }).catch(() => { console.error('识别未完成：请先安装、配置 API 并抓取题目，再检查接口是否支持图片输入。'); process.exitCode = 1; });
}
module.exports = { loadSettings, latestFolder, runOcr };
