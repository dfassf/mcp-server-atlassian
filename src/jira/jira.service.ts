import { Injectable } from '@nestjs/common';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import {
  JiraIssue,
  JiraIssueFields,
  JiraSearchResult,
  JiraProject,
  JiraTransition,
  JiraComment,
} from '../types/jira.types';

@Injectable()
export class JiraService {
  constructor(private http: AtlassianHttpService) {}

  /**
   * JQL로 이슈 검색
   */
  async search(jql: string, maxResults = 50): Promise<JiraSearchResult> {
    return this.http.get<JiraSearchResult>('jira', '/rest/api/3/search/jql', {
      params: {
        jql,
        maxResults,
        fields: 'summary,status,assignee,priority,created,updated',
      },
    });
  }

  /**
   * 이슈 상세 조회
   */
  async getIssue(issueKey: string, expand?: string): Promise<JiraIssue> {
    const params: Record<string, string> = {};
    if (expand) params.expand = expand;

    return this.http.get<JiraIssue>('jira', `/rest/api/3/issue/${issueKey}`, { params });
  }

  /**
   * 이슈 생성
   */
  async createIssue(fields: Record<string, unknown>): Promise<JiraIssue> {
    return this.http.post<JiraIssue>('jira', '/rest/api/3/issue', { fields });
  }

  /**
   * 이슈 수정
   */
  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.http.put('jira', `/rest/api/3/issue/${issueKey}`, { fields });
  }

  /**
   * 이슈 상태 변경 (트랜지션)
   */
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.http.post('jira', `/rest/api/3/issue/${issueKey}/transitions`, {
      transition: { id: transitionId },
    });
  }

  /**
   * 가능한 트랜지션 목록 조회
   */
  async getTransitions(issueKey: string): Promise<{ transitions: JiraTransition[] }> {
    return this.http.get('jira', `/rest/api/3/issue/${issueKey}/transitions`);
  }

  /**
   * 댓글 추가
   */
  async addComment(issueKey: string, body: string): Promise<JiraComment> {
    // ADF (Atlassian Document Format) 형식으로 변환
    const adfBody = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: body }],
        },
      ],
    };

    return this.http.post<JiraComment>('jira', `/rest/api/3/issue/${issueKey}/comment`, {
      body: adfBody,
    });
  }

  /**
   * 댓글 목록 조회
   */
  async getComments(issueKey: string): Promise<{ comments: JiraComment[] }> {
    return this.http.get('jira', `/rest/api/3/issue/${issueKey}/comment`);
  }

  /**
   * 프로젝트 목록 조회
   */
  async getProjects(): Promise<JiraProject[]> {
    return this.http.get<JiraProject[]>('jira', '/rest/api/3/project');
  }

  /**
   * 프로젝트 상세 조회
   */
  async getProject(projectKey: string): Promise<JiraProject> {
    return this.http.get<JiraProject>('jira', `/rest/api/3/project/${projectKey}`);
  }

  /**
   * 사용자 검색 (이메일 또는 이름으로)
   */
  async searchUsers(query: string): Promise<{ accountId: string; displayName: string; emailAddress?: string }[]> {
    return this.http.get('jira', '/rest/api/3/user/search', {
      params: { query },
    });
  }

  /**
   * 이슈 링크 생성 (상위/하위 작업 연결 등)
   */
  async linkIssues(
    inwardIssueKey: string,
    outwardIssueKey: string,
    linkType: string,
  ): Promise<void> {
    await this.http.post('jira', '/rest/api/3/issueLink', {
      type: { name: linkType },
      inwardIssue: { key: inwardIssueKey },
      outwardIssue: { key: outwardIssueKey },
    });
  }

  /**
   * 이슈 링크 타입 목록 조회
   */
  async getLinkTypes(): Promise<{
    issueLinkTypes: { id: string; name: string; inward: string; outward: string }[];
  }> {
    return this.http.get('jira', '/rest/api/3/issueLinkType');
  }

  /**
   * 이슈 삭제
   */
  async deleteIssue(issueKey: string): Promise<void> {
    await this.http.delete('jira', `/rest/api/3/issue/${issueKey}`);
  }

  /**
   * 상태 목록 조회
   */
  async getStatuses(): Promise<{ id: string; name: string; statusCategory: { name: string } }[]> {
    return this.http.get('jira', '/rest/api/3/status');
  }

  /**
   * 이슈 타입 목록 조회
   */
  async getIssueTypes(): Promise<{ id: string; name: string; subtask: boolean }[]> {
    return this.http.get('jira', '/rest/api/3/issuetype');
  }

  /**
   * 우선순위 목록 조회
   */
  async getPriorities(): Promise<{ id: string; name: string }[]> {
    return this.http.get('jira', '/rest/api/3/priority');
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(issueKey: string, commentId: string): Promise<void> {
    await this.http.delete('jira', `/rest/api/3/issue/${issueKey}/comment/${commentId}`);
  }

  /**
   * 이슈 링크 삭제
   */
  async removeIssueLink(linkId: string): Promise<void> {
    await this.http.delete('jira', `/rest/api/3/issueLink/${linkId}`);
  }

  /**
   * 이슈의 링크 목록 조회 (이슈 상세에서 issuelinks 필드)
   */
  async getIssueLinks(issueKey: string): Promise<{
    id: string;
    type: { name: string; inward: string; outward: string };
    inwardIssue?: { key: string };
    outwardIssue?: { key: string };
  }[]> {
    const issue = await this.http.get<JiraIssue & { fields: JiraIssueFields & { issuelinks?: Array<{
      id: string;
      type: { name: string; inward: string; outward: string };
      inwardIssue?: { key: string };
      outwardIssue?: { key: string };
    }> } }>('jira', `/rest/api/3/issue/${issueKey}`, {
      params: { fields: 'issuelinks' },
    });
    return issue.fields.issuelinks || [];
  }
}
