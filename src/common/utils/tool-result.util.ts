import { ToolResult } from '../../types/mcp.types';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export class ToolResultUtil {
  static textResult(text: string): ToolResult {
    return { content: [{ type: 'text', text }] };
  }

  static errorResult(message: string): ToolResult {
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }

  static toCallToolResult(toolResult: ToolResult): CallToolResult {
    return {
      content: toolResult.content.map((item) => {
        if (item.type === 'text') {
          return { type: 'text' as const, text: item.text || '' };
        } else if (item.type === 'image') {
          return {
            type: 'image' as const,
            data: item.data || '',
            mimeType: item.mimeType || 'image/png',
          };
        } else {
          return { type: 'text' as const, text: '' };
        }
      }),
      isError: toolResult.isError,
    } as CallToolResult;
  }
}
