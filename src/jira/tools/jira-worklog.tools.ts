import { z } from 'zod';
import { JiraService } from '../jira.service';
import { Tool, ToolResult } from '../../types/mcp.types';
import { ToolResultUtil } from '../../common/utils/tool-result.util';
import { ToolHandler } from './tool-handler.interface';

export class JiraWorklogToolHandler implements ToolHandler {
  constructor(private jiraService: JiraService) {}

  getTools(): Tool[] {
    return [
      {
        name: 'jira_get_worklog',
        description: 'Get work logs for an issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_log_work',
        description: 'Log work time on an issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
            timeSpent: { type: 'string', description: 'Time spent (e.g., "2h", "30m", "1d")' },
            comment: { type: 'string', description: 'Work log comment (optional)' },
          },
          required: ['issueKey', 'timeSpent'],
        },
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult | null> {
    switch (name) {
      case 'jira_get_worklog': return await this.getWorklog(args);
      case 'jira_log_work': return await this.logWork(args);
      default: return null;
    }
  }

  private async getWorklog(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
    });
    const { issueKey } = schema.parse(args);

    const result = await this.jiraService.getWorklogs(issueKey);
    const worklogs = result.worklogs.map((w) => ({
      id: w.id,
      author: w.author?.displayName,
      timeSpent: w.timeSpent,
      started: w.started,
    }));

    return ToolResultUtil.textResult(JSON.stringify({ worklogs }, null, 2));
  }

  private async logWork(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
      timeSpent: z.string(),
      comment: z.string().optional(),
    });
    const { issueKey, timeSpent, comment } = schema.parse(args);

    const timeMatch = timeSpent.match(/^(\d+)([hdm])$/i);
    if (!timeMatch) {
      return ToolResultUtil.errorResult('Invalid time format. Use format like "2h", "30m", or "1d"');
    }

    const value = parseInt(timeMatch[1], 10);
    const unit = timeMatch[2].toLowerCase();
    let seconds = 0;

    switch (unit) {
      case 'd':
        seconds = value * 8 * 60 * 60;
        break;
      case 'h':
        seconds = value * 60 * 60;
        break;
      case 'm':
        seconds = value * 60;
        break;
    }

    const started = new Date().toISOString().replace('Z', '+0000');
    await this.jiraService.addWorklog(issueKey, seconds, started, comment);

    return ToolResultUtil.textResult(`Logged ${timeSpent} on ${issueKey}`);
  }
}
