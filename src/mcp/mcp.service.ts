import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JiraToolsService } from '../jira/jira.tools';
import { ConfluenceToolsService } from '../confluence/confluence.tools';
import { SchemaConverter } from '../common/utils/schema-converter.util';
import { ToolResultUtil } from '../common/utils/tool-result.util';

@Injectable()
export class McpService implements OnModuleInit {
  private server: McpServer;
  private jiraTools: JiraToolsService;
  private confluenceTools: ConfluenceToolsService;

  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    this.jiraTools = this.moduleRef.get(JiraToolsService, { strict: false });
    this.confluenceTools = this.moduleRef.get(ConfluenceToolsService, { strict: false });
  }

  async start() {
    this.server = new McpServer(
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

    this.registerTools();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  private registerTools() {
    const jiraTools = this.jiraTools.getTools();
    for (const tool of jiraTools) {
      const zodSchema = SchemaConverter.jsonSchemaToZod(tool.inputSchema);
      this.server.registerTool(tool.name, {
        description: tool.description,
        inputSchema: zodSchema,
      }, async (args) => {
        const toolResult = await this.jiraTools.executeTool(tool.name, args);
        return ToolResultUtil.toCallToolResult(toolResult);
      });
    }

    const confluenceTools = this.confluenceTools.getTools();
    for (const tool of confluenceTools) {
      const zodSchema = SchemaConverter.jsonSchemaToZod(tool.inputSchema);
      this.server.registerTool(tool.name, {
        description: tool.description,
        inputSchema: zodSchema,
      }, async (args) => {
        const toolResult = await this.confluenceTools.executeTool(tool.name, args);
        return ToolResultUtil.toCallToolResult(toolResult);
      });
    }
  }
}
