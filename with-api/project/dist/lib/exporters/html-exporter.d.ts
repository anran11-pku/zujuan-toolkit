import { ScrapeResult, ScrapeMeta, ExportTheme } from '../../types';
export declare class HtmlExporter {
    /** 生成单题 HTML 文件，保存到同目录。 */
    export(batchDir: string, result: ScrapeResult, defaultTheme?: ExportTheme, prevIndex?: string, nextIndex?: string): string;
    /** 生成总览导航页 index.html */
    exportOverview(batchDir: string, results: ScrapeResult[], meta: ScrapeMeta, defaultTheme?: ExportTheme): string;
    /**
     * 生成服务列表页 HTML 字符串（不分页的内存渲染版，供 serve 命令调用）。
     * @param entries 经过分页筛选的条目
     * @param page 当前页码
     * @param totalPages 总页数
     * @param totalEntries 总条目数
     */
    buildServeListHtml(entries: ScrapeMeta[], page: number, totalPages: number, totalEntries: number): string;
    private formatTimestamp;
    private buildPagination;
    private buildOverviewHtml;
    private buildHtml;
    private buildCss;
    private buildScreenshotsHtml;
    private markdownToHtml;
    /** 将 Markdown pipe table（管道表格）转换为 HTML <table> */
    private _convertPipeTables;
    /** 将 pipe table 行数组转为 <table> HTML */
    private _buildTableHtml;
    private escHtml;
}
export declare const htmlExporter: HtmlExporter;
//# sourceMappingURL=html-exporter.d.ts.map