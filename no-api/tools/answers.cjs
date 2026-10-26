'use strict';
// 只保存当前账号在网页中能够打开的答案；不调用模型或识别服务。
const fs = require('node:fs');
const path = require('node:path');

function restriction(text) {
  text = String(text || '').trim();
  if (!text) return null;
  let status;
  if (/访问过于频繁|安全验证|安全检查|人机验证|滑块|请.{0,12}完成验证/.test(text)) status = 'verification';
  else if (/每日最多|今日.{0,20}(上限|限额|用完|已用尽)|已达.{0,12}(上限|限额)|次数.{0,8}(用完|已用尽|不足)|超过.{0,12}(次数|限额)/.test(text)) status = 'quota';
  else if (/请.{0,8}登录|登录后.{0,12}(查看|使用)|扫码登录|账号登录/.test(text)) status = 'login_required';
  else if (/(开通|升级|购买|申请).{0,12}(会员|权限|体验)|暂无.{0,8}权限|没有.{0,8}权限|权限不足|仅.{0,8}会员/.test(text)) status = 'permission';
  return status ? { status, reason: text.replace(/\s+/g, ' ').slice(0, 240) } : null;
}

async function readState(page, qid) {
  return page.evaluate(id => {
    const visible = el => !!el && el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
    const item = [...document.querySelectorAll('div.tk-quest-item.quesroot')]
      .find(el => el.getAttribute('questionid') === id);
    const notices = [...document.querySelectorAll('.quota-instuff, [role="dialog"], .layui-layer-content, .ant-modal-body, .el-dialog__body, .captcha-wrapper')]
      .filter(visible).map(el => el.innerText.trim()).filter(Boolean);
    if (!document.querySelector('div.tk-quest-item.quesroot')) notices.push(document.body.innerText.slice(0, 1500));
    const images = [];
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const allowed = new Set('P DIV SPAN B I STRONG EM U SUB SUP TABLE TBODY THEAD TR TD TH UL OL LI BR HR'.split(' '));
    const walk = node => {
      if (node.nodeType === 3) return esc(node.textContent);
      if (node.nodeType !== 1 || /^(SCRIPT|STYLE|IFRAME|OBJECT|BUTTON|INPUT)$/.test(node.tagName)) return '';
      if (node.tagName === 'IMG') {
        const src = node.currentSrc || node.src;
        if (!src || /(?:loading|spinner|placeholder)\.(?:gif|png|svg)/i.test(src)) return '';
        const index = images.push(src) - 1;
        return '<img data-answer-index="' + index + '">';
      }
      const inner = [...node.childNodes].map(walk).join('');
      if (!allowed.has(node.tagName)) return inner;
      const tag = node.tagName.toLowerCase();
      if (tag === 'br' || tag === 'hr') return '<' + tag + '>';
      let attributes = '';
      for (const key of ['colspan', 'rowspan']) {
        const value = node.getAttribute(key);
        if (/^\d{1,2}$/.test(value || '')) attributes += ' ' + key + '="' + value + '"';
      }
      return '<' + tag + attributes + '>' + inner + '</' + tag + '>';
    };
    const panels = item ? [...item.querySelectorAll('div.exam-item__opt > div.item.answer, div.exam-item__opt > div.item.analysis, div.exam-item__opt > div.item.explanation')].filter(visible) : [];
    const texts = panels.map(el => el.innerText.trim());
    const html = panels.map(el => '<section>' + [...el.childNodes].map(walk).join('') + '</section>').join('');
    const meaningfulText = texts.join('').replace(/【?(答案|解析|分析|详解|解答)】?|查看答案|查看解析|点击查看|展开|收起|加载中|[\s:：.…]/g, '');
    return { found: !!item, html, images, ready: images.length > 0 || meaningfulText.length > 0,
      loggedOut: visible(document.querySelector('a.login-btn')),
      notices, panelText: texts.join('\n') };
  }, String(qid));
}

function blocked(state) {
  for (const text of state.notices) {
    const result = restriction(text);
    if (result) return result;
  }
  // 只在没有答案图片时把答案区域内的提示视为限制。
  const panelRestriction = state.images.length ? null : restriction(state.panelText);
  if (panelRestriction) return panelRestriction;
  if (!state.ready && state.loggedOut) return { status: 'login_required', reason: '网页显示尚未登录，请先运行“2-登录组卷网.cmd”，登录成功后再获取答案。' };
  return null;
}

async function saveAnswer(page, render, state, filename) {
  const sources = [];
  for (const src of state.images) {
    try {
      if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(src)) { sources.push(src); continue; }
      if (!/^https?:\/\//i.test(src)) { sources.push(null); continue; }
      const response = await page.context().request.get(src, {
        headers: { referer: page.url() }, timeout: 15000
      });
      try {
        const type = (response.headers()['content-type'] || '').split(';')[0].trim();
        if (!response.ok() || !/^image\/(png|jpeg|gif|webp|bmp|svg\+xml)$/i.test(type)) {
          sources.push(null); continue;
        }
        sources.push('data:' + type + ';base64,' + (await response.body()).toString('base64'));
      } finally { await response.dispose(); }
    } catch { sources.push(null); }
  }
  await render.setContent('<!doctype html><meta charset="utf-8"><style>' +
    'body{margin:0;background:white;color:#111}#answer{box-sizing:border-box;width:760px;padding:16px;font:16px/1.8 "Microsoft YaHei",sans-serif}' +
    'section+section{margin-top:16px}img{max-width:100%;height:auto;vertical-align:middle}table{border-collapse:collapse;max-width:100%}td,th{padding:3px}p{margin:8px 0}.missing{color:#a33}' +
    '</style><div id="answer">' + state.html + '</div>');
  const failed = await render.evaluate(async data => {
    const outcomes = await Promise.all([...document.querySelectorAll('img[data-answer-index]')].map(async img => {
      const src = data[Number(img.getAttribute('data-answer-index'))];
      try {
        if (!src) throw new Error('missing');
        img.src = src;
        await img.decode();
        if (img.naturalWidth < 2 || img.naturalHeight < 2) throw new Error('empty');
        return false;
      } catch {
        const label = document.createElement('span');
        label.className = 'missing'; label.textContent = '[此处图片未能保存，请查看原题]';
        img.replaceWith(label); return true;
      }
    }));
    return outcomes.filter(Boolean).length;
  }, sources);
  if (failed && failed === sources.length && !state.panelText.replace(/【?(答案|解析|详解)】?|[\s:：]/g, '')) {
    return { status: 'error', reason: '答案图片未能下载或加载，请稍后重试或在原网页查看。' };
  }
  await render.locator('#answer').screenshot({ path: filename, timeout: 15000 });
  return failed ? { status: 'partial', reason: '已保存可见内容，但有 ' + failed + ' 张图片未能保存，请核对原题。' }
    : { status: 'saved', reason: '' };
}

async function collectAnswers(page, items, results, out, enabled = true) {
  const persist = () => fs.writeFileSync(path.join(out, 'zujuan.json'), JSON.stringify(results, null, 1));
  for (const result of results) {
    result.answerScreenshot = '';
    result.answerStatus = enabled ? 'pending' : 'skipped';
    result.answerReason = enabled ? '答案尚未处理；如果任务中断，可重新运行。' : '本次任务关闭了答案抓取。';
  }
  persist();
  if (!enabled) return { saved: 0, partial: 0, unavailable: results.length };
  let render;
  let stop = null;
  try {
    // 答案渲染只用已下载的图片，不运行网页脚本或加载外部资源。
    render = await page.context().newPage();
    await render.route('**/*', route => route.abort());
    for (let i = 0; i < results.length; i++) {
      const result = results[i], item = items[i];
      let outcome;
      try {
        if (stop) outcome = { ...stop, reason: '本批后续答案已停止获取：' + stop.reason };
        else {
          process.stderr.write('正在获取答案 ' + (i + 1) + '/' + results.length + '…\n');
          if (!/^\d+$/.test(String(item.qid))) throw new Error('invalid question id');
          if (page.url() !== item.listUrl) {
            await page.goto(item.listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          }
          const element = page.locator('div.tk-quest-item.quesroot[questionid="' + item.qid + '"]').first();
          await element.waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
          let state = await readState(page, item.qid);
          outcome = blocked(state);
          if (!outcome && !state.found) outcome = { status: 'unavailable', reason: '原列表页未找到这道题，题目已保留，请通过原题链接查看答案。' };
          if (!outcome && !state.ready) {
            const trigger = element.locator('div.wrapper.quesdiv').first();
            if (await trigger.count()) await trigger.click({ timeout: 8000 });
            const deadline = Date.now() + 6000;
            do {
              await page.waitForTimeout(250);
              state = await readState(page, item.qid);
              outcome = blocked(state);
            } while (!outcome && !state.ready && Date.now() < deadline);
          }
          if (!outcome) {
            if (!state.ready) outcome = { status: 'unavailable', reason: '网页未返回可保存的答案，可能尚未加载、该题没有解析或页面结构已变化。' };
            else {
              const relative = path.join(result.id, 'answer.png');
              outcome = await saveAnswer(page, render, state, path.join(out, relative));
              if (['saved', 'partial'].includes(outcome.status)) result.answerScreenshot = relative.replace(/\\/g, '/');
            }
          }
          if (['quota', 'permission', 'login_required', 'verification'].includes(outcome.status)) stop = outcome;
        }
      } catch (error) {
        // 点击触发限制弹窗后，浏览器操作也可能超时；优先保留网站的真实提示。
        const state = await readState(page, item.qid).catch(() => null);
        outcome = state && blocked(state);
        if (outcome) stop = outcome;
        else outcome = { status: 'error', reason: error.name === 'TimeoutError'
          ? '本题答案页面等待超时，题目已保留，可稍后重试。'
          : '本题答案获取失败（页面操作、网络或图片保存异常），题目已保留。' };
      }
      result.answerStatus = outcome.status;
      result.answerReason = outcome.reason;
      persist();
      if (!stop && i < results.length - 1) await page.waitForTimeout(1200);
    }
  } catch {
    for (const result of results) if (result.answerStatus === 'pending') {
      result.answerStatus = 'error'; result.answerReason = '答案处理未能完成，已抓到的题目保留在此目录。';
    }
  } finally {
    if (render) await render.close().catch(() => {});
    persist();
  }
  return {
    saved: results.filter(q => q.answerStatus === 'saved').length,
    partial: results.filter(q => q.answerStatus === 'partial').length,
    unavailable: results.filter(q => !['saved', 'partial'].includes(q.answerStatus)).length,
    ...(stop ? { note: stop.reason } : {})
  };
}

module.exports = { collectAnswers };
