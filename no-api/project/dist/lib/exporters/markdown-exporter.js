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
exports.markdownExporter = exports.MarkdownExporter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const archiver = require('archiver');
class MarkdownExporter {
    /**
     * 生成单题 Markdown 文件，保存到同目录。
     * @param batchDir timestamp 目录（绝对路径）
     * @param result   单题结果
     * @param meta     抓取元信息
     */
    export(batchDir, result, meta) {
        const dir = path.join(batchDir, result.index);
        const mdPath = path.join(dir, 'index.md');
        const md = this.buildMarkdown(result, meta);
        fs.writeFileSync(mdPath, md, 'utf-8');
        return mdPath;
    }
    /**
     * 为单题打包 zip，保存到 batchDir。
     * @returns zip 文件绝对路径
     */
    async packZip(batchDir, result) {
        const dir = path.join(batchDir, result.index);
        const zipPath = path.join(batchDir, `${result.index}.zip`);
        const output = fs.createWriteStream(zipPath);
        return new Promise((resolve, reject) => {
            const archive = archiver('zip', { zlib: { level: 9 } });
            output.on('close', () => resolve(zipPath));
            archive.on('error', reject);
            archive.pipe(output);
            // 打包 index.md 和同目录下所有图片
            const mdPath = path.join(dir, 'index.md');
            if (fs.existsSync(mdPath)) {
                archive.file(mdPath, { name: `${result.index}/index.md` });
            }
            for (const img of result.images) {
                const imgAbs = path.join(dir, path.basename(img));
                if (fs.existsSync(imgAbs)) {
                    archive.file(imgAbs, { name: `${result.index}/${path.basename(img)}` });
                }
            }
            if (result.questionPath) {
                const qAbs = path.join(dir, path.basename(result.questionPath));
                if (fs.existsSync(qAbs)) {
                    archive.file(qAbs, { name: `${result.index}/${path.basename(result.questionPath)}` });
                }
            }
            if (result.answerPath) {
                const aAbs = path.join(dir, path.basename(result.answerPath));
                if (fs.existsSync(aAbs)) {
                    archive.file(aAbs, { name: `${result.index}/${path.basename(result.answerPath)}` });
                }
            }
            archive.finalize();
        });
    }
    buildMarkdown(r, meta) {
        const frontmatter = [
            '---',
            `title: "第 ${r.index} 题"`,
            `knowledge: "${meta.knowledgePoint}"`,
            `grade: "${meta.grade}"`,
            r.source ? `source: "${this.escMd(r.source)}"` : null,
            r.questionType ? `type: "${this.escMd(r.questionType)}"` : null,
            r.difficulty ? `difficulty: "${this.escMd(r.difficulty)}"` : null,
            r.scoreRate !== undefined ? `scoreRate: ${r.scoreRate}` : null,
            `tags:`,
            ...r.knowledgeKeywords.map((kw) => `  - "${this.escMd(kw)}"`),
            '---',
        ]
            .filter(Boolean)
            .join('\n');
        const qText = r.questionText || '';
        const metaLines = [];
        if (r.questionType)
            metaLines.push(`- **题型:** ${r.questionType}`);
        if (r.difficulty)
            metaLines.push(`- **难度:** ${r.difficulty}`);
        if (r.scoreRate !== undefined)
            metaLines.push(`- **得分率:** ${r.scoreRate.toFixed(2)}`);
        const aText = r.answerText || '';
        const imgLines = r.images.length > 0
            ? r.images.map((img, i) => `![示例图${i + 1}](${path.basename(img)})`).join('\n')
            : '';
        return `${frontmatter}

## 题目

${r.source ? `> 来源：${r.source}` : ''}

${qText || '_（无题目文字，请查看下方截图）_'}

${imgLines}

${metaLines.length > 0 ? metaLines.join('\n') + '\n' : ''}
${r.knowledgeKeywords.length > 0 ? `**知识点:** ${r.knowledgeKeywords.join('、')}\n` : ''}
## 答案解析

${aText || '_（无答案解析）_'}

## 截图参考

题目截图：

${r.questionPath ? `![题目截图](${path.basename(r.questionPath)})` : '_（无题目截图）_'}

答案截图：

${r.answerPath ? `![答案截图](${path.basename(r.answerPath)})` : '_（无答案截图）_'}
`;
    }
    escMd(str) {
        return str.replace(/"/g, '\\"');
    }
}
exports.MarkdownExporter = MarkdownExporter;
exports.markdownExporter = new MarkdownExporter();
//# sourceMappingURL=markdown-exporter.js.map