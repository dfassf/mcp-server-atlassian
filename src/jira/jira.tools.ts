import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { JiraService } from './jira.service';
import { Tool, ToolResult } from '../types/mcp.types';
import { JiraComment } from '../types/jira.types';
import { ToolResultUtil } from '../common/utils/tool-result.util';
import { JiraFieldUtil } from '../common/utils/jira-field.util';

@Injectable()
export class JiraToolsService {
  constructor(private jiraService: JiraService) {}

  getTools(): Tool[] {
    return [
      {
        name: 'jira_search',
        description: 'Search Jira issues using JQL (Jira Query Language)',
        inputSchema: {
          type: 'object',
          properties: {
            jql: {
              type: 'string',
              description: 'JQL query string (e.g., "project = DEV AND status = Open")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results (default: 50)',
            },
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
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., "PROJ-123")',
            },
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
            projectKey: {
              type: 'string',
              description: 'Project key (e.g., "DEV")',
            },
            summary: {
              type: 'string',
              description: 'Issue summary/title',
            },
            issueType: {
              type: 'string',
              description: 'Issue type (e.g., "Bug", "Task", "Story")',
            },
            description: {
              type: 'string',
              description: 'Issue description (optional)',
            },
            assignee: {
              type: 'string',
              description: 'Assignee account ID or email (optional)',
            },
            priority: {
              type: 'string',
              description: 'Priority name (e.g., "High", "Medium", "Low") (optional)',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated labels (e.g., "frontend,urgent") (optional)',
            },
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
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., "PROJ-123")',
            },
            summary: {
              type: 'string',
              description: 'New summary (optional)',
            },
            description: {
              type: 'string',
              description: 'New description (optional)',
            },
            assignee: {
              type: 'string',
              description: 'Assignee account ID or email (optional)',
            },
            priority: {
              type: 'string',
              description: 'Priority name (e.g., "High", "Medium", "Low") (optional)',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated labels (e.g., "frontend,urgent") (optional)',
            },
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
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., "PROJ-123")',
            },
            transitionName: {
              type: 'string',
              description: 'Transition name (e.g., "Done", "In Progress")',
            },
          },
          required: ['issueKey', 'transitionName'],
        },
      },
      {
        name: 'jira_add_comment',
        description: 'Add a comment to a Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., "PROJ-123")',
            },
            body: {
              type: 'string',
              description: 'Comment text',
            },
          },
          required: ['issueKey', 'body'],
        },
      },
      {
        name: 'jira_create_issue_link',
        description: 'Link two Jira issues (e.g., parent/child, blocks, relates to)',
        inputSchema: {
          type: 'object',
          properties: {
            inwardIssueKey: {
              type: 'string',
              description: 'Inward issue key (e.g., "PROJ-123" - the child/blocked issue)',
            },
            outwardIssueKey: {
              type: 'string',
              description: 'Outward issue key (e.g., "PROJ-456" - the parent/blocking issue)',
            },
            linkType: {
              type: 'string',
              description: 'Link type name (e.g., "is child of", "blocks", "relates to")',
            },
          },
          required: ['inwardIssueKey', 'outwardIssueKey', 'linkType'],
        },
      },
      {
        name: 'jira_get_link_types',
        description: 'Get all available issue link types (e.g., Blocks, Relates, Duplicate)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
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
        name: 'jira_delete_issue',
        description: 'Delete a Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'Issue key to delete (e.g., "PROJ-123")',
            },
          },
          required: ['issueKey'],
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
        name: 'jira_get_comments',
        description: 'Get all comments from an issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., "PROJ-123")',
            },
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
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., "PROJ-123")',
            },
            commentId: {
              type: 'string',
              description: 'Comment ID to delete',
            },
          },
          required: ['issueKey', 'commentId'],
        },
      },
      {
        name: 'jira_get_transitions',
        description: 'Get available transitions for an issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'Issue key (e.g., "PROJ-123")',
            },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_remove_issue_link',
        description: 'Remove a link between two issues',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'Issue key to get links from (e.g., "PROJ-123")',
            },
            targetIssueKey: {
              type: 'string',
              description: 'Target issue key to unlink (e.g., "PROJ-456")',
            },
            linkType: {
              type: 'string',
              description: 'Link type name (e.g., "Blocks", "Relates") (optional - if not specified, removes all links to target)',
            },
          },
          required: ['issueKey', 'targetIssueKey'],
        },
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult> {
    try {
      switch (name) {
        case 'jira_search':
          return await this.search(args);
        case 'jira_get_issue':
          return await this.getIssue(args);
        case 'jira_create_issue':
          return await this.createIssue(args);
        case 'jira_update_issue':
          return await this.updateIssue(args);
        case 'jira_transition_issue':
          return await this.transitionIssue(args);
        case 'jira_add_comment':
          return await this.addComment(args);
        case 'jira_create_issue_link':
          return await this.linkIssues(args);
        case 'jira_get_link_types':
          return await this.getLinkTypes();
        case 'jira_get_all_projects':
          return await this.getAllProjects();
        case 'jira_delete_issue':
          return await this.deleteIssue(args);
        case 'jira_get_statuses':
          return await this.getStatuses();
        case 'jira_get_issue_types':
          return await this.getIssueTypes();
        case 'jira_get_priorities':
          return await this.getPriorities();
        case 'jira_get_comments':
          return await this.getComments(args);
        case 'jira_delete_comment':
          return await this.deleteComment(args);
        case 'jira_get_transitions':
          return await this.getTransitions(args);
        case 'jira_remove_issue_link':
          return await this.removeIssueLink(args);
        default:
          return ToolResultUtil.errorResult(`Unknown Jira tool: ${name}`);
      }
    } catch (error) {
      return ToolResultUtil.errorResult(error instanceof Error ? error.message : String(error));
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
      fields.description = {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
      };
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

  private async addComment(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
      body: z.string(),
    });
    const { issueKey, body } = schema.parse(args);

    await this.jiraService.addComment(issueKey, body);
    return ToolResultUtil.textResult(`Comment added to ${issueKey}`);
  }

  private async linkIssues(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      inwardIssueKey: z.string(),
      outwardIssueKey: z.string(),
      linkType: z.string(),
    });
    const { inwardIssueKey, outwardIssueKey, linkType } = schema.parse(args);

    await this.jiraService.linkIssues(inwardIssueKey, outwardIssueKey, linkType);
    return ToolResultUtil.textResult(`Linked ${inwardIssueKey} -> ${outwardIssueKey} (${linkType})`);
  }

  private async getLinkTypes(): Promise<ToolResult> {
    const result = await this.jiraService.getLinkTypes();
    const linkTypes = result.issueLinkTypes.map((lt) => ({
      id: lt.id,
      name: lt.name,
      inward: lt.inward,
      outward: lt.outward,
    }));
    return ToolResultUtil.textResult(JSON.stringify({ linkTypes }, null, 2));
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

  private async deleteIssue(args: unknown): Promise<ToolResult> {
    const schema = z.object({ issueKey: z.string() });
    const { issueKey } = schema.parse(args);

    await this.jiraService.deleteIssue(issueKey);
    return ToolResultUtil.textResult(`Issue ${issueKey} deleted successfully`);
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

  private async removeIssueLink(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      issueKey: z.string(),
      targetIssueKey: z.string(),
      linkType: z.string().optional(),
    });
    const { issueKey, targetIssueKey, linkType } = schema.parse(args);

    const links = await this.jiraService.getIssueLinks(issueKey);

    const matchingLinks = links.filter((link) => {
      const isTargetMatch =
        link.inwardIssue?.key === targetIssueKey ||
        link.outwardIssue?.key === targetIssueKey;
      if (!isTargetMatch) return false;
      if (linkType) {
        return link.type.name.toLowerCase() === linkType.toLowerCase();
      }
      return true;
    });

    if (matchingLinks.length === 0) {
      return ToolResultUtil.errorResult(
        `No link found between ${issueKey} and ${targetIssueKey}${linkType ? ` with type "${linkType}"` : ''}`,
      );
    }

    for (const link of matchingLinks) {
      await this.jiraService.removeIssueLink(link.id);
    }

    return ToolResultUtil.textResult(
      `Removed ${matchingLinks.length} link(s) between ${issueKey} and ${targetIssueKey}`,
    );
  }

  private async resolveAccountId(assignee: string): Promise<string> {
    if (assignee.includes('@')) {
      const users = await this.jiraService.searchUsers(assignee);
      if (users.length === 0) {
        throw new Error(`User not found: ${assignee}`);
      }
      return users[0].accountId;
    }
    return assignee;
  }

}
