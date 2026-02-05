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

  async search(jql: string, maxResults = 50): Promise<JiraSearchResult> {
    return this.http.get<JiraSearchResult>('jira', '/rest/api/3/search/jql', {
      params: {
        jql,
        maxResults,
        fields: 'summary,status,assignee,priority,created,updated',
      },
    });
  }

  async getIssue(issueKey: string, expand?: string): Promise<JiraIssue> {
    const params: Record<string, string> = {};
    if (expand) params.expand = expand;

    return this.http.get<JiraIssue>('jira', `/rest/api/3/issue/${issueKey}`, { params });
  }

  async createIssue(fields: Record<string, unknown>): Promise<JiraIssue> {
    return this.http.post<JiraIssue>('jira', '/rest/api/3/issue', { fields });
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.http.put('jira', `/rest/api/3/issue/${issueKey}`, { fields });
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.http.post('jira', `/rest/api/3/issue/${issueKey}/transitions`, {
      transition: { id: transitionId },
    });
  }

  async getTransitions(issueKey: string): Promise<{ transitions: JiraTransition[] }> {
    return this.http.get('jira', `/rest/api/3/issue/${issueKey}/transitions`);
  }

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

  async getComments(issueKey: string): Promise<{ comments: JiraComment[] }> {
    return this.http.get('jira', `/rest/api/3/issue/${issueKey}/comment`);
  }

  async getProjects(): Promise<JiraProject[]> {
    return this.http.get<JiraProject[]>('jira', '/rest/api/3/project');
  }

  async getProject(projectKey: string): Promise<JiraProject> {
    return this.http.get<JiraProject>('jira', `/rest/api/3/project/${projectKey}`);
  }

  async searchUsers(query: string): Promise<{ accountId: string; displayName: string; emailAddress?: string }[]> {
    return this.http.get('jira', '/rest/api/3/user/search', {
      params: { query },
    });
  }

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

  async getLinkTypes(): Promise<{
    issueLinkTypes: { id: string; name: string; inward: string; outward: string }[];
  }> {
    return this.http.get('jira', '/rest/api/3/issueLinkType');
  }

  async deleteIssue(issueKey: string): Promise<void> {
    await this.http.delete('jira', `/rest/api/3/issue/${issueKey}`);
  }

  async getStatuses(): Promise<{ id: string; name: string; statusCategory: { name: string } }[]> {
    return this.http.get('jira', '/rest/api/3/status');
  }

  async getIssueTypes(): Promise<{ id: string; name: string; subtask: boolean }[]> {
    return this.http.get('jira', '/rest/api/3/issuetype');
  }

  async getPriorities(): Promise<{ id: string; name: string }[]> {
    return this.http.get('jira', '/rest/api/3/priority');
  }

  async deleteComment(issueKey: string, commentId: string): Promise<void> {
    await this.http.delete('jira', `/rest/api/3/issue/${issueKey}/comment/${commentId}`);
  }

  async removeIssueLink(linkId: string): Promise<void> {
    await this.http.delete('jira', `/rest/api/3/issueLink/${linkId}`);
  }

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
