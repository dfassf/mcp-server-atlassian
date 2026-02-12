import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigValidator {
  constructor(private configService: ConfigService) {}

  validate(): void {
    const errors: string[] = [];

    const oauthClientId = this.configService.get<string>('oauth.clientId');
    const oauthClientSecret = this.configService.get<string>('oauth.clientSecret');
    const isOAuthMode = !!oauthClientId;

    // OAuth 모드: client_id + client_secret 필수
    if (isOAuthMode) {
      if (!oauthClientSecret) {
        errors.push('OAuth: ATLASSIAN_OAUTH_CLIENT_SECRET must be provided when ATLASSIAN_OAUTH_CLIENT_ID is set');
      }
      if (errors.length > 0) {
        throw new Error(`Configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
      }
      return; // OAuth 모드에서는 JIRA_URL/CONFLUENCE_URL 불필요
    }

    // Basic Auth / PAT 모드
    const jiraUrl = this.configService.get<string>('jira.url');
    const jiraUsername = this.configService.get<string>('jira.username');
    const jiraApiToken = this.configService.get<string>('jira.apiToken');
    const jiraPersonalToken = this.configService.get<string>('jira.personalToken');

    if (jiraUrl) {
      if (!jiraPersonalToken && (!jiraUsername || !jiraApiToken)) {
        errors.push('Jira: Either JIRA_PERSONAL_TOKEN or (JIRA_USERNAME + JIRA_API_TOKEN) must be provided');
      }
    }

    const confluenceUrl = this.configService.get<string>('confluence.url');
    const confluenceUsername = this.configService.get<string>('confluence.username');
    const confluenceApiToken = this.configService.get<string>('confluence.apiToken');
    const confluencePersonalToken = this.configService.get<string>('confluence.personalToken');

    if (confluenceUrl) {
      if (!confluencePersonalToken && (!confluenceUsername || !confluenceApiToken)) {
        errors.push('Confluence: Either CONFLUENCE_PERSONAL_TOKEN or (CONFLUENCE_USERNAME + CONFLUENCE_API_TOKEN) must be provided');
      }
    }

    if (!jiraUrl && !confluenceUrl) {
      errors.push('At least one service (Jira or Confluence) must be configured, or use OAuth (ATLASSIAN_OAUTH_CLIENT_ID)');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    }
  }
}
