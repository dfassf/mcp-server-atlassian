import { z } from 'zod';
import { JiraService } from '../jira.service';
import { Tool, ToolResult } from '../../types/mcp.types';
import { ToolResultUtil } from '../../common/utils/tool-result.util';
import { ToolHandler } from './tool-handler.interface';

export class JiraAgileToolHandler implements ToolHandler {
  constructor(private jiraService: JiraService) {}

  getTools(): Tool[] {
    return [
      {
        name: 'jira_get_boards',
        description: 'Get all Scrum/Kanban boards',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'Filter by project key (optional)' },
          },
          required: [],
        },
      },
      {
        name: 'jira_get_sprints',
        description: 'Get sprints for a board',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: { type: 'number', description: 'Board ID' },
            state: { type: 'string', description: 'Filter by state: "active", "future", "closed" (optional)' },
          },
          required: ['boardId'],
        },
      },
      {
        name: 'jira_get_sprint_issues',
        description: 'Get all issues in a sprint',
        inputSchema: {
          type: 'object',
          properties: {
            sprintId: { type: 'number', description: 'Sprint ID' },
          },
          required: ['sprintId'],
        },
      },
      {
        name: 'jira_move_to_sprint',
        description: 'Move issues to a sprint',
        inputSchema: {
          type: 'object',
          properties: {
            sprintId: { type: 'number', description: 'Target sprint ID' },
            issueKeys: { type: 'string', description: 'Comma-separated issue keys (e.g., "PROJ-1,PROJ-2")' },
          },
          required: ['sprintId', 'issueKeys'],
        },
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult | null> {
    switch (name) {
      case 'jira_get_boards': return await this.getBoards(args);
      case 'jira_get_sprints': return await this.getSprints(args);
      case 'jira_get_sprint_issues': return await this.getSprintIssues(args);
      case 'jira_move_to_sprint': return await this.moveToSprint(args);
      default: return null;
    }
  }

  private async getBoards(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      projectKey: z.string().optional(),
    });
    const { projectKey } = schema.parse(args);

    const result = await this.jiraService.getBoards(projectKey);
    const boards = result.values.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
    }));

    return ToolResultUtil.textResult(JSON.stringify({ boards }, null, 2));
  }

  private async getSprints(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      boardId: z.number(),
      state: z.string().optional(),
    });
    const { boardId, state } = schema.parse(args);

    const result = await this.jiraService.getSprints(boardId, state);
    const sprints = result.values.map((s) => ({
      id: s.id,
      name: s.name,
      state: s.state,
      startDate: s.startDate,
      endDate: s.endDate,
    }));

    return ToolResultUtil.textResult(JSON.stringify({ sprints }, null, 2));
  }

  private async getSprintIssues(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      sprintId: z.number(),
    });
    const { sprintId } = schema.parse(args);

    const result = await this.jiraService.getSprintIssues(sprintId);
    const issues = result.issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      assignee: issue.fields.assignee?.displayName,
      priority: issue.fields.priority?.name,
    }));

    return ToolResultUtil.textResult(JSON.stringify({ count: issues.length, issues }, null, 2));
  }

  private async moveToSprint(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      sprintId: z.number(),
      issueKeys: z.string(),
    });
    const { sprintId, issueKeys } = schema.parse(args);

    const keys = issueKeys.split(',').map((k) => k.trim());
    await this.jiraService.moveIssuesToSprint(sprintId, keys);

    return ToolResultUtil.textResult(`Moved ${keys.length} issue(s) to sprint ${sprintId}`);
  }
}
