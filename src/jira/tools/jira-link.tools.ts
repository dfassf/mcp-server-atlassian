import { z } from 'zod';
import { JiraService } from '../jira.service';
import { Tool, ToolResult } from '../../types/mcp.types';
import { ToolResultUtil } from '../../common/utils/tool-result.util';
import { ToolHandler } from './tool-handler.interface';

export class JiraLinkToolHandler implements ToolHandler {
  constructor(private jiraService: JiraService) {}

  getTools(): Tool[] {
    return [
      {
        name: 'jira_create_issue_link',
        description: 'Link two Jira issues (e.g., parent/child, blocks, relates to)',
        inputSchema: {
          type: 'object',
          properties: {
            inwardIssueKey: { type: 'string', description: 'Inward issue key (e.g., "PROJ-123" - the child/blocked issue)' },
            outwardIssueKey: { type: 'string', description: 'Outward issue key (e.g., "PROJ-456" - the parent/blocking issue)' },
            linkType: { type: 'string', description: 'Link type name (e.g., "is child of", "blocks", "relates to")' },
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
        name: 'jira_remove_issue_link',
        description: 'Remove a link between two issues',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key to get links from (e.g., "PROJ-123")' },
            targetIssueKey: { type: 'string', description: 'Target issue key to unlink (e.g., "PROJ-456")' },
            linkType: { type: 'string', description: 'Link type name (e.g., "Blocks", "Relates") (optional - if not specified, removes all links to target)' },
          },
          required: ['issueKey', 'targetIssueKey'],
        },
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult | null> {
    switch (name) {
      case 'jira_create_issue_link': return await this.linkIssues(args);
      case 'jira_get_link_types': return await this.getLinkTypes();
      case 'jira_remove_issue_link': return await this.removeIssueLink(args);
      default: return null;
    }
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

    await Promise.all(
      matchingLinks.map((link) => this.jiraService.removeIssueLink(link.id)),
    );

    return ToolResultUtil.textResult(
      `Removed ${matchingLinks.length} link(s) between ${issueKey} and ${targetIssueKey}`,
    );
  }
}
