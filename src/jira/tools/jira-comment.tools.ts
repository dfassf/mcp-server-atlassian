import { z } from 'zod';
import { JiraService } from '../jira.service';
import { Tool, ToolResult } from '../../types/mcp.types';
import { JiraComment } from '../../types/jira.types';
import { ToolResultUtil } from '../../common/utils/tool-result.util';
import { ToolHandler } from './tool-handler.interface';

export class JiraCommentToolHandler implements ToolHandler {
  constructor(private jiraService: JiraService) {}

  getTools(): Tool[] {
    return [
      {
        name: 'jira_add_comment',
        description: 'Add a comment to a Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
            body: { type: 'string', description: 'Comment text' },
          },
          required: ['issueKey', 'body'],
        },
      },
      {
        name: 'jira_get_comments',
        description: 'Get all comments from an issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_delete_comment',
        description: 'Delete a comment from an issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
            commentId: { type: 'string', description: 'Comment ID to delete' },
          },
          required: ['issueKey', 'commentId'],
        },
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult | null> {
    switch (name) {
      case 'jira_add_comment': return await this.addComment(args);
      case 'jira_get_comments': return await this.getComments(args);
      case 'jira_delete_comment': return await this.deleteComment(args);
      default: return null;
    }
  }

  private async addComment(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
      body: z.string(),
    });
    const { issueKey, body } = schema.parse(args);

    await this.jiraService.addComment(issueKey, body);
    return ToolResultUtil.textResult(`Comment added to ${issueKey}`);
  }

  private async getComments(args: unknown): Promise<ToolResult> {
    const schema = z.object({ issueKey: z.string() });
    const { issueKey } = schema.parse(args);

    const result = await this.jiraService.getComments(issueKey);
    const comments = result.comments.map((c: JiraComment) => ({
      id: c.id,
      author: c.author?.displayName,
      body: c.body,
      created: c.created,
    }));
    return ToolResultUtil.textResult(JSON.stringify({ comments }, null, 2));
  }

  private async deleteComment(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
      commentId: z.string(),
    });
    const { issueKey, commentId } = schema.parse(args);

    await this.jiraService.deleteComment(issueKey, commentId);
    return ToolResultUtil.textResult(`Comment ${commentId} deleted from ${issueKey}`);
  }
}
