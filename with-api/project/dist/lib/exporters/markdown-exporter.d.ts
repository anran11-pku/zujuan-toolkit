import { ScrapeResult, ScrapeMeta } from '../../types';
export declare class MarkdownExporter {
    /**
     * 生成单题 Markdown 文件，保存到同目录。
     * @param batchDir timestamp 目录（绝对路径）
     * @param result   单题结果
     * @param meta     抓取元信息
     */
    export(batchDir: string, result: ScrapeResult, meta: ScrapeMeta): string;
    /**
     * 为单题打包 zip，保存到 batchDir。
     * @returns zip 文件绝对路径
     */
    packZip(batchDir: string, result: ScrapeResult): Promise<string>;
    private buildMarkdown;
    private escMd;
}
export declare const markdownExporter: MarkdownExporter;
//# sourceMappingURL=markdown-exporter.d.ts.map