import { BrowserManager } from './browser';
import { ScrapeOptions, ScrapeOutput } from '../types';
import { ConfigManager } from './config';
import { VisionOCRProcessor } from './vision-ocr';
/** 可注入依赖（便于测试替身；生产环境用文件底部的单例组合） */
export interface ScraperDeps {
    browser: Pick<BrowserManager, 'connect' | 'getPage' | 'isLoggedIn' | 'shutdown' | 'close'>;
    config: ConfigManager;
    visionOcr: VisionOCRProcessor;
}
export declare class ScraperEngine {
    private page;
    private readonly browser;
    private readonly config;
    private readonly visionOcr;
    constructor(deps: ScraperDeps);
    initialize(): Promise<void>;
    scrape(options: ScrapeOptions): Promise<ScrapeOutput>;
    /** 滚动触发懒加载：直到页面高度不再变化（或达上限 10 轮）才停止 */
    private scrollToLoadQuestions;
    private downloadImage;
    /** 分批限流下载：每批 DOWNLOAD_CONCURRENCY 个并发，返回失败数量 */
    private downloadBatch;
    /**
     * 注意：答案图片 URL 本身已在查询参数中携带认证信息
     * （enVqdWFu=base64... 包含 userId 和 user_token），
     * 因此不需要额外传 cookies。传 cookies 反而可能因
     * 某些 cookie 含非 ASCII 字符导致 ERR_INVALID_CHAR 错误。
     */
    private _downloadSingle;
}
/** 生产环境组合：模块级单例（测试可自行 new ScraperEngine 注入替身） */
export declare const scraperEngine: ScraperEngine;
//# sourceMappingURL=scraper.d.ts.map