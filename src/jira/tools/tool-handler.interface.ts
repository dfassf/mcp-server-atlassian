import { Tool, ToolResult } from '../../types/mcp.types';

export interface ToolHandler {
  getTools(): Tool[];
  executeTool(name: string, args: unknown): Promise<ToolResult | null>;
}
