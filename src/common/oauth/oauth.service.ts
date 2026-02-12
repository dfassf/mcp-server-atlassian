import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import axios from 'axios';
import { TokenStoreService } from './token-store.service';
import { LoggerService } from '../logger/logger.service';
import {
  OAuthTokens,
  OAuthTokenResponse,
  AtlassianAccessibleResource,
} from './oauth.types';

const AUTH_URL = 'https://auth.atlassian.com/authorize';
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources';

const DEFAULT_SCOPES = [
  'offline_access',
  'read:jira-work',
  'write:jira-work',
  'read:jira-user',
  'manage:jira-project',
  'read:confluence-content.all',
  'write:confluence-content',
  'read:confluence-space.summary',
  'write:confluence-file',
  'read:confluence-user',
];

const AUTH_TIMEOUT_MS = 3 * 60 * 1000; // 3분
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 만료 5분 전 갱신

@Injectable()
export class OAuthService {
  private refreshPromise: Promise<OAuthTokens> | null = null;
  private logger: LoggerService;

  constructor(
    private configService: ConfigService,
    private tokenStore: TokenStoreService,
  ) {
    this.logger = new LoggerService();
    this.logger.setContext('OAuthService');
  }

  /** OAuth 인가 코드 플로우 실행 (브라우저 → 콜백 → 토큰 교환) */
  async performAuthorizationFlow(): Promise<OAuthTokens> {
    const clientId = this.configService.get<string>('oauth.clientId')!;
    const clientSecret = this.configService.get<string>('oauth.clientSecret')!;
    const callbackPort = this.configService.get<number>('oauth.callbackPort') || 18080;
    const redirectUri = `http://localhost:${callbackPort}/callback`;
    const state = crypto.randomBytes(16).toString('hex');

    const authUrl = this.buildAuthorizationUrl(clientId, redirectUri, state);

    this.logger.log('OAuth 인증이 필요합니다. 브라우저에서 아래 URL을 열어주세요:');
    this.logger.log(authUrl);

    const code = await this.waitForCallback(callbackPort, state, authUrl);

    const tokenResponse = await this.exchangeCodeForTokens(
      clientId,
      clientSecret,
      code,
      redirectUri,
    );

    const resources = await this.getAccessibleResources(tokenResponse.access_token);
    if (resources.length === 0) {
      throw new Error('접근 가능한 Atlassian 사이트가 없습니다.');
    }

    const site = this.selectSite(resources);

    const tokens: OAuthTokens = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      cloudId: site.id,
      siteName: site.name,
      siteUrl: site.url,
    };

    await this.tokenStore.saveTokens(tokens);
    this.logger.log(`OAuth 인증 완료: ${site.name} (${site.url})`);
    return tokens;
  }

  /** 유효한 access_token 반환 (만료 시 자동 갱신) */
  async getValidAccessToken(): Promise<string> {
    const tokens = await this.tokenStore.loadTokens();
    if (!tokens) {
      throw new Error('OAuth 토큰이 없습니다. 인증 플로우를 먼저 실행하세요.');
    }

    if (this.isTokenExpired(tokens)) {
      const newTokens = await this.refreshTokens();
      return newTokens.accessToken;
    }

    return tokens.accessToken;
  }

  /** 토큰 갱신 (동시 갱신 방지) */
  async refreshTokens(): Promise<OAuthTokens> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.doRefreshTokens().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  /** 토큰 만료 여부 확인 (5분 여유) */
  isTokenExpired(tokens: OAuthTokens): boolean {
    return Date.now() >= tokens.expiresAt - TOKEN_REFRESH_BUFFER_MS;
  }

  /** 접근 가능한 Atlassian 사이트 목록 조회 */
  async getAccessibleResources(accessToken: string): Promise<AtlassianAccessibleResource[]> {
    const response = await axios.get<AtlassianAccessibleResource[]>(RESOURCES_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  private buildAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    state: string,
  ): string {
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: clientId,
      scope: DEFAULT_SCOPES.join(' '),
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      prompt: 'consent',
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  /** 임시 HTTP 서버로 OAuth 콜백 수신 */
  private waitForCallback(port: number, expectedState: string, authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error(`OAuth 인증 타임아웃 (${AUTH_TIMEOUT_MS / 1000}초)`));
      }, AUTH_TIMEOUT_MS);

      const server = http.createServer((req, res) => {
        const url = new URL(req.url!, `http://localhost:${port}`);

        if (url.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>인증 실패</h1><p>브라우저를 닫아도 됩니다.</p>');
          clearTimeout(timeout);
          server.close();
          reject(new Error(`OAuth 인증 거부: ${error}`));
          return;
        }

        if (!code || state !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>잘못된 요청</h1>');
          clearTimeout(timeout);
          server.close();
          reject(new Error('OAuth state 불일치 또는 code 누락'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>MCP Atlassian</title></head>
<body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="text-align:center;background:#fff;padding:48px 64px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
<svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin-bottom:16px"><circle cx="12" cy="12" r="12" fill="#36B37E"/><path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
<h1 style="margin:0 0 8px;font-size:24px;color:#172B4D">인증 완료</h1>
<p style="margin:0;color:#6B778C;font-size:15px">이 창을 닫고 터미널로 돌아가세요.</p>
</div></body></html>`);
        clearTimeout(timeout);
        server.close();
        resolve(code);
      });

      server.listen(port, () => {
        this.openBrowser(authUrl);
      });

      server.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`콜백 서버 시작 실패 (포트 ${port}): ${err.message}`));
      });
    });
  }

  /** 인가 코드 → 토큰 교환 */
  private async exchangeCodeForTokens(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokenResponse> {
    const response = await axios.post<OAuthTokenResponse>(TOKEN_URL, {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });
    return response.data;
  }

  /** 실제 토큰 갱신 처리 */
  private async doRefreshTokens(): Promise<OAuthTokens> {
    const tokens = await this.tokenStore.loadTokens();
    if (!tokens) {
      throw new Error('갱신할 OAuth 토큰이 없습니다.');
    }

    const clientId = this.configService.get<string>('oauth.clientId')!;
    const clientSecret = this.configService.get<string>('oauth.clientSecret')!;

    try {
      const response = await axios.post<OAuthTokenResponse>(TOKEN_URL, {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refreshToken,
      });

      const newTokens: OAuthTokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + response.data.expires_in * 1000,
        cloudId: tokens.cloudId,
        siteName: tokens.siteName,
        siteUrl: tokens.siteUrl,
      };

      await this.tokenStore.saveTokens(newTokens);
      this.logger.debug('OAuth 토큰 갱신 완료');
      return newTokens;
    } catch (error: unknown) {
      // refresh_token 만료 (90일) → 토큰 삭제, 재인증 필요
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        await this.tokenStore.deleteTokens();
        throw new Error('Refresh token이 만료되었습니다. MCP 서버를 재시작하여 다시 인증하세요.');
      }
      throw error;
    }
  }

  /** 멀티 사이트 중 선택 */
  private selectSite(resources: AtlassianAccessibleResource[]): AtlassianAccessibleResource {
    if (resources.length === 1) return resources[0];

    const siteName = this.configService.get<string>('oauth.siteName');
    if (siteName) {
      const matched = resources.find(
        (r) => r.name === siteName || r.url.includes(siteName),
      );
      if (matched) return matched;
      this.logger.warn(
        `사이트 "${siteName}"을 찾을 수 없습니다. 사용 가능: ${resources.map((r) => r.name).join(', ')}`,
      );
    }

    this.logger.log(
      `여러 사이트 사용 가능: ${resources.map((r) => `${r.name} (${r.url})`).join(', ')}`,
    );
    this.logger.log(`기본값 "${resources[0].name}" 사용. ATLASSIAN_SITE_NAME으로 변경 가능.`);
    return resources[0];
  }

  /** 브라우저 열기 */
  private openBrowser(authUrl: string): void {
    const command =
      process.platform === 'darwin'
        ? `open "${authUrl}"`
        : process.platform === 'win32'
          ? `start "" "${authUrl}"`
          : `xdg-open "${authUrl}"`;

    exec(command, (err) => {
      if (err) {
        this.logger.warn('브라우저를 자동으로 열 수 없습니다. 위 URL을 수동으로 열어주세요.');
      }
    });
  }
}
