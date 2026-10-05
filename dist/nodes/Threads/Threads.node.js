"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Threads = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const http_1 = require("../../shared/http");
function normalizeParameterValue(value) {
    if (value && typeof value === 'object' && 'value' in value)
        return value.value;
    return value;
}
function normalizeJsonValue(value, label, context, itemIndex) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed)
            return {};
        try {
            return JSON.parse(trimmed);
        }
        catch (error) {
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${label} must be valid JSON: ${error.message}`, { itemIndex });
        }
    }
    if (value === null || Array.isArray(value) || (value && typeof value === 'object') || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return value;
    throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${label} must be valid JSON`, { itemIndex });
}
function validateBodyValue(value, contract, path, context, itemIndex) {
    var _a, _b, _c, _d, _e;
    if (value === undefined || value === '') {
        if (contract.required)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} is required`, { itemIndex });
        return;
    }
    if (value === null) {
        if (contract.nullable)
            return;
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must not be null`, { itemIndex });
    }
    if ((_a = contract.alternatives) === null || _a === void 0 ? void 0 : _a.length) {
        selectAlternativeValue(value, contract, path, context, itemIndex);
        return;
    }
    if (contract.type === 'string' && typeof value !== 'string')
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a string`, { itemIndex });
    if (contract.type === 'boolean' && typeof value !== 'boolean')
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a boolean`, { itemIndex });
    if (contract.type === 'number' && typeof value !== 'number')
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a number`, { itemIndex });
    if (contract.type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value)))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be an integer`, { itemIndex });
    if ((_b = contract.enum) === null || _b === void 0 ? void 0 : _b.length) {
        const enumValueMatches = (candidate) => candidate === value ||
            (candidate === null && value === 'null') ||
            (candidate === 'null' && value === null) ||
            Boolean(candidate && value && typeof candidate === 'object' && typeof value === 'object' && JSON.stringify(candidate) === JSON.stringify(value));
        const scalarEnum = contract.enum.every((candidate) => candidate === null || ['string', 'number', 'boolean'].includes(typeof candidate));
        const matches = contract.type === 'array' && Array.isArray(value) && scalarEnum
            ? value.every((item) => contract.enum.some((candidate) => candidate === item || (candidate === null && item === 'null') || (candidate === 'null' && item === null)))
            : contract.enum.some(enumValueMatches);
        if (!matches)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be one of: ${contract.enum.join(', ')}`, { itemIndex });
    }
    if (contract.type === 'number' || contract.type === 'integer') {
        const numeric = value;
        if (contract.minValue !== undefined && numeric < contract.minValue)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be at least ${contract.minValue}`, { itemIndex });
        if (contract.maxValue !== undefined && numeric > contract.maxValue)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be at most ${contract.maxValue}`, { itemIndex });
    }
    if (contract.pattern && typeof value === 'string' && !new RegExp(contract.pattern).test(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must match ${contract.pattern}`, { itemIndex });
    if (contract.format === 'email' && typeof value === 'string' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be an email address`, { itemIndex });
    if ((contract.format === 'uri' || contract.format === 'url') && typeof value === 'string') {
        try {
            new URL(value);
        }
        catch {
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a URL`, { itemIndex });
        }
    }
    if (contract.format === 'uuid' && typeof value === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a UUID`, { itemIndex });
    if (contract.type === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a JSON object`, { itemIndex });
        const objectValue = value;
        for (const child of (_c = contract.fields) !== null && _c !== void 0 ? _c : [])
            validateBodyValue(objectValue[child.name], child, `${path}.${child.name}`, context, itemIndex);
        if (contract.additionalValue) {
            const known = new Set(((_d = contract.fields) !== null && _d !== void 0 ? _d : []).map((field) => field.name));
            for (const [key, childValue] of Object.entries(objectValue)) {
                if (!known.has(key)) {
                    if (((_e = contract.additionalValue.alternatives) === null || _e === void 0 ? void 0 : _e.length) && contract.additionalValue.representation === 'raw')
                        continue;
                    validateBodyValue(childValue, contract.additionalValue, `${path}.${key}`, context, itemIndex);
                }
            }
        }
    }
    if (contract.type === 'array') {
        if (!Array.isArray(value))
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a JSON array`, { itemIndex });
        if (contract.items)
            value.forEach((item, index) => validateBodyValue(item, contract.items, `${path}[${index}]`, context, itemIndex));
    }
}
function setBodyField(body, contract, value, context, itemIndex) {
    var _a, _b;
    const normalized = contract.type === 'object' || contract.type === 'array' || contract.type === 'alternative' || contract.representation === 'raw'
        ? normalizeJsonValue(value, (_a = contract.displayName) !== null && _a !== void 0 ? _a : contract.name, context, itemIndex)
        : normalizeParameterValue(value);
    const selected = ((_b = contract.alternatives) === null || _b === void 0 ? void 0 : _b.length) ? selectAlternativeValue(normalized, contract, contract.name, context, itemIndex) : normalized;
    validateBodyValue(selected, { ...contract, alternatives: undefined, composition: undefined }, contract.name, context, itemIndex);
    body[contract.name] = selected;
}
function selectAlternativeValue(value, contract, path, context, itemIndex) {
    var _a, _b, _c;
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must include an explicit schema alternative and value`, { itemIndex });
    const selectedName = String((_a = value.schemaAlternative) !== null && _a !== void 0 ? _a : '');
    const selected = ((_b = contract.alternatives) !== null && _b !== void 0 ? _b : []).find((alternative) => alternative.name === selectedName);
    if (!selected)
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} schema alternative must be one of: ${((_c = contract.alternatives) !== null && _c !== void 0 ? _c : []).map((alternative) => alternative.name).join(', ')}`, { itemIndex });
    const selectedValue = value.value;
    validateBodyValue(selectedValue, selected, path, context, itemIndex);
    return selectedValue;
}
function selectResponseFields(value, fields) {
    if (fields.length === 0)
        return value;
    const selected = {};
    if (value.id !== undefined)
        selected.id = value.id;
    for (const field of fields)
        if (value[field] !== undefined)
            selected[field] = value[field];
    return selected;
}
function valueAtPath(value, path) {
    if (!path)
        return value;
    return path.split('.').filter(Boolean).reduce((current, segment) => {
        if (current === undefined || current === null)
            return undefined;
        if (Array.isArray(current))
            return current[Number(segment)];
        return current[segment];
    }, value);
}
class Threads {
    constructor() {
        this.description = {
            displayName: "Threads",
            name: "threads",
            icon: {
                light: "file:threads.svg",
                dark: "file:threads.dark.svg"
            },
            group: [],
            version: [
                1
            ],
            subtitle: "={{((JSON.parse(\"\\u007b\\\"insights\\\":\\u007b\\\"getmediainsights\\\":\\\"getPostInsights: insight\\\",\\\"getuserinsights\\\":\\\"getProfileInsights: insight\\\"\\u007d,\\\"media\\\":\\u007b\\\"getmediaobject\\\":\\\"getMediaObject: media\\\"\\u007d,\\\"posts\\\":\\u007b\\\"createmediacontainer\\\":\\\"createMediaContainer: post\\\",\\\"publishmediacontainer\\\":\\\"publishMediaContainer: post\\\"\\u007d,\\\"profiles\\\":\\u007b\\\"getmyprofile\\\":\\\"getMyProfile: profile\\\"\\u007d,\\\"replies\\\":\\u007b\\\"getpendingreplies\\\":\\\"listPendingReplies: reply\\\",\\\"managependingreply\\\":\\\"approveOrIgnoreReply: reply\\\",\\\"managereply\\\":\\\"hideOrUnhideReply: reply\\\"\\u007d\\u007d\"))[$parameter[\"resource\"]] || {})[$parameter[\"operation\"]] || ($parameter[\"operation\"] + \": \" + $parameter[\"resource\"])}}",
            description: "Threads lets people publish posts, manage replies, and view post and profile insights.",
            documentationUrl: "https://graph.threads.net/v1.0",
            defaults: {
                name: "Threads"
            },
            usableAsTool: true,
            inputs: [
                n8n_workflow_1.NodeConnectionTypes.Main
            ],
            outputs: [
                n8n_workflow_1.NodeConnectionTypes.Main
            ],
            credentials: [
                {
                    name: "threadsOAuth2Api",
                    required: true
                }
            ],
            properties: [
                {
                    displayName: "Resource",
                    name: "resource",
                    type: "options",
                    noDataExpression: true,
                    default: "insights",
                    options: [
                        {
                            name: "Insight",
                            value: "insights"
                        },
                        {
                            name: "Media",
                            value: "media"
                        },
                        {
                            name: "Post",
                            value: "posts"
                        },
                        {
                            name: "Profile",
                            value: "profiles"
                        },
                        {
                            name: "Reply",
                            value: "replies"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "insights"
                            ]
                        }
                    },
                    default: "getmediainsights",
                    options: [
                        {
                            name: "Get Post",
                            value: "getmediainsights",
                            action: "Get post insights",
                            description: "Retrieve performance metrics for a threads post, such as views, likes, replies, reposts, quotes, or shares. insights."
                        },
                        {
                            name: "Get Profile",
                            value: "getuserinsights",
                            action: "Get profile insights",
                            description: "Retrieve profile-level insights for the requested metrics, with an optional time range and demographic breakdown"
                        }
                    ]
                },
                {
                    displayName: "Threads Media ID",
                    name: "threadsMediaId",
                    type: "string",
                    default: "",
                    required: true,
                    description: "ID of the media post to retrieve insights for",
                    displayOptions: {
                        show: {
                            resource: [
                                "insights"
                            ],
                            operation: [
                                "getmediainsights"
                            ]
                        }
                    }
                },
                {
                    displayName: "Metric",
                    name: "metric",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Comma-separated metrics to retrieve: views, likes, replies, reposts, quotes, or shares",
                    displayOptions: {
                        show: {
                            resource: [
                                "insights"
                            ],
                            operation: [
                                "getmediainsights"
                            ]
                        }
                    }
                },
                {
                    displayName: "Threads User ID",
                    name: "threadsUserId",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Threads profile ID to retrieve insights for",
                    displayOptions: {
                        show: {
                            resource: [
                                "insights"
                            ],
                            operation: [
                                "getuserinsights"
                            ]
                        }
                    }
                },
                {
                    displayName: "Metric",
                    name: "metric",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Comma-separated metrics to retrieve, such as views, likes, replies, followers_count, or follower_demographics",
                    displayOptions: {
                        show: {
                            resource: [
                                "insights"
                            ],
                            operation: [
                                "getuserinsights"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "insights"
                            ],
                            operation: [
                                "getuserinsights"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Breakdown",
                            name: "breakdown",
                            type: "options",
                            default: "country",
                            description: "Demographic dimension to use for the breakdown",
                            options: [
                                {
                                    name: "Age",
                                    value: "age"
                                },
                                {
                                    name: "City",
                                    value: "city"
                                },
                                {
                                    name: "Country",
                                    value: "country"
                                },
                                {
                                    name: "Gender",
                                    value: "gender"
                                }
                            ]
                        },
                        {
                            displayName: "Since",
                            name: "since",
                            type: "number",
                            default: 0,
                            description: "Start of the insights range as a unix timestamp"
                        },
                        {
                            displayName: "Until",
                            name: "until",
                            type: "number",
                            default: 0,
                            description: "End of the insights range as a unix timestamp"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "media"
                            ]
                        }
                    },
                    default: "getmediaobject",
                    options: [
                        {
                            name: "Get Media Object",
                            value: "getmediaobject",
                            action: "Get media object",
                            description: "Retrieve the media object identified by threadsmediaid. use fields to choose which comma-separated fields to include in the response."
                        }
                    ]
                },
                {
                    displayName: "Threads Media ID",
                    name: "threadsMediaId",
                    type: "string",
                    default: "",
                    required: true,
                    description: "ID of the media object to retrieve",
                    displayOptions: {
                        show: {
                            resource: [
                                "media"
                            ],
                            operation: [
                                "getmediaobject"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "media"
                            ],
                            operation: [
                                "getmediaobject"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Fields",
                            name: "fields",
                            type: "string",
                            default: "",
                            description: "Comma-separated media fields to include in the response"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "posts"
                            ]
                        }
                    },
                    default: "createmediacontainer",
                    options: [
                        {
                            name: "Create Media Container",
                            value: "createmediacontainer",
                            action: "Create media container posts",
                            description: "Create a container for a threads text, image, video, or carousel post. set media_type and provide the matching content fields; for a carousel, provide the child container IDs."
                        },
                        {
                            name: "Publish Media Container",
                            value: "publishmediacontainer",
                            action: "Publish media container posts",
                            description: "Publish a previously created media container using its creation_id. posts."
                        }
                    ]
                },
                {
                    displayName: "Threads User ID",
                    name: "threadsUserId",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Threads profile ID used to create the media container",
                    displayOptions: {
                        show: {
                            resource: [
                                "posts"
                            ],
                            operation: [
                                "createmediacontainer"
                            ]
                        }
                    }
                },
                {
                    displayName: "Media Type",
                    name: "media_type",
                    type: "options",
                    default: "TEXT",
                    required: true,
                    description: "Content type for the post or carousel: text, image, video, or carousel",
                    options: [
                        {
                            name: "CAROUSEL",
                            value: "CAROUSEL"
                        },
                        {
                            name: "IMAGE",
                            value: "IMAGE"
                        },
                        {
                            name: "TEXT",
                            value: "TEXT"
                        },
                        {
                            name: "VIDEO",
                            value: "VIDEO"
                        }
                    ],
                    displayOptions: {
                        show: {
                            resource: [
                                "posts"
                            ],
                            operation: [
                                "createmediacontainer"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "posts"
                            ],
                            operation: [
                                "createmediacontainer"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Children",
                            name: "children",
                            type: "json",
                            default: [],
                            description: "Media container IDs to include as items in a carousel post"
                        },
                        {
                            displayName: "Enable Reply Approvals",
                            name: "enable_reply_approvals",
                            type: "boolean",
                            default: false,
                            description: "Whether require approval for replies to the post when true"
                        },
                        {
                            displayName: "Image URL",
                            name: "image_url",
                            type: "string",
                            default: "",
                            description: "Image URL for an image post",
                            hint: "Expected format: uri"
                        },
                        {
                            displayName: "Is Carousel Item",
                            name: "is_carousel_item",
                            type: "boolean",
                            default: false,
                            description: "Whether set to true when creating a media item for a carousel"
                        },
                        {
                            displayName: "Link Attachment",
                            name: "link_attachment",
                            type: "string",
                            default: "",
                            description: "URL to attach to the post as a link preview",
                            hint: "Expected format: uri"
                        },
                        {
                            displayName: "Reply Control",
                            name: "reply_control",
                            type: "options",
                            default: "everyone",
                            description: "Accounts allowed to reply to the post",
                            options: [
                                {
                                    name: "Accounts You Follow",
                                    value: "accounts_you_follow"
                                },
                                {
                                    name: "Everyone",
                                    value: "everyone"
                                },
                                {
                                    name: "Followers Only",
                                    value: "followers_only"
                                },
                                {
                                    name: "Mentioned Only",
                                    value: "mentioned_only"
                                },
                                {
                                    name: "Parent Post Author Only",
                                    value: "parent_post_author_only"
                                }
                            ]
                        },
                        {
                            displayName: "Text",
                            name: "text",
                            type: "string",
                            default: "",
                            description: "Text to include with the post"
                        },
                        {
                            displayName: "Topic Tag",
                            name: "topic_tag",
                            type: "string",
                            default: "",
                            description: "Topic tag to associate with the post"
                        },
                        {
                            displayName: "Video URL",
                            name: "video_url",
                            type: "string",
                            default: "",
                            description: "Video URL for a video post",
                            hint: "Expected format: uri"
                        }
                    ]
                },
                {
                    displayName: "Threads User ID",
                    name: "threadsUserId",
                    type: "string",
                    default: "",
                    required: true,
                    description: "Threads profile ID that owns the media container",
                    displayOptions: {
                        show: {
                            resource: [
                                "posts"
                            ],
                            operation: [
                                "publishmediacontainer"
                            ]
                        }
                    }
                },
                {
                    displayName: "Creation ID",
                    name: "creation_id",
                    type: "string",
                    default: "",
                    required: true,
                    description: "ID of the media container to publish",
                    displayOptions: {
                        show: {
                            resource: [
                                "posts"
                            ],
                            operation: [
                                "publishmediacontainer"
                            ]
                        }
                    }
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "profiles"
                            ]
                        }
                    },
                    default: "getmyprofile",
                    options: [
                        {
                            name: "Get My",
                            value: "getmyprofile",
                            action: "Get my profile",
                            description: "Retrieve the authenticated user?s threads profile, optionally selecting which fields to include in the response"
                        }
                    ]
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "profiles"
                            ],
                            operation: [
                                "getmyprofile"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Fields",
                            name: "fields",
                            type: "string",
                            default: "",
                            description: "Comma-separated profile fields to include in the response"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "replies"
                            ]
                        }
                    },
                    default: "getpendingreplies",
                    options: [
                        {
                            name: "Approve Or Ignore",
                            value: "managependingreply",
                            action: "Approve or ignore reply",
                            description: "Approve or ignore a pending reply by setting approve to true or false"
                        },
                        {
                            name: "Hide Or Unhide",
                            value: "managereply",
                            action: "Hide or unhide reply",
                            description: "Set whether the specified reply is hidden by sending hide=true, or visible by sending hide=false"
                        },
                        {
                            name: "List Pending",
                            value: "getpendingreplies",
                            action: "List pending replies",
                            description: "List replies awaiting approval for a media post. use approval_status to filter by pending or ignored status."
                        }
                    ]
                },
                {
                    displayName: "Media ID",
                    name: "mediaId",
                    type: "string",
                    default: "",
                    required: true,
                    description: "ID of the media post whose replies to list",
                    displayOptions: {
                        show: {
                            resource: [
                                "replies"
                            ],
                            operation: [
                                "getpendingreplies"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "replies"
                            ],
                            operation: [
                                "getpendingreplies"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Approval Status",
                            name: "approval_status",
                            type: "options",
                            default: "pending",
                            description: "Filter replies by approval status",
                            options: [
                                {
                                    name: "Ignored",
                                    value: "ignored"
                                },
                                {
                                    name: "Pending",
                                    value: "pending"
                                }
                            ]
                        },
                        {
                            displayName: "Reverse",
                            name: "reverse",
                            type: "boolean",
                            default: true,
                            description: "Whether to return replies in reverse chronological order"
                        }
                    ]
                },
                {
                    displayName: "Threads Reply ID",
                    name: "threadsReplyId",
                    type: "string",
                    default: "",
                    required: true,
                    description: "ID of the pending reply to manage",
                    displayOptions: {
                        show: {
                            resource: [
                                "replies"
                            ],
                            operation: [
                                "managependingreply"
                            ]
                        }
                    }
                },
                {
                    displayName: "Approve",
                    name: "approve",
                    type: "boolean",
                    default: false,
                    required: true,
                    description: "Whether set to true to approve the pending reply or false to ignore it",
                    displayOptions: {
                        show: {
                            resource: [
                                "replies"
                            ],
                            operation: [
                                "managependingreply"
                            ]
                        }
                    }
                },
                {
                    displayName: "Threads Reply ID",
                    name: "threadsReplyId",
                    type: "string",
                    default: "",
                    required: true,
                    description: "ID of the reply whose visibility to update",
                    displayOptions: {
                        show: {
                            resource: [
                                "replies"
                            ],
                            operation: [
                                "managereply"
                            ]
                        }
                    }
                },
                {
                    displayName: "Hide",
                    name: "hide",
                    type: "boolean",
                    default: false,
                    required: true,
                    description: "Whether set to true to hide the reply or false to make it visible",
                    displayOptions: {
                        show: {
                            resource: [
                                "replies"
                            ],
                            operation: [
                                "managereply"
                            ]
                        }
                    }
                }
            ]
        };
    }
    async execute() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const inputItems = this.getInputData();
        const output = [];
        for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex += 1) {
            const outputStart = output.length;
            let errorPlan = {};
            try {
                const operation = this.getNodeParameter('operation', itemIndex);
                const nodeVersion = this.getNode().typeVersion;
                let additionalFields = {};
                const nodeOptions = this.getNodeParameter('options', itemIndex, {});
                let retryContract = { mode: 'none', maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0 };
                let credentialApplications;
                let options;
                let pagination = { style: 'none', advancement: '', maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10 * 1024 * 1024, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                let responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                switch (operation) {
                    case "getmediainsights": {
                        let path = "/{threadsMediaId}/insights";
                        const qs = {};
                        const body = {};
                        path = path.split("{threadsMediaId}").join(encodeURIComponent(String(this.getNodeParameter("threadsMediaId", itemIndex))));
                        qs["metric"] = this.getNodeParameter("metric", itemIndex);
                        const serverBaseUrl = { url: "https://graph.threads.net/v1.0", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "threadsOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["data"], simplified: ["data"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized - invalid or expired access token" } };
                        break;
                    }
                    case "getuserinsights": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        let path = "/{threadsUserId}/threads_insights";
                        const qs = {};
                        const body = {};
                        path = path.split("{threadsUserId}").join(encodeURIComponent(String(this.getNodeParameter("threadsUserId", itemIndex))));
                        qs["metric"] = this.getNodeParameter("metric", itemIndex);
                        if (additionalFields["since"] !== undefined)
                            qs["since"] = additionalFields["since"];
                        if (additionalFields["until"] !== undefined)
                            qs["until"] = additionalFields["until"];
                        if (additionalFields["breakdown"] !== undefined)
                            qs["breakdown"] = additionalFields["breakdown"];
                        const serverBaseUrl = { url: "https://graph.threads.net/v1.0", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "threadsOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["data"], simplified: ["data"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized - invalid or expired access token" } };
                        break;
                    }
                    case "getmediaobject": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        let path = "/{threadsMediaId}";
                        const qs = {};
                        const body = {};
                        path = path.split("{threadsMediaId}").join(encodeURIComponent(String(this.getNodeParameter("threadsMediaId", itemIndex))));
                        if (additionalFields["fields"] !== undefined)
                            qs["fields"] = additionalFields["fields"];
                        const serverBaseUrl = { url: "https://graph.threads.net/v1.0", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "threadsOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["id", "is_quote_post", "link_attachment_url", "media_product_type", "media_type", "media_url", "permalink", "text", "timestamp", "username"], simplified: ["id", "is_quote_post", "link_attachment_url", "media_product_type", "media_type", "media_url", "permalink", "text", "timestamp", "username"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized - invalid or expired access token" } };
                        break;
                    }
                    case "createmediacontainer": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        let path = "/{threadsUserId}/threads";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        path = path.split("{threadsUserId}").join(encodeURIComponent(String(this.getNodeParameter("threadsUserId", itemIndex))));
                        if (additionalFields["children"] !== undefined)
                            setBodyField(body, { "name": "children", "displayName": "Children", "description": "Media container IDs to include as items in a CAROUSEL post.", "type": "array", "representation": "raw", "items": { "name": "item", "displayName": "Item", "type": "string" } }, additionalFields["children"], this, itemIndex);
                        if (additionalFields["enable_reply_approvals"] !== undefined)
                            setBodyField(body, { "name": "enable_reply_approvals", "displayName": "Enable reply approvals", "description": "Require approval for replies to the post when true.", "type": "boolean" }, additionalFields["enable_reply_approvals"], this, itemIndex);
                        if (additionalFields["image_url"] !== undefined)
                            setBodyField(body, { "name": "image_url", "displayName": "Image url", "description": "Image URL for an IMAGE post.", "type": "string", "format": "uri" }, additionalFields["image_url"], this, itemIndex);
                        if (additionalFields["is_carousel_item"] !== undefined)
                            setBodyField(body, { "name": "is_carousel_item", "displayName": "Is carousel item", "description": "Set to true when creating a media item for a carousel.", "type": "boolean" }, additionalFields["is_carousel_item"], this, itemIndex);
                        if (additionalFields["link_attachment"] !== undefined)
                            setBodyField(body, { "name": "link_attachment", "displayName": "Link attachment", "description": "URL to attach to the post as a link preview.", "type": "string", "format": "uri" }, additionalFields["link_attachment"], this, itemIndex);
                        setBodyField(body, { "name": "media_type", "displayName": "Media type", "description": "Content type for the post or carousel: TEXT, IMAGE, VIDEO, or CAROUSEL.", "type": "string", "required": true, "enum": ["TEXT", "IMAGE", "VIDEO", "CAROUSEL"] }, this.getNodeParameter("media_type", itemIndex), this, itemIndex);
                        if (additionalFields["reply_control"] !== undefined)
                            setBodyField(body, { "name": "reply_control", "displayName": "Reply control", "description": "Accounts allowed to reply to the post.", "type": "string", "enum": ["everyone", "accounts_you_follow", "mentioned_only", "parent_post_author_only", "followers_only"] }, additionalFields["reply_control"], this, itemIndex);
                        if (additionalFields["text"] !== undefined)
                            setBodyField(body, { "name": "text", "displayName": "Text", "description": "Text to include with the post.", "type": "string" }, additionalFields["text"], this, itemIndex);
                        if (additionalFields["topic_tag"] !== undefined)
                            setBodyField(body, { "name": "topic_tag", "displayName": "Topic tag", "description": "Topic tag to associate with the post.", "type": "string" }, additionalFields["topic_tag"], this, itemIndex);
                        if (additionalFields["video_url"] !== undefined)
                            setBodyField(body, { "name": "video_url", "displayName": "Video url", "description": "Video URL for a VIDEO post.", "type": "string", "format": "uri" }, additionalFields["video_url"], this, itemIndex);
                        const serverBaseUrl = { url: "https://graph.threads.net/v1.0", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "threadsOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["id"], simplified: ["id"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized - invalid or expired access token" } };
                        break;
                    }
                    case "publishmediacontainer": {
                        let path = "/{threadsUserId}/threads_publish";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        path = path.split("{threadsUserId}").join(encodeURIComponent(String(this.getNodeParameter("threadsUserId", itemIndex))));
                        setBodyField(body, { "name": "creation_id", "displayName": "Creation id", "description": "ID of the media container to publish.", "type": "string", "required": true }, this.getNodeParameter("creation_id", itemIndex), this, itemIndex);
                        const serverBaseUrl = { url: "https://graph.threads.net/v1.0", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "threadsOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["id"], simplified: ["id"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized - invalid or expired access token" } };
                        break;
                    }
                    case "getmyprofile": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/me";
                        const qs = {};
                        const body = {};
                        if (additionalFields["fields"] !== undefined)
                            qs["fields"] = additionalFields["fields"];
                        const serverBaseUrl = { url: "https://graph.threads.net/v1.0", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "threadsOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["id", "threads_biography", "threads_profile_picture_url", "username"], simplified: ["id", "threads_biography", "threads_profile_picture_url", "username"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized - invalid or expired access token" } };
                        break;
                    }
                    case "getpendingreplies": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        let path = "/{mediaId}/pending_replies";
                        const qs = {};
                        const body = {};
                        path = path.split("{mediaId}").join(encodeURIComponent(String(this.getNodeParameter("mediaId", itemIndex))));
                        if (additionalFields["reverse"] !== undefined)
                            qs["reverse"] = additionalFields["reverse"];
                        if (additionalFields["approval_status"] !== undefined)
                            qs["approval_status"] = additionalFields["approval_status"];
                        const serverBaseUrl = { url: "https://graph.threads.net/v1.0", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "threadsOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["data", "paging"], simplified: ["data", "paging"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized - invalid or expired access token" } };
                        break;
                    }
                    case "managependingreply": {
                        let path = "/{threadsReplyId}/manage_pending_reply";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        path = path.split("{threadsReplyId}").join(encodeURIComponent(String(this.getNodeParameter("threadsReplyId", itemIndex))));
                        setBodyField(body, { "name": "approve", "displayName": "Approve", "description": "Set to true to approve the pending reply or false to ignore it.", "type": "boolean", "required": true }, this.getNodeParameter("approve", itemIndex), this, itemIndex);
                        const serverBaseUrl = { url: "https://graph.threads.net/v1.0", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "threadsOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["success"], simplified: ["success"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized - invalid or expired access token" } };
                        break;
                    }
                    case "managereply": {
                        let path = "/{threadsReplyId}/manage_reply";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        path = path.split("{threadsReplyId}").join(encodeURIComponent(String(this.getNodeParameter("threadsReplyId", itemIndex))));
                        setBodyField(body, { "name": "hide", "displayName": "Hide", "description": "Set to true to hide the reply or false to make it visible.", "type": "boolean", "required": true }, this.getNodeParameter("hide", itemIndex), this, itemIndex);
                        const serverBaseUrl = { url: "https://graph.threads.net/v1.0", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "threadsOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["success"], simplified: ["success"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized - invalid or expired access token" } };
                        break;
                    }
                    default: throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported operation ${operation} for node version ${nodeVersion}`, { itemIndex });
                }
                const returnAll = pagination.style !== 'none' ? Boolean((_a = nodeOptions.returnAll) !== null && _a !== void 0 ? _a : false) : false;
                const resultLimit = pagination.style !== 'none' && !returnAll ? Number((_b = nodeOptions.resultLimit) !== null && _b !== void 0 ? _b : 50) : Math.min(pagination.maxItems, Number.POSITIVE_INFINITY);
                const pageStartTime = Date.now();
                const seenCursors = new Map();
                const seenPages = new Map();
                let page = 1;
                let offset = 0;
                let cursor;
                let pagesFetched = 0;
                let estimatedBytes = 0;
                let finished = false;
                while (!finished && output.length - outputStart < resultLimit && pagesFetched < pagination.maxPages) {
                    if (Date.now() - pageStartTime > pagination.maxElapsedMs)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination elapsed-time budget was exceeded', { itemIndex });
                    const qs = options.qs;
                    if (pagination.limit && (pagesFetched > 0 || qs[pagination.limit] === undefined))
                        qs[pagination.limit] = Math.min(pagination.pageSize, resultLimit - (output.length - outputStart));
                    if (pagination.style === 'offset' && pagination.page)
                        qs[pagination.page] = offset;
                    if (pagination.style === 'pageNumber' && pagination.page)
                        qs[pagination.page] = page;
                    if (pagination.style === 'cursor' && pagination.cursor && cursor)
                        qs[pagination.cursor] = cursor;
                    const response = await (0, http_1.requestWithRetry)(this, options, credentialApplications, retryContract, itemIndex);
                    pagesFetched += 1;
                    const pageFingerprint = JSON.stringify(response);
                    const pageRepeats = ((_c = seenPages.get(pageFingerprint)) !== null && _c !== void 0 ? _c : 0) + 1;
                    seenPages.set(pageFingerprint, pageRepeats);
                    if (pageRepeats > pagination.repeatedPageLimit)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination repeated-page budget was exceeded', { itemIndex });
                    estimatedBytes += pageFingerprint.length;
                    if (estimatedBytes > pagination.maxMemoryBytes)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination memory budget was exceeded', { itemIndex });
                    if (responsePlan.binary) {
                        const binaryPayload = responsePlan.full ? ((_d = response.body) !== null && _d !== void 0 ? _d : response) : response;
                        const responseHeaders = (_e = (responsePlan.full ? response.headers : undefined)) !== null && _e !== void 0 ? _e : {};
                        const contentType = String((_f = responseHeaders['content-type']) !== null && _f !== void 0 ? _f : '').split(';')[0].trim() || 'application/octet-stream';
                        const binaryData = await this.helpers.prepareBinaryData(Buffer.from(binaryPayload), undefined, contentType);
                        output.push({ json: {}, binary: { data: binaryData }, pairedItem: { item: itemIndex } });
                        finished = true;
                        continue;
                    }
                    const normalizedResponse = responsePlan.full ? ((_g = response.body) !== null && _g !== void 0 ? _g : response) : response;
                    const envelopeValue = valueAtPath(normalizedResponse, responsePlan.envelopePath);
                    if (responsePlan.envelopePath && envelopeValue === undefined)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Response envelope path "${responsePlan.envelopePath}" was not found`, { itemIndex });
                    const envelope = (envelopeValue !== null && envelopeValue !== void 0 ? envelopeValue : normalizedResponse);
                    const itemPath = pagination.itemPath || responsePlan.itemPath;
                    const extractedItems = valueAtPath(envelope, itemPath);
                    if (itemPath && extractedItems === undefined)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Response item path "${itemPath}" was not found`, { itemIndex });
                    const deletedFallback = options.method === 'DELETE' && (normalizedResponse === undefined || normalizedResponse === null || normalizedResponse === '' ||
                        (typeof normalizedResponse === 'object' && !Array.isArray(normalizedResponse) && Object.keys(normalizedResponse).length === 0));
                    const values = deletedFallback
                        ? [{ deleted: true }]
                        : Array.isArray(extractedItems) ? extractedItems : Array.isArray(normalizedResponse) ? normalizedResponse : [extractedItems !== null && extractedItems !== void 0 ? extractedItems : envelope];
                    const outputMode = responsePlan.fields.length > 10 ? this.getNodeParameter('outputMode', itemIndex, 'simplified') : 'raw';
                    const selectedFields = outputMode === 'selected' ? this.getNodeParameter('selectedFields', itemIndex, []) : [];
                    for (const value of values) {
                        if (output.length - outputStart >= resultLimit)
                            break;
                        const fields = outputMode === 'simplified' ? responsePlan.simplified : outputMode === 'selected' ? selectedFields : [];
                        output.push({ json: selectResponseFields(value, fields), pairedItem: { item: itemIndex } });
                    }
                    if (!returnAll || pagination.style === 'none' || values.length === 0) {
                        finished = true;
                        continue;
                    }
                    if (pagination.hasMore && envelope[pagination.hasMore] === false) {
                        finished = true;
                        continue;
                    }
                    if (pagination.style === 'cursor') {
                        cursor = pagination.responseCursor ? valueAtPath(envelope, pagination.responseCursor) : undefined;
                        finished = !cursor;
                        if (cursor) {
                            const key = String(cursor);
                            const repeats = ((_h = seenCursors.get(key)) !== null && _h !== void 0 ? _h : 0) + 1;
                            seenCursors.set(key, repeats);
                            if (repeats > pagination.repeatedCursorLimit)
                                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination repeated-cursor budget was exceeded', { itemIndex });
                        }
                    }
                    if (pagination.advancement === 'offsetByItems')
                        offset += values.length;
                    if (pagination.advancement === 'incrementPage')
                        page += 1;
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    output.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
                    continue;
                }
                if (error instanceof n8n_workflow_1.NodeApiError) {
                    const status = String((_l = (_j = error.httpCode) !== null && _j !== void 0 ? _j : (_k = error.cause) === null || _k === void 0 ? void 0 : _k.statusCode) !== null && _l !== void 0 ? _l : 'default');
                    const planned = (_m = errorPlan[status]) !== null && _m !== void 0 ? _m : errorPlan.default;
                    if (planned) {
                        const parameterHelp = planned.parameter ? `Check the '${planned.parameter}' parameter.` : undefined;
                        const description = [planned.recovery, parameterHelp].filter(Boolean).join(' ');
                        throw new n8n_workflow_1.NodeApiError(this.getNode(), error, { itemIndex, message: planned.title, description });
                    }
                }
                if (error instanceof n8n_workflow_1.NodeApiError)
                    throw new n8n_workflow_1.NodeApiError(this.getNode(), error, { itemIndex });
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, { itemIndex });
            }
        }
        return [output];
    }
}
exports.Threads = Threads;
//# sourceMappingURL=Threads.node.js.map