"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDER_NAMES = exports.ORDER_CODES = exports.DIFFICULTY_NAMES = exports.QUESTION_TYPE_SHORT_NAMES = exports.QUESTION_TYPE_NAMES = exports.QUESTION_TYPE_CODES = void 0;
exports.buildTypeHelp = buildTypeHelp;
exports.buildDifficultyHelp = buildDifficultyHelp;
/** 题型码映射：仅 t1-t4 支持 URL 筛选（站点无 t5/t6 对应题型码，暂不支持）。 */
exports.QUESTION_TYPE_CODES = {
    high: { t1: '2701', t2: '2704', t3: '2702', t4: '2703' },
    middle: { t1: '1101', t2: '1104', t3: '1102', t4: '1103' },
};
/** 题型完整名称（用于结果元信息 meta.type） */
exports.QUESTION_TYPE_NAMES = {
    t1: '单选题',
    t2: '多选题',
    t3: '填空题',
    t4: '解答题',
    t5: '判断题',
    t6: '概念填空',
};
/** 题型简称（用于 CLI 帮助文本） */
exports.QUESTION_TYPE_SHORT_NAMES = {
    t1: '单选',
    t2: '多选',
    t3: '填空',
    t4: '解答',
    t5: '判断',
    t6: '概念填空',
};
/** 难度名称 */
exports.DIFFICULTY_NAMES = {
    d1: '容易',
    d2: '较易',
    d3: '适中',
    d4: '较难',
    d5: '困难',
};
/** 排序码 */
exports.ORDER_CODES = {
    latest: 'o2',
    hot: 'o1',
    comprehensive: 'o0',
};
/** 排序名称（用于结果元信息与日志） */
exports.ORDER_NAMES = {
    latest: '最新',
    hot: '最热',
    comprehensive: '综合',
};
/** 生成 CLI 题型帮助文本：t1=单选 t2=多选 ... */
function buildTypeHelp() {
    return Object.entries(exports.QUESTION_TYPE_SHORT_NAMES)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
}
/** 生成 CLI 难度帮助文本：d1=容易 d2=较易 ... */
function buildDifficultyHelp() {
    return Object.entries(exports.DIFFICULTY_NAMES)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
}
//# sourceMappingURL=mappings.js.map