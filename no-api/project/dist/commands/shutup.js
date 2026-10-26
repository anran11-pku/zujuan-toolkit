"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShutupCommand = createShutupCommand;
const commander_1 = require("commander");
const browser_1 = require("../lib/browser");
const browser_state_1 = require("../lib/browser-state");
function createShutupCommand() {
    const command = new commander_1.Command('shutup');
    command.description('关闭后台运行的浏览器实例').action(async () => {
        try {
            // 检查是否在运行
            if (!browser_1.browserManager.isRunning()) {
                const state = browser_state_1.BrowserStateManager.load();
                if (state) {
                    // 状态文件存在但进程不存在，清理残留
                    browser_state_1.BrowserStateManager.clear();
                    console.log('浏览器未在运行，已清理残留状态文件');
                }
                else {
                    console.log('浏览器未在运行');
                }
                return;
            }
            const state = browser_state_1.BrowserStateManager.load();
            console.log(`正在关闭浏览器 (PID: ${state?.pid})...`);
            // 关闭浏览器
            await browser_1.browserManager.shutdown();
            console.log('\n========================================');
            console.log('浏览器已关闭！');
            console.log('如需再次使用，请运行 start 命令');
            console.log('========================================');
        }
        catch (error) {
            console.error('关闭浏览器失败:', error);
            process.exit(1);
        }
    });
    return command;
}
//# sourceMappingURL=shutup.js.map