import { Config, ConfigOptions } from '../types';
/** 获取配置目录（用于其他模块共享路径） */
export declare function getConfigDir(): string;
export declare class ConfigManager {
    private config;
    constructor();
    private loadConfig;
    /** 静默保存（不打印错误，供 loadConfig 内部调用） */
    private saveConfigSilently;
    private saveConfig;
    get<K extends keyof Config>(key: K): Config[K];
    set(options: ConfigOptions): void;
    /** 重置配置文件，删除文件并恢复所有代码默认值 */
    reset(): void;
    getAll(): Config;
    /** 返回用户可见的配置项（不含隐藏项） */
    getPublicConfig(): Omit<Config, 'cookie' | 'browserPort' | 'headless' | 'logEnabled'>;
    static getConfigPath(): string;
}
export declare const configManager: ConfigManager;
//# sourceMappingURL=config.d.ts.map