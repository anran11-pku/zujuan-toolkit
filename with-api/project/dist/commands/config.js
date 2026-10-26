"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfigCommand = createConfigCommand;
const commander_1 = require("commander");
const config_1 = require("../lib/config");
function createConfigCommand() {
    const command = new commander_1.Command('config');
    command
        .description('查看或更新配置')
        .option('--reset', '删除配置文件，恢复所有代码默认值')
        .option('--browser-dir <path>', '设置浏览器安装目录')
        .option('--login-qr-dir <path>', '设置登录二维码保存目录（默认: ~/.zujuan-scraper/）')
        .option('--log-dir <path>', '设置日志文件目录（默认: ~/.zujuan-scraper/）')
        .option('--tree-db <path>', '设置知识树数据库文件路径')
        .option('-g, --grade <grade>', '设置默认年级: high=高中 middle=初中')
        .option('-r, --order <order>', '设置默认排序: latest=最新 hot=最热 comprehensive=综合')
        .option('-d, --depth <n>', '设置 list 命令默认最大查询深度')
        .option('-ll, --log-level <level>', '设置日志级别: quiet=纯净 normal=普通 verbose=详细')
        .option('--vision-api-url <url>', '设置视觉模型 API 地址（如 https://api.deepseek.com/v1）')
        .option('--vision-api-key <key>', '设置视觉模型 API Key')
        .option('--vision-model <model>', '设置视觉模型名称/ID（如 deepseek-chat）')
        .option('--vision-enabled', '启用视觉 OCR')
        .option('--export-format <format>', '设置导出格式: html / markdown / both')
        .option('--output-dir <path>', '设置抓取结果输出目录（默认: ~/.zujuan-output/）')
        .option('--qr-notify-discord <webhookUrl>', '设置 Discord Webhook URL，扫码登录时自动发送二维码通知')
        .action((options) => {
        // --reset：删除配置，恢复默认值
        if (options.reset) {
            config_1.configManager.reset();
            console.log('配置已重置为默认值');
            console.log(JSON.stringify(config_1.configManager.getPublicConfig(), null, 2));
            return;
        }
        // 收集所有传入的选项
        const anyOptionProvided = options.browserDir ||
            options.loginQrDir ||
            options.logDir ||
            options.treeDb ||
            options.grade ||
            options.order ||
            options.depth !== undefined ||
            options.logLevel ||
            options.visionApiUrl ||
            options.visionApiKey ||
            options.visionModel ||
            options.visionEnabled ||
            options.exportFormat ||
            options.outputDir ||
            options.qrNotifyDiscord !== undefined;
        if (!anyOptionProvided) {
            // 无参数：显示当前配置
            const cfg = config_1.configManager.getPublicConfig();
            console.log('当前配置:');
            console.log(JSON.stringify(cfg, null, 2));
            return;
        }
        // 有参数：逐项更新
        config_1.configManager.set({
            browserDir: options.browserDir,
            loginQrDir: options.loginQrDir,
            logDir: options.logDir,
            treeDb: options.treeDb,
            grade: options.grade,
            order: options.order,
            treeDepth: options.depth !== undefined ? parseInt(options.depth) : undefined,
            logLevel: options.logLevel,
            visionApiUrl: options.visionApiUrl,
            visionApiKey: options.visionApiKey,
            visionModel: options.visionModel,
            visionEnabled: options.visionEnabled,
            exportFormat: options.exportFormat,
            outputDir: options.outputDir,
            qrNotifyDiscord: options.qrNotifyDiscord,
        });
        console.log('配置已更新');
    });
    return command;
}
//# sourceMappingURL=config.js.map