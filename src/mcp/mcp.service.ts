import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JiraToolsService } from '../jira/jira.tools';
import { ConfluenceToolsService } from '../confluence/confluence.tools';
import { SchemaConverter, JsonSchema } from '../common/utils/schema-converter.util';
import { ToolResultUtil } from '../common/utils/tool-result.util';
import { LoggerService } from '../common/logger/logger.service';
import { Tool, ToolResult } from '../types/mcp.types';

interface ToolsService {
  getTools(): Tool[];
  executeTool(name: string, args: unknown): Promise<ToolResult>;
}

@Injectable()
export class McpService implements OnModuleInit {
  private server: McpServer;
  private jiraTools: JiraToolsService;
  private confluenceTools: ConfluenceToolsService;
  private logger: LoggerService;

  constructor(private moduleRef: ModuleRef) {
    this.logger = new LoggerService();
    this.logger.setContext('McpService');
  }

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
    this.logger.log('MCP server connected successfully');
  }

  private registerTools() {
    this.registerToolService('Jira', this.jiraTools);
    this.registerToolService('Confluence', this.confluenceTools);
  }

  private registerToolService(serviceName: string, toolsService: ToolsService) {
    const tools = toolsService.getTools();
    this.logger.log(`Registering ${tools.length} ${serviceName} tools`);

    for (const tool of tools) {
      try {
        const zodSchema = SchemaConverter.jsonSchemaToZod(tool.inputSchema as JsonSchema);
        this.server.registerTool(tool.name, {
          description: tool.description,
          inputSchema: zodSchema,
        }, async (args) => {
          try {
            const toolResult = await toolsService.executeTool(tool.name, args);
            return ToolResultUtil.toCallToolResult(toolResult);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error executing ${serviceName} tool ${tool.name}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            return ToolResultUtil.toCallToolResult(
              ToolResultUtil.errorResult(`Failed to execute ${tool.name}: ${errorMessage}`)
            );
          }
        });
        this.logger.debug(`Registered ${serviceName} tool: ${tool.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to register ${serviceName} tool ${tool.name}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      }
    }
  }
}
