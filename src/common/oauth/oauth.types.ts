/** 저장되는 OAuth 토큰 정보 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
  cloudId: string;
  siteName: string;
  siteUrl: string;
}

/** Atlassian OAuth 토큰 응답 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // 3600 (1시간)
  refresh_token: string;
  scope: string;
}

/** Atlassian 접근 가능 리소스 (사이트) */
export interface AtlassianAccessibleResource {
  id: string; // cloudId
  name: string;
  url: string;
  scopes: string[];
  avatarUrl?: string;
}
