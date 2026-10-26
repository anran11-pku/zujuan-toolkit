import { LogLevel } from '../types';
export type FileLogLevel = 'INFO' | 'WARN' | 'ERROR';
declare class Logger {
    private level;
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
    private shouldLog;
    log(level: LogLevel, ...args: unknown[]): void;
    error(...args: unknown[]): void;
    /**
     * 追加写入 zujuan.log 文件（与 console 输出分离，避免刷屏）。
     * 受 logEnabled / logDir 配置控制；写入失败静默忽略，不影响主流程。
     * 签名与原 browser.ts 的 writeLog(message, level) 保持一致，便于逐处替换。
     */
    fileLog(message: string, level?: FileLogLevel): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map