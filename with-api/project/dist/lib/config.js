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
exports.configManager = exports.ConfigManager = void 0;
exports.getConfigDir = getConfigDir;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const browser_detect_1 = require("./browser-detect");
const CONFIG_DIR = process.env.ZUJUAN_DATA_DIR
    ? path.resolve(process.env.ZUJUAN_DATA_DIR)
    : path.join(os.homedir(), '.zujuan-scraper');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
/** 获取配置目录（用于其他模块共享路径） */
function getConfigDir() {
    return CONFIG_DIR;
}
/** 获取代码层默认配置（每次调用时动态计算） */
function buildDefaultConfig() {
    const browserDir = (0, browser_detect_1.autoDetectBrowser)() || '';
    return {
        browserDir,
        loginQrDir: CONFIG_DIR,
        logDir: CONFIG_DIR,
        treeDb: path.join(CONFIG_DIR, 'knowledge-tree.db'),
        grade: 'high',
        order: 'latest',
        treeDepth: 1,
        logLevel: 'quiet',
        visionApiUrl: '',
        visionApiKey: '',
        visionModel: '',
        visionEnabled: false,
        exportFormat: 'both',
        outputDir: path.join(os.homedir(), 'zujuan-output'),
        qrNotifyDiscord: '',
        cookie: '',
        browserPort: 9222,
        headless: false,
        logEnabled: true,
    };
}
// ─────────────────────────────────────────────
// ConfigManager
// ─────────────────────────────────────────────
/** 全部合法配置键（load/set 共用；新增配置项只需在此追加） */
const CONFIG_KEYS = [
    'browserDir',
    'loginQrDir',
    'logDir',
    'treeDb',
    'grade',
    'order',
    'treeDepth',
    'logLevel',
    'visionApiUrl',
    'visionApiKey',
    'visionModel',
    'visionEnabled',
    'exportFormat',
    'outputDir',
    'qrNotifyDiscord',
    'cookie',
    'browserPort',
    'headless',
    'logEnabled',
];
class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }
    loadConfig() {
        const defaults = buildDefaultConfig();
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
                const loaded = JSON.parse(data);
                // 只保留当前 Config 接口中定义的键，旧键（已废弃）自动忽略
                const merged = { ...defaults };
                for (const key of CONFIG_KEYS) {
                    if (loaded[key] !== undefined) {
                        merged[key] = loaded[key];
                    }
                }
                // 如果配置文件中 browserDir 为空但 autoDetect 找到了，静默写入配置文件
                const shouldAutoPersistBrowser = !loaded.browserDir && (0, browser_detect_1.autoDetectBrowser)();
                if (shouldAutoPersistBrowser) {
                    merged.browserDir = (0, browser_detect_1.autoDetectBrowser)();
                    this.config = merged;
                    this.saveConfigSilently(merged);
                }
                return merged;
            }
        }
        catch (error) {
            console.error('加载配置文件失败:', error);
        }
        return { ...defaults };
    }
    /** 静默保存（不打印错误，供 loadConfig 内部调用） */
    saveConfigSilently(cfg) {
        try {
            if (!fs.existsSync(CONFIG_DIR)) {
                fs.mkdirSync(CONFIG_DIR, { recursive: true });
            }
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
        }
        catch {
            // 静默忽略
        }
    }
    saveConfig() {
        try {
            if (!fs.existsSync(CONFIG_DIR)) {
                fs.mkdirSync(CONFIG_DIR, { recursive: true });
            }
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('保存配置文件失败:', error);
        }
    }
    get(key) {
        return this.config[key];
    }
    set(options) {
        // 只处理 defined 的值
        for (const key of CONFIG_KEYS) {
            const value = options[key];
            if (value !== undefined) {
                this.config[key] = value;
            }
        }
        this.saveConfig();
    }
    /** 重置配置文件，删除文件并恢复所有代码默认值 */
    reset() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                fs.unlinkSync(CONFIG_FILE);
            }
        }
        catch (error) {
            console.error('删除配置文件失败:', error);
        }
        this.config = buildDefaultConfig();
    }
    getAll() {
        return { ...this.config };
    }
    /** 返回用户可见的配置项（不含隐藏项） */
    getPublicConfig() {
        const { cookie, browserPort, headless, logEnabled, ...pub } = this.config;
        return pub;
    }
    static getConfigPath() {
        return CONFIG_FILE;
    }
}
exports.ConfigManager = ConfigManager;
exports.configManager = new ConfigManager();
//# sourceMappingURL=config.js.map