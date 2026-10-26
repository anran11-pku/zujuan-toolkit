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
exports.BrowserStateManager = exports.BROWSER_STATE_FILE = exports.STORAGE_STATE_FILE = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const http = __importStar(require("http"));
const config_1 = require("./config");
const logger_1 = require("./logger");
exports.STORAGE_STATE_FILE = path.join((0, config_1.getConfigDir)(), 'storage-state.json');
exports.BROWSER_STATE_FILE = path.join((0, config_1.getConfigDir)(), '.browser-state.json');
// 浏览器状态文件管理
class BrowserStateManager {
    static save(state) {
        try {
            fs.writeFileSync(exports.BROWSER_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
            logger_1.logger.fileLog(`浏览器状态已保存: PID=${state.pid}, Port=${state.port}`);
        }
        catch (error) {
            logger_1.logger.fileLog(`保存浏览器状态失败: ${error}`, 'ERROR');
        }
    }
    static load() {
        try {
            if (fs.existsSync(exports.BROWSER_STATE_FILE)) {
                const data = fs.readFileSync(exports.BROWSER_STATE_FILE, 'utf-8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            logger_1.logger.fileLog(`读取浏览器状态失败: ${error}`, 'ERROR');
        }
        return null;
    }
    /**
     * 保存启动前最小状态（PID + port，wsEndpoint 尚不可用）。
     * 在 Chrome 刚 spawn 后立即调用，确保 Ctrl+C 中断后状态文件已存在，
     * 下次 start 能感知到 Chrome 在运行。
     */
    static saveStartup(pid, port) {
        try {
            const state = {
                wsEndpoint: '',
                pid,
                port,
                startedAt: new Date().toISOString(),
            };
            fs.writeFileSync(exports.BROWSER_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
            logger_1.logger.fileLog(`Chrome 已启动，PID=${pid}，等待 CDP 端点...`);
        }
        catch (error) {
            logger_1.logger.fileLog(`保存启动状态失败: ${error}`, 'ERROR');
        }
    }
    static clear() {
        try {
            if (fs.existsSync(exports.BROWSER_STATE_FILE)) {
                fs.unlinkSync(exports.BROWSER_STATE_FILE);
                logger_1.logger.fileLog('浏览器状态已清除');
            }
        }
        catch (error) {
            logger_1.logger.fileLog(`清除浏览器状态失败: ${error}`, 'ERROR');
        }
    }
    static isProcessRunning(pid) {
        if (!pid || pid === 0)
            return false;
        try {
            process.kill(pid, 0);
            return true;
        }
        catch {
            return false;
        }
    }
    static async isBrowserRunningOnPort(port) {
        try {
            const result = await new Promise((resolve) => {
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
                            resolve(!!version.webSocketDebuggerUrl);
                        }
                        catch {
                            resolve(false);
                        }
                    });
                });
                req.on('error', () => resolve(false));
                req.on('timeout', () => {
                    req.destroy();
                    resolve(false);
                });
                req.end();
            });
            return result;
        }
        catch {
            return false;
        }
    }
    static isBrowserRunning() {
        const state = this.load();
        if (!state)
            return false;
        if (state.pid && state.pid !== 0) {
            return this.isProcessRunning(state.pid);
        }
        if (state.wsEndpoint) {
            return true;
        }
        return false;
    }
    static killProcess(pid) {
        if (!pid || pid === 0) {
            logger_1.logger.fileLog('PID 为空或 0，跳过进程终止');
            return false;
        }
        try {
            process.kill(pid, 'SIGTERM');
            logger_1.logger.fileLog(`已发送 SIGTERM 到进程 ${pid}`);
            return true;
        }
        catch (error) {
            logger_1.logger.fileLog(`杀掉进程 ${pid} 失败: ${error}`, 'ERROR');
            return false;
        }
    }
}
exports.BrowserStateManager = BrowserStateManager;
//# sourceMappingURL=browser-state.js.map