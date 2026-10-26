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
exports.createScrapeCommand = createScrapeCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const scraper_1 = require("../lib/scraper");
const config_1 = require("../lib/config");
const logger_1 = require("../lib/logger");
const errors_1 = require("../lib/errors");
const mappings_1 = require("../lib/mappings");
const html_exporter_1 = require("../lib/exporters/html-exporter");
const markdown_exporter_1 = require("../lib/exporters/markdown-exporter");
function createScrapeCommand() {
    const command = new commander_1.Command('scrape');
    command
        .description('抓取题目')
        .requiredOption('-k, --knowledge <id>', '知识点节点ID（必填）')
        .option('-t, --type <type>', `题型: ${(0, mappings_1.buildTypeHelp)()}`)
        .option('-d, --difficulty <level>', `难度: ${(0, mappings_1.buildDifficultyHelp)()}`)
        .option('-y, --year <year>', '年份: 2026/2025/2024/2023/-1（-1表示更早）')
        .option('-g, --grade <grade>', '年级: high=高中 middle=初中（默认: 配置中的 grade）')
        .option('-r, --order <order>', '排序: latest=最新 hot=最热 comprehensive=综合（默认: 配置中的 order）')
        .option('-l, --limit <number>', '最大抓取截图数量（1-10，默认10）', '10')
        .option('-mc, --multi-count <number>', '多选题答案数量: 2, 3, 4及以上')
        .option('-fc, --fill-count <number>', '填空题空数: 1, 2, 3及以上')
        .option('-p, --page <number>', '分页页码（默认1，第二页起为o2p2格式）')
        .option('-ll, --log-level <level>', '日志级别: quiet=纯净 normal=普通 verbose=详细（默认: quiet）')
        .option('-e, --export', '抓取完成后导出为 HTML 或 Markdown 文档')
        .option('--format <formats>', '导出格式: html / markdown / both（逗号分隔，默认使用配置或 headless 推导）')
        .option('--theme <theme>', '导出主题: light(白底) / dark(深色) / sepia(米黄)，默认使用配置或 light')
        .action(async (options) => {
        const limit = Math.min(10, Math.max(1, parseInt(options.limit) || 10));
        // 年级：命令行指定优先，否则使用配置默认值
        const grade = options.grade || config_1.configManager.get('grade');
        // 排序：命令行指定优先，否则使用配置默认值
        const order = options.order || config_1.configManager.get('order');
        const scrapeOptions = {
            knowledge: options.knowledge,
            type: options.type,
            difficulty: options.difficulty,
            year: options.year ? parseInt(options.year) : undefined,
            grade,
            order,
            limit,
            multiCount: options.multiCount ? parseInt(options.multiCount) : undefined,
            fillCount: options.fillCount ? parseInt(options.fillCount) : undefined,
            page: options.page ? parseInt(options.page) : undefined,
            logLevel: (options.logLevel || config_1.configManager.get('logLevel')),
        };
        const gradeName = grade === 'high' ? '高中' : '初中';
        const orderName = mappings_1.ORDER_NAMES[order];
        const logLevel = scrapeOptions.logLevel || 'quiet';
        logger_1.logger.setLevel(logLevel);
        if (scrapeOptions.type === 't5' || scrapeOptions.type === 't6') {
            logger_1.logger.log('normal', `注意：${scrapeOptions.type} 题型暂不支持 URL 筛选（站点无对应题型码），将抓取该知识点全部题型`);
        }
        logger_1.logger.log('normal', '开始抓取题目...');
        logger_1.logger.log('normal', `知识点: ${scrapeOptions.knowledge}`);
        logger_1.logger.log('normal', `年级: ${gradeName}`);
        logger_1.logger.log('normal', `排序: ${orderName}`);
        if (scrapeOptions.type)
            logger_1.logger.log('normal', `题型: ${scrapeOptions.type}`);
        if (scrapeOptions.difficulty)
            logger_1.logger.log('normal', `难度: ${scrapeOptions.difficulty}`);
        if (scrapeOptions.year)
            logger_1.logger.log('normal', `年份: ${scrapeOptions.year}`);
        if (scrapeOptions.page)
            logger_1.logger.log('normal', `分页: ${scrapeOptions.page}`);
        logger_1.logger.log('normal', `限制数量: ${scrapeOptions.limit}`);
        try {
            const output = await scraper_1.scraperEngine.scrape(scrapeOptions);
            logger_1.logger.log('normal', `抓取完成，共 ${output.results.length} 道题目`);
            if (options.export && output.results.length > 0) {
                await runExport(output, options);
            }
            process.exit(0);
        }
        catch (error) {
            if (error instanceof errors_1.LoginExpiredError) {
                // 登录失效：只打印友好提示，不输出堆栈
                console.error(error.message);
            }
            else {
                logger_1.logger.error('抓取失败:', error);
            }
            process.exit(1);
        }
    });
    return command;
    /** 根据参数/配置决定导出格式和主题，并执行 */
    async function runExport(output, opts) {
        // format：命令行 > config > 默认 both
        let fmt = 'both';
        if (opts.format) {
            const parts = opts.format.split(',').map((s) => s.trim());
            if (parts.includes('html') && parts.includes('markdown')) {
                fmt = 'both';
            }
            else if (parts.includes('markdown')) {
                fmt = 'markdown';
            }
            else if (parts.includes('both')) {
                fmt = 'both';
            }
        }
        else {
            const cfgFmt = config_1.configManager.get('exportFormat');
            if (cfgFmt) {
                fmt = cfgFmt;
            }
        }
        // theme：命令行 > 默认 light
        const theme = (['dark', 'sepia'].includes(opts.theme) ? opts.theme : 'light');
        const batchDir = path.resolve(config_1.configManager.get('outputDir'), output.options.timestamp);
        const { options: meta, results } = output;
        let htmlCount = 0, mdCount = 0, zipCount = 0;
        // 建立索引映射，便于确定上下题
        const indexMap = results.map((r) => r.index);
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const prevIndex = i > 0 ? indexMap[i - 1] : undefined;
            const nextIndex = i < results.length - 1 ? indexMap[i + 1] : undefined;
            if (fmt === 'html' || fmt === 'both') {
                html_exporter_1.htmlExporter.export(batchDir, result, theme, prevIndex, nextIndex);
                logger_1.logger.log('normal', `  ✓ ${result.index}/index.html`);
                htmlCount++;
            }
            if (fmt === 'markdown' || fmt === 'both') {
                markdown_exporter_1.markdownExporter.export(batchDir, result, meta);
                logger_1.logger.log('normal', `  ✓ ${result.index}/index.md`);
                mdCount++;
                try {
                    await markdown_exporter_1.markdownExporter.packZip(batchDir, result);
                    logger_1.logger.log('normal', `  ✓ ${result.index}.zip`);
                    zipCount++;
                }
                catch (err) {
                    logger_1.logger.error(`  ✗ ${result.index}.zip 打包失败:`, err);
                }
            }
        }
        // 生成总览页
        if (fmt === 'html' || fmt === 'both') {
            html_exporter_1.htmlExporter.exportOverview(batchDir, results, meta, theme);
            logger_1.logger.log('normal', `  ✓ index.html (总览)`);
        }
        logger_1.logger.log('normal', `导出完成: ${htmlCount} HTML, ${mdCount} Markdown, ${zipCount} ZIP`);
    }
}
//# sourceMappingURL=scrape.js.map