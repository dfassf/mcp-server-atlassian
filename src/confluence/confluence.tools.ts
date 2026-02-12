import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ConfluenceService } from './confluence.service';
import { Tool, ToolResult } from '../types/mcp.types';
import { ToolResultUtil } from '../common/utils/tool-result.util';
import { ConfluenceApiError } from '../common/errors/atlassian-api.error';

@Injectable()
export class ConfluenceToolsService {
  constructor(private confluenceService: ConfluenceService) {}

  getTools(): Tool[] {
    return [
      {
        name: 'confluence_search',
        description: 'Search Confluence pages using CQL (Confluence Query Language)',
        inputSchema: {
          type: 'object',
          properties: {
            cql: {
              type: 'string',
              description: 'CQL query string (e.g., "space = DEV AND type = page")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 25)',
            },
          },
          required: ['cql'],
        },
      },
      {
        name: 'confluence_get_page',
        description: 'Get detailed information about a specific Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'Page ID',
            },
          },
          required: ['pageId'],
        },
      },
      {
        name: 'confluence_create_page',
        description: 'Create a new Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            spaceKey: {
              type: 'string',
              description: 'Space key (e.g., "DEV")',
            },
            title: {
              type: 'string',
              description: 'Page title',
            },
            content: {
              type: 'string',
              description: 'Page content (HTML or storage format)',
            },
            parentId: {
              type: 'string',
              description: 'Parent page ID (optional)',
            },
          },
          required: ['spaceKey', 'title', 'content'],
        },
      },
      {
        name: 'confluence_update_page',
        description: 'Update an existing Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'Page ID',
            },
            title: {
              type: 'string',
              description: 'New page title',
            },
            content: {
              type: 'string',
              description: 'New page content',
            },
          },
          required: ['pageId', 'title', 'content'],
        },
      },
      {
        name: 'confluence_delete_page',
        description: 'Delete a Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'Page ID to delete',
            },
          },
          required: ['pageId'],
        },
      },
      {
        name: 'confluence_get_comments',
        description: 'Get all comments from a Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'Page ID',
            },
          },
          required: ['pageId'],
        },
      },
      {
        name: 'confluence_create_space',
        description: 'Create a new Confluence space',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Space key (e.g., "AIBIO") - uppercase, no spaces',
            },
            name: {
              type: 'string',
              description: 'Space name (e.g., "AIBIO Project")',
            },
            description: {
              type: 'string',
              description: 'Space description (optional)',
            },
          },
          required: ['key', 'name'],
        },
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult> {
    try {
      switch (name) {
        case 'confluence_search':
          return await this.search(args);
        case 'confluence_get_page':
          return await this.getPage(args);
        case 'confluence_create_page':
          return await this.createPage(args);
        case 'confluence_update_page':
          return await this.updatePage(args);
        case 'confluence_delete_page':
          return await this.deletePage(args);
        case 'confluence_get_comments':
          return await this.getComments(args);
        case 'confluence_create_space':
          return await this.createSpace(args);
        default:
          return ToolResultUtil.errorResult(`Unknown Confluence tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof ConfluenceApiError) {
        return ToolResultUtil.errorResult(
          `${error.message} (Code: ${error.code}${error.statusCode ? `, Status: ${error.statusCode}` : ''})`,
        );
      }
      return ToolResultUtil.errorResult(error instanceof Error ? error.message : String(error));
    }
  }

  private async search(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      cql: z.string(),
      limit: z.number().optional().default(25),
    });
    const { cql, limit } = schema.parse(args);

    const result = await this.confluenceService.search(cql, limit);

    const pages = result.results.map((page) => ({
      id: page.id,
      title: page.title,
      type: page.type,
      spaceKey: page.space?.key,
    }));

    return ToolResultUtil.textResult(JSON.stringify({ total: result.size, pages }, null, 2));
  }

  private async getPage(args: unknown): Promise<ToolResult> {
    const schema = z.object({ pageId: z.string() });
    const { pageId } = schema.parse(args);

    const page = await this.confluenceService.getPage(pageId);

    return ToolResultUtil.textResult(JSON.stringify({
      id: page.id,
      title: page.title,
      spaceKey: page.space?.key,
      version: page.version?.number,
      content: page.body?.storage?.value,
    }, null, 2));
  }

  private async createPage(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      spaceKey: z.string(),
      title: z.string(),
      content: z.string(),
      parentId: z.string().optional(),
    });
    const { spaceKey, title, content, parentId } = schema.parse(args);

    const page = await this.confluenceService.createPage(spaceKey, title, content, parentId);
    return ToolResultUtil.textResult(`Page created: ${page.title} (ID: ${page.id})`);
  }

  /** 페이지 수정 (409 Conflict 시 1회 재시도) */
  private async updatePage(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      pageId: z.string(),
      title: z.string(),
      content: z.string(),
    });
    const { pageId, title, content } = schema.parse(args);

    const currentPage = await this.confluenceService.getPage(pageId);
    const currentVersion = currentPage.version?.number || 1;

    try {
      await this.confluenceService.updatePage(pageId, title, content, currentVersion);
      return ToolResultUtil.textResult(`Page ${pageId} updated successfully`);
    } catch (error) {
      const isVersionConflict =
        error instanceof Error &&
        'statusCode' in error &&
        (error as { statusCode?: number }).statusCode === 409;
      if (!isVersionConflict) throw error;
    }

    // 409 Conflict → 최신 버전으로 재시도
    const retryPage = await this.confluenceService.getPage(pageId);
    const retryVersion = retryPage.version?.number || 1;
    await this.confluenceService.updatePage(pageId, title, content, retryVersion);
    return ToolResultUtil.textResult(`Page ${pageId} updated successfully`);
  }

  private async deletePage(args: unknown): Promise<ToolResult> {
    const schema = z.object({ pageId: z.string() });
    const { pageId } = schema.parse(args);

    await this.confluenceService.deletePage(pageId);
    return ToolResultUtil.textResult(`Page ${pageId} deleted successfully`);
  }

  private async getComments(args: unknown): Promise<ToolResult> {
    const schema = z.object({ pageId: z.string() });
    const { pageId } = schema.parse(args);

    const result = await this.confluenceService.getComments(pageId);
    const comments = result.results.map((c) => ({
      id: c.id,
      author: c.version?.by?.displayName,
      body: c.body?.storage?.value,
      created: c.version?.when,
    }));
    return ToolResultUtil.textResult(JSON.stringify({ comments }, null, 2));
  }

  private async createSpace(args: unknown): Promise<ToolResult> {
    const schema = z.object({
      key: z.string(),
      name: z.string(),
      description: z.string().optional(),
    });
    const { key, name, description } = schema.parse(args);

    const space = await this.confluenceService.createSpace(key, name, description);
    return ToolResultUtil.textResult(`Space created: ${space.name} (Key: ${space.key})`);
  }

}
