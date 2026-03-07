import { JiraService } from './jira.service';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import { createJiraTestModule } from './testing/jira-test.helper';

describe('JiraService - Agile & Worklog', () => {
  let service: JiraService;
  let httpService: jest.Mocked<AtlassianHttpService>;

  beforeEach(async () => {
    ({ service, httpService } = await createJiraTestModule());
  });

  afterEach(() => jest.clearAllMocks());

  describe('getBoards', () => {
    it('should get all boards', async () => {
      const mockBoards = { values: [{ id: 1, name: 'Board 1', type: 'scrum' }, { id: 2, name: 'Board 2', type: 'kanban' }] };
      httpService.get.mockResolvedValue(mockBoards);

      const result = await service.getBoards();
      expect(result).toEqual(mockBoards);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/agile/1.0/board', { params: {} });
    });

    it('should get boards filtered by project', async () => {
      const mockBoards = { values: [{ id: 1, name: 'Board 1', type: 'scrum' }] };
      httpService.get.mockResolvedValue(mockBoards);

      const result = await service.getBoards('TEST');
      expect(result).toEqual(mockBoards);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/agile/1.0/board', { params: { projectKeyOrId: 'TEST' } });
    });
  });

  describe('getSprints', () => {
    it('should get sprints for a board', async () => {
      const mockSprints = { values: [{ id: 1, name: 'Sprint 1', state: 'active', startDate: '2024-01-01', endDate: '2024-01-14' }] };
      httpService.get.mockResolvedValue(mockSprints);

      const result = await service.getSprints(1);
      expect(result).toEqual(mockSprints);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/agile/1.0/board/1/sprint', { params: {} });
    });

    it('should get sprints filtered by state', async () => {
      const mockSprints = { values: [{ id: 1, name: 'Sprint 1', state: 'active' }] };
      httpService.get.mockResolvedValue(mockSprints);

      const result = await service.getSprints(1, 'active');
      expect(result).toEqual(mockSprints);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/agile/1.0/board/1/sprint', { params: { state: 'active' } });
    });
  });

  describe('getSprintIssues', () => {
    it('should get issues in a sprint', async () => {
      const mockSprintIssues = {
        issues: [{ id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1', fields: { summary: 'Issue 1', status: { id: '1', name: 'In Progress' } } }],
      };
      httpService.get.mockResolvedValue(mockSprintIssues);

      const result = await service.getSprintIssues(1);
      expect(result).toEqual(mockSprintIssues);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/agile/1.0/sprint/1/issue', {
        params: { fields: 'summary,status,assignee,priority,issuetype' },
      });
    });
  });

  describe('moveIssuesToSprint', () => {
    it('should move issues to sprint', async () => {
      httpService.post.mockResolvedValue(undefined);
      await service.moveIssuesToSprint(1, ['TEST-1', 'TEST-2']);
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/agile/1.0/sprint/1/issue', { issues: ['TEST-1', 'TEST-2'] });
    });
  });

  describe('getWorklogs', () => {
    it('should get worklogs for an issue', async () => {
      const mockWorklogs = {
        worklogs: [{ id: '10000', author: { displayName: 'Test User' }, timeSpent: '2h', started: '2024-01-01T10:00:00.000Z', comment: {} }],
      };
      httpService.get.mockResolvedValue(mockWorklogs);

      const result = await service.getWorklogs('TEST-1');
      expect(result).toEqual(mockWorklogs);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/worklog');
    });
  });

  describe('addWorklog', () => {
    it('should add worklog without comment', async () => {
      httpService.post.mockResolvedValue(undefined);
      await service.addWorklog('TEST-1', 7200, '2024-01-01T10:00:00.000+0000');
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/worklog', {
        timeSpentSeconds: 7200, started: '2024-01-01T10:00:00.000+0000',
      });
    });

    it('should add worklog with comment', async () => {
      httpService.post.mockResolvedValue(undefined);
      await service.addWorklog('TEST-1', 7200, '2024-01-01T10:00:00.000+0000', 'Worked on feature');
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/worklog', {
        timeSpentSeconds: 7200, started: '2024-01-01T10:00:00.000+0000',
        comment: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Worked on feature' }] }] },
      });
    });
  });

  describe('addAttachment', () => {
    it('should add attachment with FormData', async () => {
      httpService.post.mockResolvedValue(undefined);
      await service.addAttachment('TEST-1', 'report.pdf', 'dGVzdA==');
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/attachments', expect.any(FormData), { headers: { 'X-Atlassian-Token': 'no-check' } });
    });
  });
});
