"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStartCommand = createStartCommand;
const commander_1 = require("commander");
const browser_1 = require("../lib/browser");
const browser_state_1 = require("../lib/browser-state");
function createStartCommand() {
    const command = new commander_1.Command('start');
    command
        .description('启动浏览器并登录（阻塞模式，等待登录完成后退出，浏览器在后台运行）')
        .option('-g, --grade <grade>', '年级: 高中 或 初中', '高中')
        .action(async (options) => {
        const grade = options.grade;
        console.log(`正在启动浏览器（${grade}数学）...`);
        console.log('提示：首次使用需要扫码登录，登录成功后浏览器将在后台运行');
        // Ctrl+C / SIGTERM 中断处理：安全关闭已启动的浏览器
        let interrupted = false;
        const cleanup = () => {
            if (interrupted)
                return;
            interrupted = true;
            process.removeAllListeners('SIGINT');
            process.removeAllListeners('SIGTERM');
            if (browser_1.browserManager.isConnected()) {
                browser_1.browserManager
                    .shutdown()
                    .then(() => {
                    console.log('\n已清理浏览器进程');
                    process.exit(130);
                })
                    .catch(() => process.exit(1));
            }
            else {
                process.exit(130);
            }
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        try {
            // 检查是否已在运行
            if (browser_1.browserManager.isRunning()) {
                const state = browser_state_1.BrowserStateManager.load();
                console.log(`\n浏览器已在后台运行 (PID: ${state?.pid})`);
                console.log('可以直接使用 scrape 命令抓取题目');
                return;
            }
            // 启动浏览器（阻塞模式，等待登录完成）
            await browser_1.browserManager.launch();
            await browser_1.browserManager.close();
            // 启动成功，移除中断处理（不再需要）
            process.removeAllListeners('SIGINT');
            process.removeAllListeners('SIGTERM');
            console.log('\n========================================');
            console.log('浏览器已在后台运行！');
            console.log('可以使用以下命令：');
            console.log('  scrape - 抓取题目');
            console.log('  shutup  - 关闭浏览器');
            console.log('========================================');
            process.exit(0);
        }
        catch (error) {
            console.error('\n启动浏览器失败:', error);
            process.exit(1);
        }
    });
    return command;
}
//# sourceMappingURL=start.js.map