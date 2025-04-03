
export const userID = import.meta.env.BN_USER_ID;
export const baseUrl = import.meta.env.BN_BASE_URL;

export const documentEndpoint = '/v1/page/document';
export const documentBaseUrl = baseUrl + documentEndpoint;

export const mediaEndpoint = '/v1/upload/media';
export const mediaBaseUrl = baseUrl + mediaEndpoint;

export const commentEndpoint = '/v1/comment';
export const commentBaseUrl = baseUrl + commentEndpoint;
