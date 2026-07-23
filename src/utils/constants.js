export const userID = import.meta.env.BN_USER_ID;
export const baseUrl = import.meta.env.BN_BASE_URL;

// In dev, empty string uses the Vite /socket.io proxy. In production, fall back to the API host.
export const wsUrl = import.meta.env.BN_WS_URL
    || (import.meta.env.PROD ? import.meta.env.BN_BASE_URL : '')
    || '';

export const documentEndpoint = '/v1/page/document';
export const documentBaseUrl = baseUrl + documentEndpoint;

export const mediaEndpoint = '/v1/upload/media';
export const mediaBaseUrl = baseUrl + mediaEndpoint;

export const commentEndpoint = '/v1/comment';
export const commentBaseUrl = baseUrl + commentEndpoint;

export const authEndpoint = '/v1/auth';
export const authBaseUrl = baseUrl + authEndpoint;

export const searchEndpoint = baseUrl + '/v1/search';

export const historyEndpoint = '/v1/page/history';
export const historyBaseUrl = baseUrl + historyEndpoint;

export const chatConversationEndpoint = '/v1/chat/conversation';
export const chatConversationBaseUrl = baseUrl + chatConversationEndpoint;

export const chatMessageEndpoint = '/v1/chat/message';
export const chatMessageBaseUrl = baseUrl + chatMessageEndpoint;

export const chatSpaceItemsEndpoint = '/v1/chat/space-items';
export const chatSpaceItemsBaseUrl = baseUrl + chatSpaceItemsEndpoint;
