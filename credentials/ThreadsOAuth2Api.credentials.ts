import { type Icon, type ICredentialType, type INodeProperties } from "n8n-workflow";

// Generated with ts-morph
export class ThreadsOAuth2Api implements ICredentialType {
  name = "threadsOAuth2Api";
  extends = [
        "oAuth2Api"
    ];
  displayName = "Threads OAuth2 API";
  icon: Icon = {
        light: "file:../nodes/Threads/threads.svg",
        dark: "file:../nodes/Threads/threads.dark.svg"
    };
  documentationUrl = "https://graph.threads.net/v1.0";
  properties: INodeProperties[] = [
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
