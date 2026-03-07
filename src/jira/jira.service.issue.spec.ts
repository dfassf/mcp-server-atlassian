import { JiraService } from './jira.service';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import { createJiraTestModule } from './testing/jira-test.helper';

describe('JiraService - Issue CRUD', () => {
  let service: JiraService;
  let httpService: jest.Mocked<AtlassianHttpService>;

  beforeEach(async () => {
    ({ service, httpService } = await createJiraTestModule());
  });

  afterEach(() => jest.clearAllMocks());

  describe('search', () => {
    it('should search issues with JQL', async () => {
      const mockResult = {
        issues: [{ id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1', fields: { summary: 'Test issue', status: { id: '1', name: 'Open' } } }],
        isLast: true,
      };
      httpService.get.mockResolvedValue(mockResult);

      const result = await service.search('project = TEST', 50);
      expect(result).toEqual(mockResult);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/search/jql', {
        params: { jql: 'project = TEST', maxResults: 50, fields: 'summary,status,assignee,priority,created,updated' },
      });
    });
  });

  describe('getIssue', () => {
    it('should get issue by key', async () => {
      const mockIssue = { id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1', fields: { summary: 'Test issue' } };
      httpService.get.mockResolvedValue(mockIssue);

      const result = await service.getIssue('TEST-1');
      expect(result).toEqual(mockIssue);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1', { params: {} });
    });

    it('should get issue with expand parameter', async () => {
      const mockIssue = { id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1', fields: { summary: 'Test issue' } };
      httpService.get.mockResolvedValue(mockIssue);

      await service.getIssue('TEST-1', 'renderedFields');
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1', { params: { expand: 'renderedFields' } });
    });
  });

  describe('createIssue', () => {
    it('should create issue with fields', async () => {
      const mockIssue = { id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1', fields: { summary: 'New issue' } };
      const fields = { project: { key: 'TEST' }, summary: 'New issue', issuetype: { name: 'Task' } };
      httpService.post.mockResolvedValue(mockIssue);

      const result = await service.createIssue(fields);
      expect(result).toEqual(mockIssue);
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue', { fields });
    });
  });

  describe('updateIssue', () => {
    it('should update issue', async () => {
      httpService.put.mockResolvedValue(undefined);
      await service.updateIssue('TEST-1', { summary: 'Updated summary' });
      expect(httpService.put).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1', { fields: { summary: 'Updated summary' } });
    });
  });

  describe('deleteIssue', () => {
    it('should delete issue', async () => {
      httpService.delete.mockResolvedValue(undefined);
      await service.deleteIssue('TEST-1');
      expect(httpService.delete).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1');
    });
  });

  describe('bulkCreateIssues', () => {
    it('should create multiple issues', async () => {
      const mockResult = {
        issues: [
          { id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1', fields: { summary: 'Issue 1' } },
          { id: '2', key: 'TEST-2', self: 'https://test.atlassian.net/rest/api/3/issue/2', fields: { summary: 'Issue 2' } },
        ],
        errors: [],
      };
      httpService.post.mockResolvedValue(mockResult);

      const issueUpdates = [
        { fields: { project: { key: 'TEST' }, summary: 'Issue 1', issuetype: { name: 'Task' } } },
        { fields: { project: { key: 'TEST' }, summary: 'Issue 2', issuetype: { name: 'Task' } } },
      ];
      const result = await service.bulkCreateIssues(issueUpdates);
      expect(result).toEqual(mockResult);
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue/bulk', { issueUpdates });
    });
  });
});
