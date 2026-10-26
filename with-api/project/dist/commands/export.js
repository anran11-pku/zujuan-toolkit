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
exports.createExportCommand = createExportCommand;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const commander_1 = require("commander");
const config_1 = require("../lib/config");
const html_exporter_1 = require("../lib/exporters/html-exporter");
const markdown_exporter_1 = require("../lib/exporters/markdown-exporter");
function resolveBatchDir(target) {
    const outputDir = path.resolve(config_1.configManager.get('outputDir'));
    if (target) {
        const abs = path.isAbsolute(target) ? target : path.resolve(target);
        if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
            if (fs.existsSync(path.join(abs, 'results.json')))
                return abs;
        }
        const candidate = path.join(outputDir, target);
        if (fs.existsSync(candidate))
            return candidate;
        return null;
    }
    if (!fs.existsSync(outputDir))
        return null;
    const entries = fs
        .readdirSync(outputDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => ({ name: e.name, mtime: fs.statSync(path.join(outputDir, e.name)).mtimeMs }))
        .filter((e) => !isNaN(parseInt(e.name)))
        .sort((a, b) => b.mtime - a.mtime);
    if (entries.length === 0)
        return null;
    return path.join(outputDir, entries[0].name);
}
function loadOutput(batchDir) {
    const jsonPath = path.join(batchDir, 'results.json');
    if (!fs.existsSync(jsonPath))
        return null;
    try {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }
    catch {
        return null;
    }
}
function createExportCommand() {
    const command = new commander_1.Command('export');
    command
        .description('将抓取结果导出为 HTML 或 Markdown 文档')
        .argument('[timestamp]', '抓取结果目录（timestamp），省略时自动查找最新的目录')
        .option('--format <formats>', '导出格式: html / markdown / both（逗号分隔，默认使用配置或 headless 推导）')
        .option('--theme <theme>', '导出主题: light(白底) / dark(深色) / sepia(米黄)，默认使用配置或 light')
        .action(async (timestamp, options) => {
        const batchDir = resolveBatchDir(timestamp);
        if (!batchDir) {
            console.error('未找到抓取结果目录，请先运行 scrape 命令');
            process.exit(1);
        }
        const output = loadOutput(batchDir);
        if (!output) {
            console.error(`目录 ${batchDir} 中没有找到 results.json`);
            process.exit(1);
        }
        // 解析 format：命令行 > config > 默认 both
        let fmt = 'both';
        if (options.format) {
            const parts = options.format.split(',').map((s) => s.trim());
            if (parts.includes('html') && parts.includes('markdown')) {
                fmt = 'both';
            }
            else if (parts.includes('markdown')) {
                fmt = 'markdown';
            }
            else if (parts.includes('both')) {
                fmt = 'both';
            }
            else if (parts.includes('html')) {
                fmt = 'html';
            }
        }
        else {
            const cfgFmt = config_1.configManager.get('exportFormat');
            if (cfgFmt) {
                fmt = cfgFmt;
            }
        }
        // 解析 theme：命令行 > 默认 light
        const theme = (['dark', 'sepia'].includes(options.theme) ? options.theme : 'light');
        console.log(`输出目录: ${batchDir}`);
        console.log(`导出格式: ${fmt}`);
        console.log(`导出主题: ${theme}`);
        console.log(`题目数量: ${output.results.length}`);
        const { options: meta, results } = output;
        let htmlCount = 0, mdCount = 0, zipCount = 0;
        // 导出时建立索引映射，便于确定上下题
        const indexMap = results.map((r) => r.index);
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const prevIndex = i > 0 ? indexMap[i - 1] : undefined;
            const nextIndex = i < results.length - 1 ? indexMap[i + 1] : undefined;
            if (fmt === 'html' || fmt === 'both') {
                html_exporter_1.htmlExporter.export(batchDir, result, theme, prevIndex, nextIndex);
                console.log(`  ✓ ${result.index}/index.html`);
                htmlCount++;
            }
            if (fmt === 'markdown' || fmt === 'both') {
                markdown_exporter_1.markdownExporter.export(batchDir, result, meta);
                console.log(`  ✓ ${result.index}/index.md`);
                try {
                    await markdown_exporter_1.markdownExporter.packZip(batchDir, result);
                    console.log(`  ✓ ${result.index}.zip`);
                    zipCount++;
                }
                catch (err) {
                    console.error(`  ✗ ${result.index}.zip 打包失败: ${err}`);
                }
                mdCount++;
            }
        }
        // 生成总览页
        if (fmt === 'html' || fmt === 'both') {
            html_exporter_1.htmlExporter.exportOverview(batchDir, results, meta, theme);
            console.log(`  ✓ index.html (总览)`);
        }
        console.log(`\n完成: 生成 ${htmlCount} 个 HTML，${mdCount} 个 Markdown，${zipCount} 个 ZIP`);
    });
    return command;
}
//# sourceMappingURL=export.js.map