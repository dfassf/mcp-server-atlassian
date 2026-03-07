import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { AtlassianApiError } from '../errors/atlassian-api.error';
import { LoggerService } from '../logger/logger.service';
import { OAuthService } from '../oauth/oauth.service';

export type AtlassianProduct = 'jira' | 'confluence';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/** 공통 요청/응답 인터셉터 등록 */
function attachLoggingInterceptors(
  client: AxiosInstance,
  logger: LoggerService,
  product?: AtlassianProduct,
): void {
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const method = config.method?.toUpperCase() || 'UNKNOWN';
      const url = config.url || '';
      logger.debug(`${method} ${url}`, product);
      return config;
    },
    (error) => {
      logger.error(`Request setup error: ${error.message}`, error.stack, product);
      throw error;
    },
  );

  client.interceptors.response.use(
    (response) => {
      const method = response.config.method?.toUpperCase() || 'UNKNOWN';
      const url = response.config.url || '';
      logger.debug(`${method} ${url} - ${response.status}`, product);
      return response;
    },
    (error) => {
      const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
      const url = error.config?.url || '';
      logger.error(`${method} ${url} failed: ${error.message}`, error.stack, product);
      throw error;
    },
  );
}

/** OAuth용 Axios 클라이언트 생성 (토큰 자동 갱신 interceptor 포함) */
export function createOAuthClient(
  baseUrl: string,
  product: AtlassianProduct,
  timeout: number,
  oauthService: OAuthService,
  logger: LoggerService,
): AxiosInstance {
  const client = axios.create({
    baseURL: baseUrl,
    headers: { ...DEFAULT_HEADERS },
    timeout,
  });

  // OAuth 토큰 주입 interceptor (로깅 interceptor보다 먼저 등록)
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const accessToken = await oauthService.getValidAccessToken();
      config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    },
  );

  attachLoggingInterceptors(client, logger, product);
  return client;
}

/** Basic Auth / PAT용 Axios 클라이언트 생성 */
export function createBasicAuthClient(
  baseUrl: string,
  product: AtlassianProduct,
  timeout: number,
  auth: { username?: string; apiToken?: string; personalToken?: string },
  logger: LoggerService,
): AxiosInstance {
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  if (auth.personalToken) {
    headers['Authorization'] = `Bearer ${auth.personalToken}`;
  } else if (auth.username && auth.apiToken) {
    const encoded = Buffer.from(`${auth.username}:${auth.apiToken}`).toString('base64');
    headers['Authorization'] = `Basic ${encoded}`;
  } else {
    throw new AtlassianApiError(
      AtlassianApiError.fromStatusCode(401),
      'Authentication required: either personalToken or (username + apiToken) must be provided',
    );
  }

  const client = axios.create({ baseURL: baseUrl, headers, timeout });
  attachLoggingInterceptors(client, logger, product);
  return client;
}
