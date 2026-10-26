/** 登录状态已失效（Cookie 过期或被踢下线）。
 * 由引擎层抛出，命令层负责决定提示语与退出码。 */
export declare class LoginExpiredError extends Error {
    constructor(message?: string);
}
//# sourceMappingURL=errors.d.ts.map