import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { AtlassianApiError, JiraApiError, ConfluenceApiError } from '../errors/atlassian-api.error';
import { LoggerService } from '../logger/logger.service';

export type AtlassianProduct = 'jira' | 'confluence';

interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  retryableStatusCodes: number[];
}

@Injectable()
export class AtlassianHttpService {
  private clients: Map<AtlassianProduct, AxiosInstance> = new Map();
  private logger: LoggerService;
  private retryConfig: RetryConfig;

  constructor(
    private configService: ConfigService,
    logger?: LoggerService,
  ) {
    this.logger = logger || new LoggerService();
    this.logger.setContext('AtlassianHttpService');
    this.retryConfig = {
      maxRetries: this.configService.get<number>('http.maxRetries') || 3,
      retryDelay: this.configService.get<number>('http.retryDelay') || 1000,
      retryableStatusCodes: [429, 500, 502, 503, 504],
    };
    this.initializeClients();
  }

  initializeClients() {
    const jiraUrl = this.configService.get<string>('jira.url');
    const jiraUsername = this.configService.get<string>('jira.username');
    const jiraToken = this.configService.get<string>('jira.apiToken');
    const jiraPersonalToken = this.configService.get<string>('jira.personalToken');

    if (jiraUrl) {
      this.clients.set(
        'jira',
        this.createClient(jiraUrl, jiraUsername, jiraToken, jiraPersonalToken, 'jira'),
      );
      this.logger.log('Jira client initialized', 'AtlassianHttpService');
    }

    const confluenceUrl = this.configService.get<string>('confluence.url');
    const confluenceUsername = this.configService.get<string>('confluence.username');
    const confluenceToken = this.configService.get<string>('confluence.apiToken');
    const confluencePersonalToken = this.configService.get<string>('confluence.personalToken');

    if (confluenceUrl) {
      this.clients.set(
        'confluence',
        this.createClient(confluenceUrl, confluenceUsername, confluenceToken, confluencePersonalToken, 'confluence'),
      );
      this.logger.log('Confluence client initialized', 'AtlassianHttpService');
    }
  }

  private createClient(
    baseUrl: string,
    username?: string,
    apiToken?: string,
    personalToken?: string,
    product?: AtlassianProduct,
  ): AxiosInstance {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (personalToken) {
      headers['Authorization'] = `Bearer ${personalToken}`;
    } else if (username && apiToken) {
      const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else {
      throw new AtlassianApiError(
        AtlassianApiError.fromStatusCode(401),
        'Authentication required: either personalToken or (username + apiToken) must be provided',
      );
    }

    const timeout = this.configService.get<number>('http.timeout') || 30000;
    const client = axios.create({
      baseURL: baseUrl,
      headers,
      timeout,
    });

    client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const method = config.method?.toUpperCase() || 'UNKNOWN';
        const url = config.url || '';
        this.logger.debug(`${method} ${url}`, product);
        return config;
      },
      (error) => {
        this.logger.error(`Request setup error: ${error.message}`, error.stack, product);
        throw error;
      },
    );

    client.interceptors.response.use(
      (response) => {
        const method = response.config.method?.toUpperCase() || 'UNKNOWN';
        const url = response.config.url || '';
        this.logger.debug(`${method} ${url} - ${response.status}`, product);
        return response;
      },
      (error) => {
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
        const url = error.config?.url || '';
        this.logger.error(
          `${method} ${url} failed: ${error.message}`,
          error.stack,
          product,
        );
        throw error;
      },
    );

    return client;
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

        await this.sleep(delay);
        return this.executeWithRetry(product, requestFn, attempt + 1);
      }

      throw apiError;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async get<T>(product: AtlassianProduct, path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(product, async () => {
      const response = await this.getClient(product).get<T>(path, config);
      return response.data;
    });
  }

  async post<T>(
    product: AtlassianProduct,
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.executeWithRetry(product, async () => {
      const response = await this.getClient(product).post<T>(path, data, config);
      return response.data;
    });
  }

  async put<T>(
    product: AtlassianProduct,
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
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
