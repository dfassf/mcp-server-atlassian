import { Injectable } from '@nestjs/common';
import { JiraService } from './jira.service';
import { Tool, ToolResult } from '../types/mcp.types';
import { ToolResultUtil } from '../common/utils/tool-result.util';
import { JiraApiError } from '../common/errors/atlassian-api.error';
import {
  ToolHandler,
  JiraIssueToolHandler,
  JiraCommentToolHandler,
  JiraLinkToolHandler,
  JiraAgileToolHandler,
  JiraWorklogToolHandler,
  JiraMetaToolHandler,
} from './tools';

@Injectable()
export class JiraToolsService {
  private handlers: ToolHandler[];

  constructor(private jiraService: JiraService) {
    this.handlers = [
      new JiraIssueToolHandler(jiraService),
      new JiraCommentToolHandler(jiraService),
      new JiraLinkToolHandler(jiraService),
      new JiraAgileToolHandler(jiraService),
      new JiraWorklogToolHandler(jiraService),
      new JiraMetaToolHandler(jiraService),
    ];
  }

  getTools(): Tool[] {
    return this.handlers.flatMap((h) => h.getTools());
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult> {
    try {
      for (const handler of this.handlers) {
        const result = await handler.executeTool(name, args);
        if (result) return result;
      }
      return ToolResultUtil.errorResult(`Unknown Jira tool: ${name}`);
    } catch (error) {
      if (error instanceof JiraApiError) {
        return ToolResultUtil.errorResult(
          `${error.message} (Code: ${error.code}${error.statusCode ? `, Status: ${error.statusCode}` : ''})`,
        );
      }
      return ToolResultUtil.errorResult(error instanceof Error ? error.message : String(error));
    }
  }
}
