import { ToolResult } from '../../types/mcp.types';

export class ToolResultUtil {
  static textResult(text: string): ToolResult {
    return { content: [{ type: 'text', text }] };
  }

  static errorResult(message: string): ToolResult {
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
}
