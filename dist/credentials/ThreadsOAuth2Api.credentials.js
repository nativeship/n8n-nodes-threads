"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadsOAuth2Api = void 0;
class ThreadsOAuth2Api {
    constructor() {
        this.name = "threadsOAuth2Api";
        this.extends = [
            "oAuth2Api"
        ];
        this.displayName = "Threads OAuth2 API";
        this.icon = {
            light: "file:../nodes/Threads/threads.svg",
            dark: "file:../nodes/Threads/threads.dark.svg"
        };
        this.documentationUrl = "https://graph.threads.net/v1.0";
        this.properties = [
            {
                displayName: "Grant Type",
                name: "grantType",
                type: "hidden",
                default: "authorizationCode"
            },
            {
                displayName: "Authorization URL",
                name: "authUrl",
                type: "hidden",
                default: "https://threads.net/oauth/authorize"
            },
            {
                displayName: "Access Token URL",
                name: "accessTokenUrl",
                type: "hidden",
                default: "https://graph.threads.net/oauth/access_token"
            },
            {
                displayName: "Scope",
                name: "scope",
                type: "hidden",
                default: "threads_basic threads_content_publish threads_manage_insights threads_manage_replies threads_read_replies"
            }
        ];
    }
}
exports.ThreadsOAuth2Api = ThreadsOAuth2Api;
//# sourceMappingURL=ThreadsOAuth2Api.credentials.js.map