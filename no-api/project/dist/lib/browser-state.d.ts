import { BrowserState } from '../types';
export declare const STORAGE_STATE_FILE: string;
export declare const BROWSER_STATE_FILE: string;
export declare class BrowserStateManager {
    static save(state: BrowserState): void;
    static load(): BrowserState | null;
    /**
     * 保存启动前最小状态（PID + port，wsEndpoint 尚不可用）。
     * 在 Chrome 刚 spawn 后立即调用，确保 Ctrl+C 中断后状态文件已存在，
     * 下次 start 能感知到 Chrome 在运行。
     */
    static saveStartup(pid: number, port: number): void;
    static clear(): void;
    static isProcessRunning(pid: number): boolean;
    static isBrowserRunningOnPort(port: number): Promise<boolean>;
    static isBrowserRunning(): boolean;
    static killProcess(pid: number): boolean;
}
//# sourceMappingURL=browser-state.d.ts.map