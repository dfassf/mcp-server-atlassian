import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { JiraToolsService } from '../jira/jira.tools';
import { ConfluenceToolsService } from '../confluence/confluence.tools';

@Injectable()
export class McpService implements OnModuleInit {
  private server: Server;
  private jiraTools: JiraToolsService;
  private confluenceTools: ConfluenceToolsService;

  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    this.jiraTools = this.moduleRef.get(JiraToolsService, { strict: false });
    this.confluenceTools = this.moduleRef.get(ConfluenceToolsService, { strict: false });
  }

  async start() {
    this.server = new Server(
      {
        name: 'local-mcp-atlassian',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.registerHandlers();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  private registerHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        ...this.jiraTools.getTools(),
        ...this.confluenceTools.getTools(),
      ];
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: { params: { name: string; arguments?: unknown } }) => {
      const { name, arguments: args } = request.params;

      let result;

      if (name.startsWith('jira_')) {
        result = await this.jiraTools.executeTool(name, args);
      }
      else if (name.startsWith('confluence_')) {
        result = await this.confluenceTools.executeTool(name, args);
      }
      else {
        result = {
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }

      return result;
    });
  }
}
