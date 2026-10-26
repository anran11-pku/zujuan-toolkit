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
exports.logger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("./config");
const LEVEL_ORDER = {
    quiet: 0,
    normal: 1,
    verbose: 2,
};
class Logger {
    constructor() {
        this.level = 'quiet';
    }
    setLevel(level) {
        this.level = level;
    }
    getLevel() {
        return this.level;
    }
    shouldLog(level) {
        return LEVEL_ORDER[level] <= LEVEL_ORDER[this.level];
    }
    log(level, ...args) {
        if (!this.shouldLog(level))
            return;
        if (level === 'verbose') {
            console.log('[VERBOSE]', ...args);
        }
        else {
            console.log(...args);
        }
    }
    error(...args) {
        // error 级别始终输出
        console.error(...args);
    }
    /**
     * 追加写入 zujuan.log 文件（与 console 输出分离，避免刷屏）。
     * 受 logEnabled / logDir 配置控制；写入失败静默忽略，不影响主流程。
     * 签名与原 browser.ts 的 writeLog(message, level) 保持一致，便于逐处替换。
     */
    fileLog(message, level = 'INFO') {
        try {
            if (!config_1.configManager.get('logEnabled'))
                return;
            const logDir = config_1.configManager.get('logDir');
            if (!logDir)
                return;
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const logPath = path.join(logDir, 'zujuan.log');
            const timestamp = new Date().toISOString();
            fs.appendFileSync(logPath, `[${timestamp}] [${level}] ${message}\n`, 'utf-8');
        }
        catch {
            // 日志写入失败不影响主流程
        }
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map