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
exports.browserManager = exports.BrowserManager = void 0;
const playwright_1 = require("playwright");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const http = __importStar(require("http"));
const config_1 = require("./config");
const logger_1 = require("./logger");
const browser_state_1 = require("./browser-state");
const browser_detect_1 = require("./browser-detect");
const discord_notifier_1 = require("./discord-notifier");
// 辅助函数：通过 HTTP 获取 WebSocket URL
async function getWsEndpoint(port, retries = 15, delayMs = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await new Promise((resolve, reject) => {
                const req = http.request({
                    hostname: '127.0.0.1',
                    port,
                    path: '/json/version',
                    method: 'GET',
                    timeout: 3000,
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        try {
                            const version = JSON.parse(data);
                            if (version.webSocketDebuggerUrl) {
                                resolve(version.webSocketDebuggerUrl);
                            }
                            else {
                                reject(new Error('未找到 webSocketDebuggerUrl'));
                            }
                        }
                        catch {
                            reject(new Error('解析版本信息失败: ' + data));
                        }
                    });
                });
                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('HTTP 请求超时'));
                });
                req.end();
            });
            return result;
        }
        catch {
            // 静默忽略，等待下一次重试
        }
        if (i < retries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    throw new Error(`在 ${retries} 次尝试后仍无法获取 WebSocket 端点`);
}
class BrowserManager {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.chromeProcess = null;
        this.wsEndpoint = null;
        this.pid = null;
    }
    static getInstance() {
        if (!BrowserManager.instance) {
            BrowserManager.instance = new BrowserManager();
        }
        return BrowserManager.instance;
    }
    // 启动浏览器（使用 child_process）
    async launch() {
        logger_1.logger.fileLog('开始启动浏览器...');
        const browserDir = config_1.configManager.get('browserDir');
        const headless = config_1.configManager.get('headless');
        const port = config_1.configManager.get('browserPort');
        // 检查端口上是否已有浏览器运行（即使状态文件丢失）
        if (await browser_state_1.BrowserStateManager.isBrowserRunningOnPort(port)) {
            console.log(`检测到端口 ${port} 上已有浏览器运行，尝试连接到现有浏览器...`);
            logger_1.logger.fileLog(`检测到端口 ${port} 上已有浏览器运行`);
            try {
                await this.connect();
                console.log('成功连接到已运行的浏览器！');
                return;
            }
            catch (connectError) {
                logger_1.logger.fileLog(`连接现有浏览器失败: ${connectError}，将尝试重新启动`);
                console.log('连接失败，将重新启动浏览器...');
            }
        }
        if (browser_state_1.BrowserStateManager.isBrowserRunning()) {
            const state = browser_state_1.BrowserStateManager.load();
            console.log(`浏览器已在运行 (PID: ${state?.pid})，请先使用 shutup 命令关闭`);
            logger_1.logger.fileLog('启动失败：浏览器已在运行');
            throw new Error('浏览器已在运行');
        }
        // 找到 chromium 可执行文件（优先用配置的，兜底自动检测）
        let chromiumPath = browserDir;
        if (!chromiumPath || !fs.existsSync(chromiumPath)) {
            const detected = (0, browser_detect_1.autoDetectBrowser)();
            if (detected) {
                chromiumPath = detected;
            }
        }
        if (!chromiumPath || !fs.existsSync(chromiumPath)) {
            throw new Error(`未找到浏览器可执行文件，请通过 config --browser-dir 指定 Chrome/Chromium 安装路径`);
        }
        const isWin = os.platform() === 'win32';
        const args = [
            headless ? '--headless' : '',
            `--remote-debugging-port=${port}`,
            '--no-first-run',
            '--no-default-browser-check',
            isWin ? '' : '--disable-dev-shm-usage',
            '--no-sandbox',
            `--user-data-dir=${path.join(os.tmpdir(), `zujuan-chrome-${port}`)}`,
        ].filter(Boolean);
        logger_1.logger.fileLog(`启动 Chromium: ${chromiumPath}`);
        logger_1.logger.fileLog(`参数: ${args.join(' ')}`);
        try {
            // 使用 child_process 启动浏览器（detached 模式）
            this.chromeProcess = (0, child_process_1.spawn)(chromiumPath, args, {
                detached: true,
                stdio: 'ignore',
            });
            this.pid = this.chromeProcess.pid || null;
            this.chromeProcess.unref(); // 让进程独立于父进程
            if (this.pid) {
                logger_1.logger.fileLog(`Chromium 进程已启动，PID: ${this.pid}`);
            }
            // 尽早保存最小状态，这样 Ctrl+C 在 getWsEndpoint 轮询阶段中断时，
            // 下次 start 仍能感知到 Chrome 在运行
            if (this.pid) {
                browser_state_1.BrowserStateManager.saveStartup(this.pid, port);
            }
            // 获取 WebSocket 端点
            this.wsEndpoint = await getWsEndpoint(port);
            logger_1.logger.fileLog(`WebSocket 端点: ${this.wsEndpoint}`);
            // 连接成功后将完整状态（包含 wsEndpoint）覆盖写入
            browser_state_1.BrowserStateManager.save({
                wsEndpoint: this.wsEndpoint,
                pid: this.pid,
                port,
                startedAt: new Date().toISOString(),
            });
            logger_1.logger.fileLog('浏览器状态已保存（启动阶段）');
            // 通过 CDP 连接到浏览器
            this.browser = await playwright_1.chromium.connectOverCDP(this.wsEndpoint);
            logger_1.logger.fileLog('已连接到浏览器');
            // 获取页面
            const contexts = this.browser.contexts();
            if (contexts.length > 0) {
                this.context = contexts[0];
                const pages = this.context.pages();
                if (pages.length > 0) {
                    this.page = pages[0];
                }
            }
            if (!this.page) {
                this.context = await this.browser.newContext();
                this.page = await this.context.newPage();
            }
            // 访问初始页面前先恢复 storage-state Cookie，再应用配置 Cookie
            await this.applyStorageStateCookies();
            await this.applyConfigCookies();
            await this.page.goto('https://zujuan.xkw.com', { waitUntil: 'domcontentloaded' });
            await this.page.waitForTimeout(2000);
            // 移除覆盖层
            await this.removeOverlay();
            // 检查登录状态
            const isLoggedIn = await this.checkLoginStatus();
            if (!isLoggedIn) {
                console.log('未登录，开始扫码登录流程...');
                logger_1.logger.fileLog('检测到未登录，开始扫码登录');
                await this.doQRCodeLogin();
            }
            else {
                console.log('已登录');
                logger_1.logger.fileLog('检测到已登录状态');
            }
            // 保存登录状态
            await this.saveLoginState();
            // 保存浏览器状态
            if (this.wsEndpoint && this.pid) {
                browser_state_1.BrowserStateManager.save({
                    wsEndpoint: this.wsEndpoint,
                    pid: this.pid,
                    port,
                    startedAt: new Date().toISOString(),
                });
                console.log('浏览器状态已保存');
            }
            console.log('浏览器启动成功！');
            logger_1.logger.fileLog('浏览器启动完成');
        }
        catch (error) {
            logger_1.logger.fileLog(`浏览器启动失败: ${error}`, 'ERROR');
            // 清理
            if (this.chromeProcess) {
                try {
                    process.kill(this.pid, 'SIGTERM');
                }
                catch {
                    // 进程可能已退出，忽略
                }
            }
            this.browser = null;
            this.chromeProcess = null;
            browser_state_1.BrowserStateManager.clear();
            throw error;
        }
    }
    // 连接到已运行的浏览器
    async connect() {
        logger_1.logger.fileLog('尝试连接到已运行的浏览器...');
        const state = browser_state_1.BrowserStateManager.load();
        if (!state) {
            logger_1.logger.fileLog('未找到浏览器状态文件，请先运行 start 命令', 'ERROR');
            throw new Error('未找到浏览器状态文件，请先运行 start 命令');
        }
        if (!browser_state_1.BrowserStateManager.isProcessRunning(state.pid)) {
            logger_1.logger.fileLog(`浏览器进程 ${state.pid} 不存在或已崩溃`, 'ERROR');
            browser_state_1.BrowserStateManager.clear();
            throw new Error(`浏览器进程不存在或已崩溃，请重新运行 start 命令`);
        }
        logger_1.logger.fileLog(`连接到浏览器，PID: ${state.pid}`);
        try {
            // 如果 wsEndpoint 为空（上次 launch 在 getWsEndpoint 轮询阶段被 Ctrl+C 中断），
            // 重新从端口获取 WebSocket 端点
            const endpoint = state.wsEndpoint || (await getWsEndpoint(state.port));
            this.browser = await playwright_1.chromium.connectOverCDP(endpoint);
            this.wsEndpoint = endpoint;
            this.pid = state.pid;
            const contexts = this.browser.contexts();
            if (contexts.length > 0) {
                this.context = contexts[0];
                const pages = this.context.pages();
                if (pages.length > 0) {
                    this.page = pages[0];
                }
            }
            if (!this.page) {
                this.context = await this.browser.newContext();
                this.page = await this.context.newPage();
            }
            logger_1.logger.fileLog('成功连接到浏览器');
        }
        catch (error) {
            logger_1.logger.fileLog(`连接浏览器失败: ${error}`, 'ERROR');
            browser_state_1.BrowserStateManager.clear();
            throw new Error('连接浏览器失败，请重新运行 start 命令', { cause: error });
        }
    }
    async applyStorageStateCookies() {
        try {
            if (!this.context)
                return;
            if (!fs.existsSync(browser_state_1.STORAGE_STATE_FILE))
                return;
            const state = JSON.parse(fs.readFileSync(browser_state_1.STORAGE_STATE_FILE, 'utf-8'));
            const cookies = (state.cookies || []).filter((c) => c.name && c.domain);
            if (cookies.length > 0) {
                await this.context.addCookies(cookies);
                logger_1.logger.fileLog(`已从 storage-state 恢复 ${cookies.length} 个 Cookie`);
            }
        }
        catch (error) {
            logger_1.logger.fileLog(`应用 storage-state Cookie 失败: ${error}`, 'WARN');
        }
    }
    async applyConfigCookies() {
        try {
            const rawCookie = config_1.configManager.get('cookie');
            if (!rawCookie)
                return;
            const cookies = rawCookie
                .split(';')
                .map((c) => {
                const [name, ...valueParts] = c.trim().split('=');
                return {
                    name: name.trim(),
                    value: decodeURIComponent(valueParts.join('=')),
                    domain: 'zujuan.xkw.com',
                    path: '/',
                };
            })
                .filter((c) => c.name);
            if (cookies.length > 0) {
                await this.context.addCookies(cookies);
                logger_1.logger.fileLog(`已应用 ${cookies.length} 个配置 Cookie`);
            }
        }
        catch (error) {
            logger_1.logger.fileLog(`应用配置 Cookie 失败: ${error}`, 'WARN');
        }
    }
    async removeOverlay() {
        try {
            const overlay = await this.page.$('div.ai-search-guide-panel');
            if (overlay) {
                logger_1.logger.fileLog('移除覆盖层...');
                await this.page.evaluate(() => {
                    const el = document.querySelector('div.ai-search-guide-panel');
                    if (el)
                        el.style.display = 'none';
                });
                await this.page.waitForTimeout(500);
            }
        }
        catch (error) {
            logger_1.logger.fileLog(`移除覆盖层失败: ${error}`, 'WARN');
        }
    }
    async checkLoginStatus() {
        try {
            // a.login-btn 存在表示未登录，不存在表示已登录
            const loginBtn = await this.page.$('a.login-btn');
            return loginBtn === null;
        }
        catch {
            return false;
        }
    }
    async doQRCodeLogin() {
        try {
            // 直接通过 JS 调用登录函数
            console.log('正在触发登录函数...');
            await this.page.evaluate(() => {
                const overlay = document.querySelector('div.ai-search-guide-panel');
                if (overlay)
                    overlay.style.display = 'none';
                const win = window;
                if (typeof win.logindiv === 'function') {
                    win.logindiv();
                }
            });
            // 等待跳转到 CAS 登录页并等待页面加载
            console.log('正在等待登录页加载...');
            await this.page.waitForLoadState('load');
            await this.page.waitForTimeout(3000);
            // 等待二维码加载（支持 canvas 或 img 两种渲染方式）
            console.log('正在获取二维码...');
            const currentUrl = this.page.url();
            logger_1.logger.fileLog(`当前页面 URL: ${currentUrl}`);
            // 尝试多种方式等待二维码
            try {
                await this.page.waitForSelector('#qrcode canvas', { timeout: 10000 });
            }
            catch {
                // canvas 不存在则尝试 img
                const img = await this.page.$('#qrcode img');
                if (!img) {
                    throw new Error('未找到二维码元素（#qrcode canvas 或 #qrcode img）');
                }
                logger_1.logger.fileLog('二维码通过 img 标签渲染');
            }
            const loginQrDir = config_1.configManager.get('loginQrDir');
            const qrCodePath = path.join(loginQrDir, 'login-qr.png');
            const qrcode = await this.page.$('#qrcode');
            if (qrcode) {
                if (!fs.existsSync(loginQrDir)) {
                    fs.mkdirSync(loginQrDir, { recursive: true });
                }
                await qrcode.screenshot({ path: qrCodePath });
                console.log(`\n二维码已保存到: ${qrCodePath}\n`);
                // 发送 Discord 通知（静默失败，不阻塞流程）
                (0, discord_notifier_1.sendQrCodeToDiscord)(qrCodePath);
            }
            console.log('请打开手机微信扫码登录（60秒内）...');
            let loginSuccess = false;
            const startTime = Date.now();
            let lastCheckUrl = '';
            while (Date.now() - startTime < 60000) {
                await this.page.waitForTimeout(2000);
                // 每次轮询整体 try-catch，防止页面导航导致旧引用失效而崩溃
                try {
                    // 方法1: 尝试更新 this.page 引用（CAS 登录成功后可能会导航到新页面）
                    try {
                        const currentUrl = this.page.url();
                        if (currentUrl !== lastCheckUrl) {
                            logger_1.logger.fileLog(`轮询 - URL: ${currentUrl}`);
                            lastCheckUrl = currentUrl;
                        }
                    }
                    catch {
                        // this.page 已失效，从 browser 获取最新的活跃页面
                        logger_1.logger.fileLog('主页面引用已失效，尝试获取新页面...', 'WARN');
                        try {
                            const pages = this.browser?.contexts()[0]?.pages() || [];
                            if (pages.length > 0) {
                                this.page = pages[pages.length - 1];
                                logger_1.logger.fileLog(`已更新主页面引用，新 URL: ${this.page.url()}`);
                            }
                        }
                        catch (e2) {
                            logger_1.logger.fileLog(`获取新页面失败: ${e2}`, 'WARN');
                        }
                    }
                    // 方法2（核心）: 在后台开一个新页面去主站检查登录状态
                    // 新页面与 CAS 页共享同一个 browser context（共享 cookies）
                    let tempPage = null;
                    try {
                        tempPage = await this.context.newPage();
                        await tempPage.goto('https://zujuan.xkw.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
                        await tempPage.waitForTimeout(1000);
                        // 检查 a.login-btn 是否存在（不存在 = 已登录）
                        const loginBtn = await tempPage.$('a.login-btn');
                        const loggedIn = loginBtn === null;
                        if (loggedIn) {
                            loginSuccess = true;
                            console.log('扫码成功！');
                            logger_1.logger.fileLog('扫码登录成功（后台页面检测）');
                            await tempPage.close().catch(() => { });
                            break;
                        }
                    }
                    catch (e) {
                        logger_1.logger.fileLog(`后台登录检测异常: ${e}`, 'WARN');
                    }
                    finally {
                        if (tempPage) {
                            await tempPage.close().catch(() => { });
                        }
                    }
                    // 方法3（辅助）: 仅在 this.page 有效时检查二维码是否消失
                    try {
                        const qrcodeCanvas = await this.page.$('#qrcode canvas');
                        const qrcodeImg = await this.page.$('#qrcode img');
                        if (!qrcodeCanvas && !qrcodeImg) {
                            logger_1.logger.fileLog('二维码已消失，等待确认登录状态...');
                            await this.page.waitForTimeout(2000);
                            let confirmPage = null;
                            try {
                                confirmPage = await this.context.newPage();
                                await confirmPage.goto('https://zujuan.xkw.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
                                await confirmPage.waitForTimeout(1000);
                                const confirmBtn = await confirmPage.$('a.login-btn');
                                if (confirmBtn === null) {
                                    loginSuccess = true;
                                    console.log('扫码成功！');
                                    logger_1.logger.fileLog('扫码登录成功（二维码消失 + 后台确认）');
                                    await confirmPage.close().catch(() => { });
                                    break;
                                }
                            }
                            catch (e) {
                                logger_1.logger.fileLog(`二维码消失后确认登录失败: ${e}`, 'WARN');
                            }
                            finally {
                                if (confirmPage) {
                                    await confirmPage.close().catch(() => { });
                                }
                            }
                        }
                    }
                    catch {
                        // this.page 失效导致二维码检查失败，忽略，下次轮询会自动恢复引用
                        logger_1.logger.fileLog('二维码检查跳过（页面引用可能已失效）', 'WARN');
                    }
                }
                catch {
                    logger_1.logger.fileLog('轮询迭代异常，继续等待', 'WARN');
                }
            }
            if (!loginSuccess) {
                logger_1.logger.fileLog('扫码登录超时', 'ERROR');
                await this.shutdown();
                throw new Error('扫码登录超时（60秒）');
            }
            await this.page.waitForTimeout(2000);
        }
        catch (error) {
            logger_1.logger.fileLog(`扫码登录异常: ${error}`, 'ERROR');
            await this.shutdown();
            throw error;
        }
    }
    async saveLoginState() {
        if (this.context) {
            await this.context.storageState({ path: browser_state_1.STORAGE_STATE_FILE });
            logger_1.logger.fileLog(`登录状态已保存到: ${browser_state_1.STORAGE_STATE_FILE}`);
        }
    }
    async getPage() {
        if (!this.page) {
            await this.connect();
        }
        return this.page;
    }
    async close() {
        logger_1.logger.fileLog('关闭浏览器连接');
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
            this.wsEndpoint = null;
        }
    }
    async shutdown() {
        logger_1.logger.fileLog('执行 shutdown，关闭浏览器进程');
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        if (this.chromeProcess && this.pid) {
            try {
                process.kill(this.pid, 'SIGTERM');
            }
            catch {
                // 进程可能已退出，忽略
            }
            this.chromeProcess = null;
        }
        const state = browser_state_1.BrowserStateManager.load();
        if (state) {
            browser_state_1.BrowserStateManager.killProcess(state.pid);
        }
        this.context = null;
        this.page = null;
        this.wsEndpoint = null;
        this.pid = null;
        browser_state_1.BrowserStateManager.clear();
        console.log('浏览器已关闭');
        logger_1.logger.fileLog('浏览器已完全关闭');
    }
    isConnected() {
        return this.browser !== null;
    }
    async isLoggedIn() {
        if (!this.page)
            return false;
        try {
            const loginBtn = await this.page.$('a.login-btn');
            return loginBtn === null;
        }
        catch {
            return false;
        }
    }
    isRunning() {
        return browser_state_1.BrowserStateManager.isBrowserRunning();
    }
}
exports.BrowserManager = BrowserManager;
BrowserManager.instance = null;
exports.browserManager = BrowserManager.getInstance();
//# sourceMappingURL=browser.js.map