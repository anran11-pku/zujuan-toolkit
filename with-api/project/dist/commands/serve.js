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
exports.createServeCommand = createServeCommand;
const commander_1 = require("commander");
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("../lib/config");
const html_exporter_1 = require("../lib/exporters/html-exporter");
const knowledge_tree_sqlite_1 = require("../lib/knowledge-tree-sqlite");
const PAGE_SIZE = 20;
/** 列表扫描缓存：避免每次请求全量 readdir + JSON.parse + 查库 */
const SCAN_CACHE_TTL_MS = 5000;
let scanCache = null;
function scanOutputDir(outputDir) {
    const now = Date.now();
    if (scanCache && scanCache.outputDir === outputDir && now - scanCache.ts < SCAN_CACHE_TTL_MS) {
        return scanCache.entries;
    }
    const results = [];
    if (!fs.existsSync(outputDir))
        return results;
    (0, knowledge_tree_sqlite_1.ensureDatabase)();
    const entries = fs.readdirSync(outputDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const ts = entry.name;
        if (isNaN(parseInt(ts)))
            continue;
        // 跳过没有总览页的目录
        const overviewPath = path.join(outputDir, ts, 'index.html');
        if (!fs.existsSync(overviewPath))
            continue;
        const jsonPath = path.join(outputDir, ts, 'results.json');
        if (!fs.existsSync(jsonPath))
            continue;
        try {
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            // 用 SQLite 翻译知识点 ID → 名称
            const grade = data.options.grade;
            const node = (0, knowledge_tree_sqlite_1.getNodeById)(data.options.knowledgeId, grade);
            if (node) {
                data.options.knowledgePoint = node.name;
            }
            results.push(data.options);
        }
        catch {
            // 损坏的结果文件跳过
        }
    }
    // 按时间戳倒序（最新在前）
    results.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
    scanCache = { outputDir, ts: now, entries: results };
    return results;
}
function startServer(port, outputDir) {
    const server = http.createServer((req, res) => {
        const url = req.url || '/';
        // 根路径 → 列表页（支持 ?page=N 分页）
        if (url === '/' || url.startsWith('/?')) {
            const allEntries = scanOutputDir(outputDir);
            const totalEntries = allEntries.length;
            const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
            // 解析页码
            let page = 1;
            const match = url.match(/[?&]page=(\d+)/);
            if (match) {
                page = parseInt(match[1]);
                if (isNaN(page) || page < 1)
                    page = 1;
                if (page > totalPages)
                    page = totalPages;
            }
            const start = (page - 1) * PAGE_SIZE;
            const entries = allEntries.slice(start, start + PAGE_SIZE);
            const html = html_exporter_1.htmlExporter.buildServeListHtml(entries, page, totalPages, totalEntries);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }
        // 静态文件：/timestamp/... → outputDir/timestamp/...
        const parts = url.split('/').filter(Boolean);
        if (parts.length >= 1) {
            const timestamp = parts[0];
            const relativePath = parts.slice(1).join('/');
            const filePath = path.join(outputDir, timestamp, relativePath);
            // 安全检查：确保路径在 outputDir 下
            const resolved = path.resolve(filePath);
            if (!resolved.startsWith(path.resolve(outputDir))) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
                const ext = path.extname(resolved).toLowerCase();
                const mimeTypes = {
                    '.html': 'text/html; charset=utf-8',
                    '.css': 'text/css',
                    '.js': 'application/javascript',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                    '.zip': 'application/zip',
                };
                const contentType = mimeTypes[ext] || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': contentType });
                fs.createReadStream(resolved).pipe(res);
                return;
            }
        }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
    });
    return server;
}
function createServeCommand() {
    const command = new commander_1.Command('serve');
    command
        .description('启动静态服务器，展示历史抓取结果（按 Ctrl+C 关闭）')
        .option('-p, --port <port>', '监听端口', '30888')
        .action(async (options) => {
        const port = parseInt(options.port || '30888');
        if (isNaN(port) || port < 1 || port > 65535) {
            console.error('端口无效，请指定 1-65535 之间的数字');
            process.exit(1);
        }
        const outputDir = config_1.configManager.get('outputDir');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        // 阻塞模式
        const server = startServer(port, outputDir);
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`端口 ${port} 已被占用`);
                process.exit(1);
            }
            console.error('服务器错误:', err);
            process.exit(1);
        });
        server.listen(port, () => {
            console.log(`组卷网题目总览服务已启动`);
            console.log(`访问地址: http://localhost:${port}`);
            console.log(`按 Ctrl+C 关闭服务`);
        });
        const cleanup = () => {
            console.log('\n正在关闭服务...');
            server.close(() => process.exit(0));
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    });
    return command;
}
//# sourceMappingURL=serve.js.map