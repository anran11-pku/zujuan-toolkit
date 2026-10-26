import { QuestionType, Difficulty, Year, Grade, Order, Source, Semester, Category } from '../types';
export declare class UrlBuilder {
    private knowledgeId;
    private grade;
    private typePart;
    private difficultyPart;
    private yearPart;
    private gradePart;
    private orderPart;
    private pageNum;
    constructor(knowledgeId: string, grade?: 'high' | 'middle');
    private getGradePrefix;
    private validateType;
    private validateDifficulty;
    private validateYear;
    private validateGrade;
    setType(type: QuestionType, multiCount?: number, fillCount?: number): this;
    setDifficulty(difficulty: Difficulty): this;
    setYear(year: Year): this;
    setGrade(grade: Grade): this;
    setSource(_source: Source): this;
    setRegion(_regionId: string): this;
    setSemester(_semester: Semester): this;
    setCategory(_category: Category): this;
    setOrder(order: Order): this;
    setPage(page: number): this;
    build(): string;
    static buildUrl(knowledgeId: string, options: {
        type?: QuestionType;
        difficulty?: Difficulty;
        year?: Year;
        grade?: Grade;
        order?: Order;
        source?: Source;
        region?: string;
        semester?: Semester;
        category?: Category;
        page?: number;
        multiCount?: number;
        fillCount?: number;
    }, grade?: 'high' | 'middle', defaultOrder?: Order): string;
}
//# sourceMappingURL=url-builder.d.ts.map