"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendQrCodeToDiscord = sendQrCodeToDiscord;
const fs = __importStar(require("fs"));
const config_1 = require("./config");
/** 发送二维码到 Discord Webhook（静默失败，不阻塞主流程） */
async function sendQrCodeToDiscord(qrCodePath) {
    const webhookUrl = config_1.configManager.get('qrNotifyDiscord');
    if (!webhookUrl)
        return;
    // 读取图片
    let imageBuffer;
    try {
        imageBuffer = fs.readFileSync(qrCodePath);
    }
    catch {
        console.warn('[warn] Discord 通知：读取二维码图片失败，已保存到本地');
        return;
    }
    const payload = {
        username: '组卷网登录',
        content: '请使用微信扫码登录（60秒内有效）',
    };
    const boundary = 'AaB03x';
    const CRLF = '\r\n';
    const header = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="payload_json"`,
        `Content-Type: application/json`,
        '',
        JSON.stringify(payload),
        `--${boundary}`,
        `Content-Disposition: form-data; name="file"; filename="login-qr.png"`,
        `Content-Type: image/png`,
        '',
        '',
    ].join(CRLF);
    const body = Buffer.concat([
        Buffer.from(header, 'utf8'),
        imageBuffer,
        Buffer.from(CRLF + `--${boundary}--${CRLF}`, 'utf8'),
    ]);
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body,
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok && response.status !== 204) {
            const body2 = await response.text().catch(() => '');
            throw new Error(`Discord 返回 ${response.status}: ${body2}`);
        }
        console.log('[info] Discord 通知已发送');
    }
    catch (error) {
        console.warn('[warn] Discord 通知发送失败，已保存二维码到本地:', error instanceof Error ? error.message : error);
    }
}
//# sourceMappingURL=discord-notifier.js.map