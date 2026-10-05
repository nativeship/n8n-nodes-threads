# Threads n8n community node

Threads lets people publish posts, manage replies, and view post and profile insights.

Generated from OpenAPI 1.0.0 with template 1.1.0. Generated files are platform-managed and will be overwritten during regeneration.

## Authentication

Configure the generated OAuth 2.0 credential in n8n before using the node.

## Supported operations

- `GET /{threadsMediaId}/insights` - Get post insights
  - Retry Contract: none
  - Pagination Contract: none
- `GET /{threadsUserId}/threads_insights` - Get profile insights
  - Retry Contract: none
  - Pagination Contract: none
- `GET /{threadsMediaId}` - Get media object
  - Retry Contract: none
  - Pagination Contract: none
- `POST /{threadsUserId}/threads` - Create media container
  - Retry Contract: none
  - Pagination Contract: none
- `POST /{threadsUserId}/threads_publish` - Publish media container
  - Retry Contract: none
  - Pagination Contract: none
- `GET /me` - Get my profile
  - Retry Contract: none
  - Pagination Contract: none
- `GET /{mediaId}/pending_replies` - List pending replies
  - Retry Contract: none
  - Pagination Contract: none
- `POST /{threadsReplyId}/manage_pending_reply` - Approve or ignore reply
  - Retry Contract: none
  - Pagination Contract: none
- `POST /{threadsReplyId}/manage_reply` - Hide or unhide reply
  - Retry Contract: none
  - Pagination Contract: none

## Usage

1. Install this community-node package in n8n.
2. Add the **Threads** node to a workflow.
3. Select a resource and operation, configure its parameters, and execute the workflow.

## Example workflow

Connect **Manual Trigger** -> **Threads** -> a destination node, select an operation, then run the workflow and inspect the returned items.

## Development

```sh
npm install
npm run build
npm run lint
npm run dev
```

`npm run dev` starts a local n8n development instance. Find the integration by its **Threads** display name.
