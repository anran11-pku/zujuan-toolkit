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
exports.autoDetectBrowser = autoDetectBrowser;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// ─────────────────────────────────────────────
// 平台检测 & 浏览器路径自动查找
// ─────────────────────────────────────────────
function isLinux() {
    return os.platform() === 'linux';
}
function isMac() {
    return os.platform() === 'darwin';
}
function isWindows() {
    return os.platform() === 'win32';
}
function fileExists(p) {
    try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
    }
    catch {
        return false;
    }
}
function dirExists(p) {
    try {
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
    }
    catch {
        return false;
    }
}
/** 收集 Playwright 安装目录下的 chrome 可执行文件 */
function findPlaywrightChrome(patterns) {
    const playwrightDir = path.join(os.homedir(), '.cache', 'ms-playwright');
    if (!dirExists(playwrightDir))
        return null;
    try {
        const chromiumDirs = fs.readdirSync(playwrightDir);
        for (const dir of chromiumDirs) {
            for (const pattern of patterns) {
                const resolved = pattern.replace('*', dir);
                const candidate = path.join(playwrightDir, resolved);
                if (fileExists(candidate))
                    return candidate;
            }
        }
    }
    catch {
        // ignore
    }
    return null;
}
/** 自动检测系统中 Chrome/Chromium 的安装路径 */
function autoDetectBrowser() {
    if (isLinux()) {
        const candidates = [
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/usr/bin/google-chrome-stable',
        ];
        for (const c of candidates) {
            if (fileExists(c))
                return c;
        }
        const playwright = findPlaywrightChrome(['*/chrome-linux/chrome']);
        if (playwright)
            return playwright;
    }
    if (isWindows()) {
        // 尝试 Windows PATH 中的 chrome.exe（无错误输出）
        try {
            const { execSync } = require('child_process');
            const out = execSync('where chrome 2>NUL', { encoding: 'utf8', timeout: 3000, windowsHide: true });
            const firstPath = out.split('\n')[0].trim();
            if (firstPath && fileExists(firstPath))
                return firstPath;
        }
        catch {
            // where 未找到，继续尝试其他路径
        }
        const winCandidates = [
            path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(process.env['LOCALAPPDATA'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
        ];
        for (const c of winCandidates) {
            if (fileExists(c))
                return c;
        }
        const playwright = findPlaywrightChrome(['*/chrome-win/chrome.exe']);
        if (playwright)
            return playwright;
    }
    if (isMac()) {
        const macCandidates = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
            path.join(os.homedir(), 'Applications/Chromium.app/Contents/MacOS/Chromium'),
        ];
        for (const c of macCandidates) {
            if (fileExists(c))
                return c;
        }
        const playwright = findPlaywrightChrome(['*/chrome-mac/Chromium.app/Contents/MacOS/Chromium']);
        if (playwright)
            return playwright;
    }
    return null;
}
//# sourceMappingURL=browser-detect.js.map