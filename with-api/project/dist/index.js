#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const config_1 = require("./commands/config");
const start_1 = require("./commands/start");
const shutup_1 = require("./commands/shutup");
const scrape_1 = require("./commands/scrape");
const list_1 = require("./commands/list");
const export_1 = require("./commands/export");
const serve_1 = require("./commands/serve");
const program = new commander_1.Command();
program.name('zujuan').description('组卷网爬虫工具 - 从zujuan.xkw.com爬取数学题目').version('1.0.0');
// 注册子命令
program.addCommand((0, config_1.createConfigCommand)());
program.addCommand((0, start_1.createStartCommand)());
program.addCommand((0, shutup_1.createShutupCommand)());
program.addCommand((0, scrape_1.createScrapeCommand)());
program.addCommand((0, list_1.createListCommand)());
program.addCommand((0, export_1.createExportCommand)());
program.addCommand((0, serve_1.createServeCommand)());
program.parse(process.argv);
//# sourceMappingURL=index.js.map