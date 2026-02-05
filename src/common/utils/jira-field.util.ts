export class JiraFieldUtil {
  static createAdfDocument(text: string): {
    type: 'doc';
    version: number;
    content: Array<{
      type: 'paragraph';
      content: Array<{ type: 'text'; text: string }>;
    }>;
  } {
    return {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: text }],
        },
      ],
    };
  }

  static parseLabels(labels: string): string[] {
    return labels.split(',').map((l) => l.trim()).filter((l) => l.length > 0);
  }
}
