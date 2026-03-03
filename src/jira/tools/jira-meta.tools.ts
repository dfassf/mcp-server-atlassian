import { z } from 'zod';
import { JiraService } from '../jira.service';
import { Tool, ToolResult } from '../../types/mcp.types';
import { ToolResultUtil } from '../../common/utils/tool-result.util';
import { JiraFieldUtil } from '../../common/utils/jira-field.util';
import { ToolHandler } from './tool-handler.interface';
import { escapeJqlString } from './jira-issue.tools';

export class JiraMetaToolHandler implements ToolHandler {
  constructor(private jiraService: JiraService) {}

  getTools(): Tool[] {
    return [
      {
        name: 'jira_get_all_projects',
        description: 'Get all Jira projects',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'jira_get_statuses',
        description: 'Get all available statuses',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'jira_get_issue_types',
        description: 'Get all available issue types',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'jira_get_priorities',
        description: 'Get all available priorities',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'jira_get_project_summary',
        description: 'Get project summary with issue counts by status',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'Project key (e.g., "DEV")' },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'jira_bulk_create_issues',
        description: 'Create multiple Jira issues at once (max 50 per request). More efficient than creating issues one by one.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'Project key (e.g., "DEV")' },
            issues: { type: 'string', description: 'JSON array of issues. Each issue: { "summary": "string", "issueType": "string", "description"?: "string", "labels"?: "string", "priority"?: "string" }' },
          },
          required: ['projectKey', 'issues'],
        },
      },
      {
        name: 'jira_add_attachment',
        description: 'Add an attachment to a Jira issue (base64 encoded)',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., "PROJ-123")' },
            filename: { type: 'string', description: 'Filename for the attachment (e.g., "report.pdf")' },
            base64Content: { type: 'string', description: 'Base64-encoded file content' },
          },
          required: ['issueKey', 'filename', 'base64Content'],
        },
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult | null> {
    switch (name) {
      case 'jira_get_all_projects': return await this.getAllProjects();
      case 'jira_get_statuses': return await this.getStatuses();
      case 'jira_get_issue_types': return await this.getIssueTypes();
      case 'jira_get_priorities': return await this.getPriorities();
      case 'jira_get_project_summary': return await this.getProjectSummary(args);
      case 'jira_bulk_create_issues': return await this.bulkCreateIssues(args);
      case 'jira_add_attachment': return await this.addAttachment(args);
      default: return null;
    }
  }

  private async getAllProjects(): Promise<ToolResult> {
    const projects = await this.jiraService.getProjects();
    const result = projects.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
    }));
    return ToolResultUtil.textResult(JSON.stringify({ projects: result }, null, 2));
  }

  private async getStatuses(): Promise<ToolResult> {
    const statuses = await this.jiraService.getStatuses();
    const result = statuses.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.statusCategory?.name,
    }));
    return ToolResultUtil.textResult(JSON.stringify({ statuses: result }, null, 2));
  }

  private async getIssueTypes(): Promise<ToolResult> {
    const issueTypes = await this.jiraService.getIssueTypes();
    const result = issueTypes.map((t) => ({
      id: t.id,
      name: t.name,
      subtask: t.subtask,
    }));
    return ToolResultUtil.textResult(JSON.stringify({ issueTypes: result }, null, 2));
  }

  private async getPriorities(): Promise<ToolResult> {
    const priorities = await this.jiraService.getPriorities();
    const result = priorities.map((p) => ({
      id: p.id,
      name: p.name,
    }));
    return ToolResultUtil.textResult(JSON.stringify({ priorities: result }, null, 2));
  }

  private async getProjectSummary(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      projectKey: z.string(),
    });
    const { projectKey } = schema.parse(args);

    if (!isValidProjectKey(projectKey)) {
      return ToolResultUtil.errorResult(`Invalid project key format: ${projectKey}`);
    }

    const statuses = ['해야 할 일', '진행 중', '완료'];
    const summary: Record<string, number> = {};
    let total = 0;

    for (const status of statuses) {
      const result = await this.jiraService.search(
        `project = ${projectKey} AND status = "${escapeJqlString(status)}"`,
        0,
      );
      summary[status] = result.issues.length;
      total += result.issues.length;
    }

    const allResult = await this.jiraService.search(`project = ${projectKey}`, 0);

    return ToolResultUtil.textResult(
      JSON.stringify(
        {
          projectKey,
          total: allResult.issues.length,
          byStatus: summary,
        },
        null,
        2,
      ),
    );
  }

  private async bulkCreateIssues(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      projectKey: z.string(),
      issues: z.string(),
    });
    const { projectKey, issues: issuesJson } = schema.parse(args);

    let issues: {
      summary: string;
      issueType: string;
      description?: string;
      labels?: string;
      priority?: string;
    }[];

    try {
      issues = JSON.parse(issuesJson);
    } catch {
      return ToolResultUtil.errorResult('Invalid JSON format for issues');
    }

    if (!Array.isArray(issues) || issues.length === 0) {
      return ToolResultUtil.errorResult('Issues must be a non-empty array');
    }

    if (issues.length > 50) {
      return ToolResultUtil.errorResult('Maximum 50 issues per request');
    }

    const issueUpdates = issues.map((issue) => {
      const fields: Record<string, unknown> = {
        project: { key: projectKey },
        summary: issue.summary,
        issuetype: { name: issue.issueType },
      };

      if (issue.description) {
        fields.description = JiraFieldUtil.createAdfDocument(issue.description);
      }

      if (issue.priority) {
        fields.priority = { name: issue.priority };
      }

      if (issue.labels) {
        fields.labels = JiraFieldUtil.parseLabels(issue.labels);
      }

      return { fields };
    });

    const result = await this.jiraService.bulkCreateIssues(issueUpdates);

    const createdKeys = result.issues?.map((i) => i.key) || [];
    const errorCount = result.errors?.length || 0;

    return ToolResultUtil.textResult(
      JSON.stringify(
        {
          created: createdKeys.length,
          createdIssues: createdKeys,
          errors: errorCount,
          errorDetails: result.errors,
        },
        null,
        2,
      ),
    );
  }

  private async addAttachment(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
      filename: z.string(),
      base64Content: z.string(),
    });
    const { issueKey, filename, base64Content } = schema.parse(args);

    await this.jiraService.addAttachment(issueKey, filename, base64Content);
    return ToolResultUtil.textResult(`Attachment "${filename}" added to ${issueKey}`);
  }
}

function isValidProjectKey(key: string): boolean {
  return /^[A-Z][A-Z0-9_]+$/i.test(key);
}
