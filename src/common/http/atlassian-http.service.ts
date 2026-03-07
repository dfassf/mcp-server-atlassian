import { Injectable, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AtlassianApiError, JiraApiError, ConfluenceApiError } from '../errors/atlassian-api.error';
import { LoggerService } from '../logger/logger.service';
import { OAuthService } from '../oauth/oauth.service';
import { TokenStoreService } from '../oauth/token-store.service';
import { AtlassianProduct, createOAuthClient, createBasicAuthClient } from './atlassian-client.factory';

export { AtlassianProduct } from './atlassian-client.factory';

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatusCodes: number[];
}

@Injectable()
export class AtlassianHttpService {
  private clients: Map<AtlassianProduct, AxiosInstance> = new Map();
  private logger: LoggerService;
  private retryConfig: RetryConfig;

  constructor(
    private configService: ConfigService,
    @Optional() @Inject(OAuthService) private oauthService?: OAuthService,
    @Optional() @Inject(TokenStoreService) private tokenStore?: TokenStoreService,
    @Optional() logger?: LoggerService,
  ) {
    this.logger = logger || new LoggerService();
    this.logger.setContext('AtlassianHttpService');
    this.retryConfig = {
      maxRetries: this.configService.get<number>('http.maxRetries') || 3,
      retryDelay: this.configService.get<number>('http.retryDelay') || 1000,
      retryableStatusCodes: [429, 500, 502, 503, 504],
    };

    if (!this.isOAuthMode()) {
      this.initializeClients();
    }
  }

  isOAuthMode(): boolean {
    return !!this.configService.get<string>('oauth.clientId');
  }

  async initializeOAuthClients(): Promise<void> {
    if (!this.isOAuthMode()) return;

    if (!this.oauthService || !this.tokenStore) {
      throw new Error('OAuth 서비스가 주입되지 않았습니다.');
    }

    let tokens = await this.tokenStore.loadTokens();
    if (!tokens) {
      tokens = await this.oauthService.performAuthorizationFlow();
    } else if (this.oauthService.isTokenExpired(tokens)) {
      tokens = await this.oauthService.refreshTokens();
    }

    const timeout = this.configService.get<number>('http.timeout') || 30000;

    this.clients.set('jira', createOAuthClient(
      `https://api.atlassian.com/ex/jira/${tokens.cloudId}`,
      'jira', timeout, this.oauthService, this.logger,
    ));
    this.logger.log(`Jira OAuth client initialized (${tokens.siteName})`);

    this.clients.set('confluence', createOAuthClient(
      `https://api.atlassian.com/ex/confluence/${tokens.cloudId}`,
      'confluence', timeout, this.oauthService, this.logger,
    ));
    this.logger.log(`Confluence OAuth client initialized (${tokens.siteName})`);
  }

  initializeClients() {
    const timeout = this.configService.get<number>('http.timeout') || 30000;

    const jiraUrl = this.configService.get<string>('jira.url');
    if (jiraUrl) {
      this.clients.set('jira', createBasicAuthClient(jiraUrl, 'jira', timeout, {
        username: this.configService.get<string>('jira.username'),
        apiToken: this.configService.get<string>('jira.apiToken'),
        personalToken: this.configService.get<string>('jira.personalToken'),
      }, this.logger));
      this.logger.log('Jira client initialized');
    }

    const confluenceUrl = this.configService.get<string>('confluence.url');
    if (confluenceUrl) {
      this.clients.set('confluence', createBasicAuthClient(confluenceUrl, 'confluence', timeout, {
        username: this.configService.get<string>('confluence.username'),
        apiToken: this.configService.get<string>('confluence.apiToken'),
        personalToken: this.configService.get<string>('confluence.personalToken'),
      }, this.logger));
      this.logger.log('Confluence client initialized');
    }
  }

  getClient(product: AtlassianProduct): AxiosInstance {
    const client = this.clients.get(product);
    if (!client) {
      const error = new AtlassianApiError(
        AtlassianApiError.fromStatusCode(500),
        `${product} client not configured. Check environment variables.`,
      );
      this.logger.error(error.message, undefined, 'AtlassianHttpService');
      throw error;
    }
    return client;
  }

  private async executeWithRetry<T>(
    product: AtlassianProduct,
    requestFn: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      const apiError = product === 'jira'
        ? JiraApiError.fromAxiosError(error, 'Jira')
        : ConfluenceApiError.fromAxiosError(error, 'Confluence');

      if (apiError.isRetryable() && attempt < this.retryConfig.maxRetries) {
        let delay = this.retryConfig.retryDelay * attempt;

        if (apiError.statusCode === 429 && error.response?.headers?.['retry-after']) {
          const retryAfter = parseInt(error.response.headers['retry-after'], 10);
          if (!isNaN(retryAfter) && retryAfter > 0) {
            delay = retryAfter * 1000;
          }
        }

        this.logger.warn(
          `${product} request failed (attempt ${attempt}/${this.retryConfig.maxRetries}). Retrying in ${delay}ms...`,
          product,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(product, requestFn, attempt + 1);
      }

      throw apiError;
    }
  }

  async get<T>(product: AtlassianProduct, path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(product, async () => {
      const response = await this.getClient(product).get<T>(path, config);
      return response.data;
    });
  }

  async post<T>(product: AtlassianProduct, path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(product, async () => {
      const response = await this.getClient(product).post<T>(path, data, config);
      return response.data;
    });
  }

  async put<T>(product: AtlassianProduct, path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(product, async () => {
      const response = await this.getClient(product).put<T>(path, data, config);
      return response.data;
    });
  }

  async delete<T>(product: AtlassianProduct, path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(product, async () => {
      const response = await this.getClient(product).delete<T>(path, config);
      return response.data;
    });
  }
}
