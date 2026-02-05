import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export type AtlassianProduct = 'jira' | 'confluence';

@Injectable()
export class AtlassianHttpService {
  private clients: Map<AtlassianProduct, AxiosInstance> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeClients();
  }

  initializeClients() {
    const jiraUrl = this.configService.get<string>('jira.url');
    const jiraUsername = this.configService.get<string>('jira.username');
    const jiraToken = this.configService.get<string>('jira.apiToken');
    const jiraPersonalToken = this.configService.get<string>('jira.personalToken');

    if (jiraUrl) {
      this.clients.set('jira', this.createClient(jiraUrl, jiraUsername, jiraToken, jiraPersonalToken));
    }

    const confluenceUrl = this.configService.get<string>('confluence.url');
    const confluenceUsername = this.configService.get<string>('confluence.username');
    const confluenceToken = this.configService.get<string>('confluence.apiToken');
    const confluencePersonalToken = this.configService.get<string>('confluence.personalToken');

    if (confluenceUrl) {
      this.clients.set('confluence', this.createClient(confluenceUrl, confluenceUsername, confluenceToken, confluencePersonalToken));
    }
  }

  private createClient(
    baseUrl: string,
    username?: string,
    apiToken?: string,
    personalToken?: string,
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
      throw new Error('Authentication required: either personalToken or (username + apiToken) must be provided');
    }

    const client = axios.create({
      baseURL: baseUrl,
      headers,
      timeout: 30000,
    });

    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.errorMessages?.[0] || error.response.data?.message || error.message;
          throw new Error(`API Error (${status}): ${message}`);
        } else if (error.request) {
          throw new Error(`Network Error: No response received from ${baseUrl}`);
        } else {
          throw new Error(`Request Error: ${error.message}`);
        }
      },
    );

    return client;
  }

  getClient(product: AtlassianProduct): AxiosInstance {
    const client = this.clients.get(product);
    if (!client) {
      throw new Error(`${product} client not configured. Check environment variables.`);
    }
    return client;
  }

  async get<T>(product: AtlassianProduct, path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.getClient(product).get<T>(path, config);
    return response.data;
  }

  async post<T>(product: AtlassianProduct, path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.getClient(product).post<T>(path, data, config);
    return response.data;
  }

  async put<T>(product: AtlassianProduct, path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.getClient(product).put<T>(path, data, config);
    return response.data;
  }

  async delete<T>(product: AtlassianProduct, path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.getClient(product).delete<T>(path, config);
    return response.data;
  }
}
