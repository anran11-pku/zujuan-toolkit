export interface ConfigOptions {
    browserDir?: string;
    loginQrDir?: string;
    logDir?: string;
    treeDb?: string;
    grade?: 'high' | 'middle';
    order?: Order;
    treeDepth?: number;
    logLevel?: LogLevel;
    visionApiUrl?: string;
    visionApiKey?: string;
    visionModel?: string;
    visionEnabled?: boolean;
    exportFormat?: ExportFormat;
    outputDir?: string;
    qrNotifyDiscord?: string;
    cookie?: string;
    browserPort?: number;
    headless?: boolean;
    logEnabled?: boolean;
}
export interface Config {
    browserDir: string;
    loginQrDir: string;
    logDir: string;
    treeDb: string;
    grade: 'high' | 'middle';
    order: Order;
    treeDepth: number;
    logLevel: LogLevel;
    visionApiUrl: string;
    visionApiKey: string;
    visionModel: string;
    visionEnabled: boolean;
    exportFormat: ExportFormat;
    outputDir: string;
    qrNotifyDiscord: string;
    cookie: string;
    browserPort: number;
    headless: boolean;
    logEnabled: boolean;
}
export type LogLevel = 'quiet' | 'normal' | 'verbose';
export type QuestionType = 't1' | 't2' | 't3' | 't4' | 't5' | 't6';
export type Difficulty = 'd1' | 'd2' | 'd3' | 'd4' | 'd5';
export type Year = number;
export type Grade = 'high' | 'middle';
export type ExportFormat = 'html' | 'markdown' | 'both';
export type ExportTheme = 'light' | 'dark' | 'sepia';
export type Order = 'latest' | 'hot' | 'comprehensive';
export type Source = 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8' | 's9' | 's10' | 's11' | 's12' | 's13';
export interface Region {
    id: string;
    name: string;
}
export type Semester = 'x1' | 'x2';
export type Category = 'k1' | 'k2' | 'k3' | 'k4' | 'k5';
export interface ScrapeOptions {
    knowledge: string;
    type?: QuestionType;
    difficulty?: Difficulty;
    year?: Year;
    grade?: Grade;
    order?: Order;
    limit?: number;
    multiCount?: number;
    fillCount?: number;
    page?: number;
    logLevel?: LogLevel;
}
export interface ScrapeMeta {
    timestamp: string;
    knowledgeId: string;
    knowledgePoint: string;
    grade: string;
    type?: string;
    difficulty?: string;
    year?: number;
    order: string;
    multiCount?: number;
    fillCount?: number;
    page?: number;
}
export interface ScrapeResult {
    id: string;
    index: string;
    questionPath: string;
    answerPath: string;
    images: string[];
    source?: string;
    questionType?: string;
    difficulty?: string;
    scoreRate?: number;
    knowledgeKeywords: string[];
    questionText?: string;
    answerText?: string;
    timestamp: string;
}
export interface ScrapeOutput {
    options: ScrapeMeta;
    results: ScrapeResult[];
}
export interface BrowserState {
    wsEndpoint: string;
    pid: number;
    port: number;
    startedAt: string;
}
//# sourceMappingURL=index.d.ts.map