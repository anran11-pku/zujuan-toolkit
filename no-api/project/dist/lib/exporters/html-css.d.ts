/**
 * HTML 导出器的 CSS 模板与静态资源（从 html-exporter.ts 抽出，集中管理）。
 * 题目页/总览页主题通过 [data-theme] 的 CSS 变量切换，新增主题只需加一组变量。
 */
export declare const MATHJAX_CDN = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
/** 题目页 / 总览页 CSS（三主题由 CSS 变量切换） */
export declare function buildQuestionCss(): string;
/** serve 列表页 CSS（固定浅色主题） */
export declare function buildServeListCss(): string;
//# sourceMappingURL=html-css.d.ts.map