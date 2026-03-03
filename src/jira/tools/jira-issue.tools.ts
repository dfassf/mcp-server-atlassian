import { z } from 'zod';
import { JiraService } from '../jira.service';
import { Tool, ToolResult } from '../../types/mcp.types';
import { ToolResultUtil } from '../../common/utils/tool-result.util';
import { JiraFieldUtil } from '../../common/utils/jira-field.util';
import { JiraApiError } from '../../common/errors/atlassian-api.error';
import { ToolHandler } from './tool-handler.interface';

export class JiraIssueToolHandler implements ToolHandler {
  constructor(private jiraService: JiraService) {}

  getTools(): Tool[] {
    return [
      {
        name: 'jira_search',
        description: 'Search Jira issues using JQL (Jira Query Language)',
        inputSchema: {
          type: 'object',
          properties: {
            jql: { type: 'string', description: 'JQL query string (e.g., "project = DEV AND status = Open")' },
            maxResults: { type: 'number', description: 'Maximum number of results (default: 50)' },
          },
          required: ['jql'],
        },
      },
      {
        name: 'jira_get_issue',
        description: 'Get detailed information about a specific Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_create_issue',
        description: 'Create a new Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'Project key (e.g., "DEV")' },
            summary: { type: 'string', description: 'Issue summary/title' },
            issueType: { type: 'string', description: 'Issue type (e.g., "Bug", "Task", "Story")' },
            description: { type: 'string', description: 'Issue description (optional)' },
            assignee: { type: 'string', description: 'Assignee account ID or email (optional)' },
            priority: { type: 'string', description: 'Priority name (e.g., "High", "Medium", "Low") (optional)' },
            labels: { type: 'string', description: 'Comma-separated labels (e.g., "frontend,urgent") (optional)' },
          },
          required: ['projectKey', 'summary', 'issueType'],
        },
      },
      {
        name: 'jira_update_issue',
        description: 'Update an existing Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
            summary: { type: 'string', description: 'New summary (optional)' },
            description: { type: 'string', description: 'New description (optional)' },
            assignee: { type: 'string', description: 'Assignee account ID or email (optional)' },
            priority: { type: 'string', description: 'Priority name (e.g., "High", "Medium", "Low") (optional)' },
            labels: { type: 'string', description: 'Comma-separated labels (e.g., "frontend,urgent") (optional)' },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_delete_issue',
        description: 'Delete a Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key to delete (e.g., "PROJ-123")' },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_transition_issue',
        description: 'Change the status of a Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
            transitionName: { type: 'string', description: 'Transition name (e.g., "Done", "In Progress")' },
          },
          required: ['issueKey', 'transitionName'],
        },
      },
      {
        name: 'jira_get_transitions',
        description: 'Get available transitions for an issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_clone_issue',
        description: 'Clone an existing issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key to clone (e.g., "PROJ-123")' },
            summary: { type: 'string', description: 'New summary (optional, defaults to "[Clone] original summary")' },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_assign_to_me',
        description: 'Assign an issue to the current user',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_get_my_issues',
        description: 'Get issues assigned to the current user',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status (e.g., "In Progress", "To Do") (optional)' },
            maxResults: { type: 'number', description: 'Maximum number of results (default: 50)' },
          },
          required: [],
        },
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult | null> {
    switch (name) {
      case 'jira_search': return await this.search(args);
      case 'jira_get_issue': return await this.getIssue(args);
      case 'jira_create_issue': return await this.createIssue(args);
      case 'jira_update_issue': return await this.updateIssue(args);
      case 'jira_delete_issue': return await this.deleteIssue(args);
      case 'jira_transition_issue': return await this.transitionIssue(args);
      case 'jira_get_transitions': return await this.getTransitions(args);
      case 'jira_clone_issue': return await this.cloneIssue(args);
      case 'jira_assign_to_me': return await this.assignToMe(args);
      case 'jira_get_my_issues': return await this.getMyIssues(args);
      default: return null;
    }
  }

  private async search(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      jql: z.string(),
      maxResults: z.number().optional().default(50),
    });
    const { jql, maxResults } = schema.parse(args);

    const result = await this.jiraService.search(jql, maxResults);

    const issues = result.issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      assignee: issue.fields.assignee?.displayName,
      priority: issue.fields.priority?.name,
    }));

    return ToolResultUtil.textResult(JSON.stringify({ count: issues.length, issues }, null, 2));
  }

  private async getIssue(args: unknown): Promise<ToolResult> {
    const schema = z.object({ issueKey: z.string() });
    const { issueKey } = schema.parse(args);

    const issue = await this.jiraService.getIssue(issueKey, 'renderedFields');

    return ToolResultUtil.textResult(JSON.stringify({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      assignee: issue.fields.assignee?.displayName,
      reporter: issue.fields.reporter?.displayName,
      priority: issue.fields.priority?.name,
      description: issue.fields.description,
      created: issue.fields.created,
      updated: issue.fields.updated,
    }, null, 2));
  }

  private async createIssue(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      projectKey: z.string(),
      summary: z.string(),
      issueType: z.string(),
      description: z.string().optional(),
      assignee: z.string().optional(),
      priority: z.string().optional(),
      labels: z.string().optional(),
    });
    const { projectKey, summary, issueType, description, assignee, priority, labels } = schema.parse(args);

    const fields: Record<string, unknown> = {
      project: { key: projectKey },
      summary,
      issuetype: { name: issueType },
    };

    if (description) {
      fields.description = JiraFieldUtil.createAdfDocument(description);
    }

    if (assignee) {
      const accountId = await this.resolveAccountId(assignee);
      fields.assignee = { id: accountId };
    }

    if (priority) {
      fields.priority = { name: priority };
    }

    if (labels) {
      fields.labels = JiraFieldUtil.parseLabels(labels);
    }

    const issue = await this.jiraService.createIssue(fields);
    return ToolResultUtil.textResult(`Issue created: ${issue.key}`);
  }

  private async updateIssue(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
      summary: z.string().optional(),
      description: z.string().optional(),
      assignee: z.string().optional(),
      priority: z.string().optional(),
      labels: z.string().optional(),
    });
    const { issueKey, summary, description, assignee, priority, labels } = schema.parse(args);

    const fields: Record<string, unknown> = {};
    if (summary) fields.summary = summary;
    if (description) {
      fields.description = JiraFieldUtil.createAdfDocument(description);
    }

    if (assignee) {
      const accountId = await this.resolveAccountId(assignee);
      fields.assignee = { id: accountId };
    }

    if (priority) {
      fields.priority = { name: priority };
    }

    if (labels) {
      fields.labels = JiraFieldUtil.parseLabels(labels);
    }

    await this.jiraService.updateIssue(issueKey, fields);
    return ToolResultUtil.textResult(`Issue ${issueKey} updated successfully`);
  }

  private async deleteIssue(args: unknown): Promise<ToolResult> {
    const schema = z.object({ issueKey: z.string() });
    const { issueKey } = schema.parse(args);

    await this.jiraService.deleteIssue(issueKey);
    return ToolResultUtil.textResult(`Issue ${issueKey} deleted successfully`);
  }

  private async transitionIssue(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
      transitionName: z.string(),
    });
    const { issueKey, transitionName } = schema.parse(args);

    const { transitions } = await this.jiraService.getTransitions(issueKey);
    const transition = transitions.find(
      (t) => t.name.toLowerCase() === transitionName.toLowerCase(),
    );

    if (!transition) {
      const available = transitions.map((t) => t.name).join(', ');
      return ToolResultUtil.errorResult(`Transition "${transitionName}" not found. Available: ${available}`);
    }

    await this.jiraService.transitionIssue(issueKey, transition.id);
    return ToolResultUtil.textResult(`Issue ${issueKey} transitioned to "${transitionName}"`);
  }

  private async getTransitions(args: unknown): Promise<ToolResult> {
    const schema = z.object({ issueKey: z.string() });
    const { issueKey } = schema.parse(args);

    const result = await this.jiraService.getTransitions(issueKey);
    const transitions = result.transitions.map((t) => ({
      id: t.id,
      name: t.name,
    }));
    return ToolResultUtil.textResult(JSON.stringify({ transitions }, null, 2));
  }

  private async cloneIssue(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
      summary: z.string().optional(),
    });
    const { issueKey, summary } = schema.parse(args);

    const original = await this.jiraService.getIssue(issueKey);

    const newSummary = summary || `[Clone] ${original.fields.summary}`;

    const fields: Record<string, unknown> = {
      project: original.fields.project,
      summary: newSummary,
      issuetype: original.fields.issuetype,
      description: original.fields.description,
      priority: original.fields.priority,
    };

    const newIssue = await this.jiraService.createIssue(fields);
    return ToolResultUtil.textResult(`Cloned ${issueKey} -> ${newIssue.key}`);
  }

  private async assignToMe(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
    });
    const { issueKey } = schema.parse(args);

    const currentUser = await this.jiraService.getCurrentUser();
    await this.jiraService.updateIssue(issueKey, {
      assignee: { id: currentUser.accountId },
    });

    return ToolResultUtil.textResult(`Assigned ${issueKey} to ${currentUser.displayName}`);
  }

  private async getMyIssues(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      status: z.string().optional(),
      maxResults: z.number().optional().default(50),
    });
    const { status, maxResults } = schema.parse(args);

    let jql = 'assignee = currentUser()';
    if (status) {
      jql += ` AND status = "${escapeJqlString(status)}"`;
    }
    jql += ' ORDER BY updated DESC';

    const result = await this.jiraService.search(jql, maxResults);
    const issues = result.issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      priority: issue.fields.priority?.name,
    }));

    return ToolResultUtil.textResult(JSON.stringify({ count: issues.length, issues }, null, 2));
  }

  private async resolveAccountId(assignee: string): Promise<string> {
    if (assignee.includes('@')) {
      const users = await this.jiraService.searchUsers(assignee);
      if (users.length === 0) {
        throw new JiraApiError(
          JiraApiError.fromStatusCode(404),
          `User not found: ${assignee}`,
        );
      }
      return users[0].accountId;
    }
    return assignee;
  }
}

export function escapeJqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
