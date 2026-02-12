import { Injectable } from '@nestjs/common';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import {
  JiraIssue,
  JiraIssueFields,
  JiraIssueLink,
  JiraSearchResult,
  JiraProject,
  JiraTransition,
  JiraComment,
} from '../types/jira.types';

@Injectable()
export class JiraService {
  constructor(private http: AtlassianHttpService) {}

  /** JQL로 이슈 검색 */
  async search(jql: string, maxResults = 50): Promise<JiraSearchResult> {
    return this.http.get<JiraSearchResult>('jira', '/rest/api/3/search/jql', {
      params: {
        jql,
        maxResults,
        fields: 'summary,status,assignee,priority,created,updated',
      },
    });
  }

  /** 이슈 상세 조회 */
  async getIssue(issueKey: string, expand?: string): Promise<JiraIssue> {
    const params: Record<string, string> = {};
    if (expand) params.expand = expand;

    return this.http.get<JiraIssue>('jira', `/rest/api/3/issue/${issueKey}`, { params });
  }

  /** 이슈 생성 */
  async createIssue(fields: Record<string, unknown>): Promise<JiraIssue> {
    return this.http.post<JiraIssue>('jira', '/rest/api/3/issue', { fields });
  }

  /** 이슈 수정 */
  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.http.put('jira', `/rest/api/3/issue/${issueKey}`, { fields });
  }

  /** 이슈 상태 변경 */
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.http.post('jira', `/rest/api/3/issue/${issueKey}/transitions`, {
      transition: { id: transitionId },
    });
  }

  /** 사용 가능한 전환 목록 조회 */
  async getTransitions(issueKey: string): Promise<{ transitions: JiraTransition[] }> {
    return this.http.get('jira', `/rest/api/3/issue/${issueKey}/transitions`);
  }

  /** 코멘트 추가 (ADF 형식) */
  async addComment(issueKey: string, body: string): Promise<JiraComment> {
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

  /** 코멘트 목록 조회 */
  async getComments(issueKey: string): Promise<{ comments: JiraComment[] }> {
    return this.http.get('jira', `/rest/api/3/issue/${issueKey}/comment`);
  }

  /** 프로젝트 목록 조회 */
  async getProjects(): Promise<JiraProject[]> {
    return this.http.get<JiraProject[]>('jira', '/rest/api/3/project');
  }

  /** 프로젝트 단건 조회 */
  async getProject(projectKey: string): Promise<JiraProject> {
    return this.http.get<JiraProject>('jira', `/rest/api/3/project/${projectKey}`);
  }

  /** 사용자 검색 */
  async searchUsers(query: string): Promise<{ accountId: string; displayName: string; emailAddress?: string }[]> {
    return this.http.get('jira', '/rest/api/3/user/search', {
      params: { query },
    });
  }

  /** 이슈 링크 생성 */
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

  /** 이슈 링크 타입 목록 조회 */
  async getLinkTypes(): Promise<{
    issueLinkTypes: { id: string; name: string; inward: string; outward: string }[];
  }> {
    return this.http.get('jira', '/rest/api/3/issueLinkType');
  }

  /** 이슈 삭제 */
  async deleteIssue(issueKey: string): Promise<void> {
    await this.http.delete('jira', `/rest/api/3/issue/${issueKey}`);
  }

  /** 상태 목록 조회 */
  async getStatuses(): Promise<{ id: string; name: string; statusCategory: { name: string } }[]> {
    return this.http.get('jira', '/rest/api/3/status');
  }

  /** 이슈 타입 목록 조회 */
  async getIssueTypes(): Promise<{ id: string; name: string; subtask: boolean }[]> {
    return this.http.get('jira', '/rest/api/3/issuetype');
  }

  /** 우선순위 목록 조회 */
  async getPriorities(): Promise<{ id: string; name: string }[]> {
    return this.http.get('jira', '/rest/api/3/priority');
  }

  /** 코멘트 삭제 */
  async deleteComment(issueKey: string, commentId: string): Promise<void> {
    await this.http.delete('jira', `/rest/api/3/issue/${issueKey}/comment/${commentId}`);
  }

  /** 이슈 링크 삭제 */
  async removeIssueLink(linkId: string): Promise<void> {
    await this.http.delete('jira', `/rest/api/3/issueLink/${linkId}`);
  }

  /** 이슈의 링크 목록 조회 */
  async getIssueLinks(issueKey: string): Promise<JiraIssueLink[]> {
    const issue = await this.http.get<JiraIssue & { fields: JiraIssueFields & { issuelinks?: JiraIssueLink[] } }>(
      'jira',
      `/rest/api/3/issue/${issueKey}`,
      { params: { fields: 'issuelinks' } },
    );
    return issue.fields.issuelinks || [];
  }

  /** 이슈 일괄 생성 (최대 50개) */
  async bulkCreateIssues(
    issueUpdates: { fields: Record<string, unknown> }[],
  ): Promise<{ issues: JiraIssue[]; errors: unknown[] }> {
    return this.http.post('jira', '/rest/api/3/issue/bulk', { issueUpdates });
  }

  /** 현재 사용자 조회 */
  async getCurrentUser(): Promise<{ accountId: string; displayName: string; emailAddress?: string }> {
    return this.http.get('jira', '/rest/api/3/myself');
  }

  /** 보드 목록 조회 */
  async getBoards(projectKeyOrId?: string): Promise<{ values: { id: number; name: string; type: string }[] }> {
    const params: Record<string, string> = {};
    if (projectKeyOrId) params.projectKeyOrId = projectKeyOrId;
    return this.http.get('jira', '/rest/agile/1.0/board', { params });
  }

  /** 스프린트 목록 조회 */
  async getSprints(boardId: number, state?: string): Promise<{ values: { id: number; name: string; state: string; startDate?: string; endDate?: string }[] }> {
    const params: Record<string, string> = {};
    if (state) params.state = state;
    return this.http.get('jira', `/rest/agile/1.0/board/${boardId}/sprint`, { params });
  }

  /** 스프린트 이슈 조회 */
  async getSprintIssues(sprintId: number): Promise<{ issues: JiraIssue[] }> {
    return this.http.get('jira', `/rest/agile/1.0/sprint/${sprintId}/issue`, {
      params: { fields: 'summary,status,assignee,priority,issuetype' },
    });
  }

  /** 이슈를 스프린트로 이동 */
  async moveIssuesToSprint(sprintId: number, issueKeys: string[]): Promise<void> {
    await this.http.post('jira', `/rest/agile/1.0/sprint/${sprintId}/issue`, {
      issues: issueKeys,
    });
  }

  /** 작업 로그 조회 */
  async getWorklogs(issueKey: string): Promise<{ worklogs: { id: string; author: { displayName: string }; timeSpent: string; started: string; comment?: unknown }[] }> {
    return this.http.get('jira', `/rest/api/3/issue/${issueKey}/worklog`);
  }

  /** 작업 시간 기록 */
  async addWorklog(issueKey: string, timeSpentSeconds: number, started: string, comment?: string): Promise<void> {
    const body: Record<string, unknown> = {
      timeSpentSeconds,
      started,
    };
    if (comment) {
      body.comment = {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }],
      };
    }
    await this.http.post('jira', `/rest/api/3/issue/${issueKey}/worklog`, body);
  }

  /** 첨부파일 추가 */
  async addAttachment(issueKey: string, filename: string, base64Content: string): Promise<void> {
    const buffer = Buffer.from(base64Content, 'base64');
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), filename);
    await this.http.post('jira', `/rest/api/3/issue/${issueKey}/attachments`, formData, {
      headers: { 'X-Atlassian-Token': 'no-check' },
    });
  }
}
