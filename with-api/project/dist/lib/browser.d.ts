import { Page } from 'playwright';
export declare class BrowserManager {
    private static instance;
    private browser;
    private context;
    private page;
    private chromeProcess;
    private wsEndpoint;
    private pid;
    private constructor();
    static getInstance(): BrowserManager;
    launch(): Promise<void>;
    connect(): Promise<void>;
    private applyStorageStateCookies;
    private applyConfigCookies;
    private removeOverlay;
    private checkLoginStatus;
    private doQRCodeLogin;
    private saveLoginState;
    getPage(): Promise<Page>;
    close(): Promise<void>;
    shutdown(): Promise<void>;
    isConnected(): boolean;
    isLoggedIn(): Promise<boolean>;
    isRunning(): boolean;
}
export declare const browserManager: BrowserManager;
//# sourceMappingURL=browser.d.ts.map