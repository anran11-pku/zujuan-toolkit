"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlBuilder = void 0;
const mappings_1 = require("./mappings");
const BASE_URL = 'https://zujuan.xkw.com';
class UrlBuilder {
    constructor(knowledgeId, grade = 'high') {
        this.typePart = '';
        this.difficultyPart = '';
        this.yearPart = '';
        this.gradePart = '';
        this.orderPart = 'o2';
        this.pageNum = 0;
        this.knowledgeId = knowledgeId;
        this.grade = grade;
    }
    getGradePrefix() {
        return this.grade === 'high' ? 'gzsx' : 'czsx';
    }
    validateType(type) {
        const validTypes = ['t1', 't2', 't3', 't4', 't5', 't6'];
        return validTypes.includes(type);
    }
    validateDifficulty(difficulty) {
        const validDifficulties = ['d1', 'd2', 'd3', 'd4', 'd5'];
        return validDifficulties.includes(difficulty);
    }
    validateYear(year) {
        // -1 = 更早年份；其余要求在合理年份范围内
        return year === -1 || (Number.isInteger(year) && year >= 2000 && year <= 2100);
    }
    validateGrade(grade) {
        const validGrades = ['high', 'middle'];
        return validGrades.includes(grade);
    }
    setType(type, multiCount, fillCount) {
        if (!this.validateType(type))
            return this;
        const typeMap = mappings_1.QUESTION_TYPE_CODES[this.grade];
        const baseType = typeMap[type];
        if (!baseType)
            return this;
        if (type === 't2' && multiCount !== undefined) {
            // 多选题: qt{baseType} + 01(2个)/02(3个)/03(4个及以上)
            const suffix = multiCount >= 4 ? '03' : `0${multiCount}`;
            this.typePart = `qt${baseType}${suffix}`;
        }
        else if (type === 't3' && fillCount !== undefined) {
            // 填空题: qt{baseType} + 01(单空)/02(双空)/03(多空)
            const suffix = fillCount >= 3 ? '03' : `0${fillCount}`;
            this.typePart = `qt${baseType}${suffix}`;
        }
        else {
            this.typePart = `qt${baseType}`;
        }
        return this;
    }
    setDifficulty(difficulty) {
        if (this.validateDifficulty(difficulty)) {
            this.difficultyPart = `d${difficulty.slice(1)}`;
        }
        return this;
    }
    setYear(year) {
        if (this.validateYear(year)) {
            this.yearPart = year === -1 ? 'y-1' : `y${year}`;
        }
        return this;
    }
    setGrade(grade) {
        if (this.validateGrade(grade)) {
            this.gradePart = `g${grade.slice(1)}`;
        }
        return this;
    }
    setSource(_source) {
        // Not used in new URL format
        return this;
    }
    setRegion(_regionId) {
        // Not used in new URL format
        return this;
    }
    setSemester(_semester) {
        // Not used in new URL format
        return this;
    }
    setCategory(_category) {
        // Not used in new URL format
        return this;
    }
    setOrder(order) {
        this.orderPart = mappings_1.ORDER_CODES[order] || 'o2';
        return this;
    }
    setPage(page) {
        this.pageNum = page;
        return this;
    }
    build() {
        const gradePrefix = this.getGradePrefix();
        const parts = [];
        // Order: 题型 → 难度 → 年份 → 排序/分页 (直接拼接，无分隔符)
        if (this.typePart)
            parts.push(this.typePart);
        if (this.difficultyPart)
            parts.push(this.difficultyPart);
        if (this.yearPart)
            parts.push(this.yearPart);
        const pagePart = this.pageNum > 1 ? `${this.orderPart}p${this.pageNum}` : this.orderPart;
        parts.push(pagePart);
        // Strip 'zsd' prefix if present to avoid duplication
        const knowledgeId = this.knowledgeId.replace(/^zsd/, '');
        let url = `${BASE_URL}/${gradePrefix}/zsd${knowledgeId}/`;
        if (parts.length > 0) {
            url += parts.join('') + '/';
        }
        return url;
    }
    static buildUrl(knowledgeId, options, grade = 'high', defaultOrder = 'latest') {
        const builder = new UrlBuilder(knowledgeId, grade);
        if (options.type)
            builder.setType(options.type, options.multiCount, options.fillCount);
        if (options.difficulty)
            builder.setDifficulty(options.difficulty);
        if (options.year)
            builder.setYear(options.year);
        if (options.grade)
            builder.setGrade(options.grade);
        builder.setOrder(options.order || defaultOrder);
        if (options.page)
            builder.setPage(options.page);
        return builder.build();
    }
}
exports.UrlBuilder = UrlBuilder;
//# sourceMappingURL=url-builder.js.map