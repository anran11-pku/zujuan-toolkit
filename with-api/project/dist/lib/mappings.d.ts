import { Grade, Order } from '../types';
/** 题型码映射：仅 t1-t4 支持 URL 筛选（站点无 t5/t6 对应题型码，暂不支持）。 */
export declare const QUESTION_TYPE_CODES: Record<Grade, Partial<Record<string, string>>>;
/** 题型完整名称（用于结果元信息 meta.type） */
export declare const QUESTION_TYPE_NAMES: Record<string, string>;
/** 题型简称（用于 CLI 帮助文本） */
export declare const QUESTION_TYPE_SHORT_NAMES: Record<string, string>;
/** 难度名称 */
export declare const DIFFICULTY_NAMES: Record<string, string>;
/** 排序码 */
export declare const ORDER_CODES: Record<Order, string>;
/** 排序名称（用于结果元信息与日志） */
export declare const ORDER_NAMES: Record<Order, string>;
/** 生成 CLI 题型帮助文本：t1=单选 t2=多选 ... */
export declare function buildTypeHelp(): string;
/** 生成 CLI 难度帮助文本：d1=容易 d2=较易 ... */
export declare function buildDifficultyHelp(): string;
//# sourceMappingURL=mappings.d.ts.map