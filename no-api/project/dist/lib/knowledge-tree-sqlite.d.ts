import Database from 'better-sqlite3';
export interface KnowledgeNodeRow {
    id: string;
    name: string;
    parent_id: string | null;
    grade: 'high' | 'middle';
    level: number;
    /** 在原文件中的行号位置，用于同层节点排序 */
    pos: number;
}
export interface NodeWithLevel {
    node: KnowledgeNodeRow;
    level: number;
}
/** 导出的 getDb，内部用 _getDb 实现 */
export declare function getDb(): Database.Database;
/** 从文本文件导入知识点到数据库（幂等：先删除同名表数据再插入） */
export declare function importTreeFromFile(grade: 'high' | 'middle'): number;
/** 初始化数据库：文件不存在则自动创建，已存在则检查目录是否变更或数据是否为空 */
export declare function ensureDatabase(): void;
/** 查询单个节点 */
export declare function getNodeById(id: string, grade: 'high' | 'middle'): KnowledgeNodeRow | null;
/** 查询节点的子孙节点（带层级信息） */
export declare function getDescendants(nodeId: string, maxDepth: number, searchTerm?: string, grade?: 'high' | 'middle'): NodeWithLevel[];
/**
 * 虚拟根查询：收集所有匹配 searchTerm 的节点及其祖先路径，
 * 只保留从根到该节点的深度 ≤ maxDepth 的节点。
 * 祖先节点（如根节点不匹配搜索词但其子孙匹配）也会被加入以显示路径。
 */
export declare function getDescendantsFromRoots(maxDepth: number, searchTerm?: string, grade?: 'high' | 'middle'): NodeWithLevel[];
/** 获取节点的父节点链（用于显示路径） */
export declare function getNodePath(nodeId: string, grade?: 'high' | 'middle'): KnowledgeNodeRow[];
/** 全局搜索：模糊匹配名称 */
export declare function searchNodes(searchTerm: string, grade?: 'high' | 'middle'): KnowledgeNodeRow[];
/** 打印带层级的节点列表（平铺，按层级分组） */
export declare function printNodesWithLevels(nodesWithLevels: NodeWithLevel[]): void;
/**
 * 按树结构递归打印（仅限无搜索词场景）。
 * 将平铺的 BFS 结果重建为树，保持父→子→孙 的层级缩进和原始同层顺序。
 * @param nodesWithLevels 由 getDescendantsFromRoots / getDescendants 返回的扁平结果
 * @param maxDisplayLevel 最大打印深度（-1=不限）
 * @param rootId 可选：从指定节点开始打印（用于 --id 场景，忽略其他根节点）
 */
export declare function printTree(nodesWithLevels: NodeWithLevel[], maxDisplayLevel?: number, rootId?: string): void;
//# sourceMappingURL=knowledge-tree-sqlite.d.ts.map