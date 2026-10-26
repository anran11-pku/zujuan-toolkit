export declare class VisionOCRProcessor {
    /** 根据 API URL 构建 OpenAI 客户端，OpenRouter 需要额外头 */
    private buildClient;
    /** 将图片文件转为 base64 */
    private imageToBase64;
    /** 去掉 Markdown 代码块包裹符号 */
    private stripCodeBlocks;
    /** 从文件路径判断 MIME 类型 */
    private getMimeType;
    /**
     * 调用视觉模型识别图片中的文字，返回 Markdown 格式内容。
     * 数学公式使用 LaTeX 语法输出。
     */
    imageToMarkdown(imagePath: string, options?: {
        signal?: AbortSignal;
    }): Promise<string>;
    /**
     * 识别答案图片中的文字，忽略几何示意图、函数图像、坐标系图等。
     * 只转写选项、解析、点评等纯文字内容。
     */
    answerToMarkdown(imagePath: string, options?: {
        signal?: AbortSignal;
    }): Promise<string>;
}
export declare const visionOCRProcessor: VisionOCRProcessor;
//# sourceMappingURL=vision-ocr.d.ts.map