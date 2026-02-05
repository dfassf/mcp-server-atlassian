/**
 * Jira 필드 관련 유틸리티 함수
 */
export class JiraFieldUtil {
  /**
   * 텍스트를 ADF (Atlassian Document Format) 형식으로 변환
   */
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

  /**
   * 쉼표로 구분된 labels 문자열을 배열로 변환
   */
  static parseLabels(labels: string): string[] {
    return labels.split(',').map((l) => l.trim()).filter((l) => l.length > 0);
  }
}
