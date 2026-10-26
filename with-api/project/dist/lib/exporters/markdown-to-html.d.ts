/**
 * Markdown → HTML 片段转换（纯函数，无副作用）。
 * 从 html-exporter.ts 抽出：供 HTML 导出复用与单元测试直接调用。
 */
export declare function escHtml(str: string): string;
export declare function markdownToHtml(md: string): string;
export declare function convertPipeTables(md: string): string;
export declare function buildTableHtml(rows: string[]): string;
//# sourceMappingURL=markdown-to-html.d.ts.map