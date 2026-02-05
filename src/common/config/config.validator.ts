import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigValidator {
  constructor(private configService: ConfigService) {}

  validate(): void {
    const errors: string[] = [];

    // Jira 설정 검증
    const jiraUrl = this.configService.get<string>('jira.url');
    const jiraUsername = this.configService.get<string>('jira.username');
    const jiraApiToken = this.configService.get<string>('jira.apiToken');
    const jiraPersonalToken = this.configService.get<string>('jira.personalToken');

    if (jiraUrl) {
      if (!jiraPersonalToken && (!jiraUsername || !jiraApiToken)) {
        errors.push('Jira: Either JIRA_PERSONAL_TOKEN or (JIRA_USERNAME + JIRA_API_TOKEN) must be provided');
      }
    }

    // Confluence 설정 검증
    const confluenceUrl = this.configService.get<string>('confluence.url');
    const confluenceUsername = this.configService.get<string>('confluence.username');
    const confluenceApiToken = this.configService.get<string>('confluence.apiToken');
    const confluencePersonalToken = this.configService.get<string>('confluence.personalToken');

    if (confluenceUrl) {
      if (!confluencePersonalToken && (!confluenceUsername || !confluenceApiToken)) {
        errors.push('Confluence: Either CONFLUENCE_PERSONAL_TOKEN or (CONFLUENCE_USERNAME + CONFLUENCE_API_TOKEN) must be provided');
      }
    }

    // 최소 하나의 서비스는 설정되어야 함
    if (!jiraUrl && !confluenceUrl) {
      errors.push('At least one service (Jira or Confluence) must be configured');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    }
  }
}
