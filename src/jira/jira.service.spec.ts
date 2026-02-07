import { Test, TestingModule } from '@nestjs/testing';
import { JiraService } from './jira.service';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import { JiraIssue, JiraSearchResult, JiraProject, JiraTransition, JiraComment } from '../types/jira.types';

describe('JiraService', () => {
  let service: JiraService;
  let httpService: jest.Mocked<AtlassianHttpService>;

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraService,
        {
          provide: AtlassianHttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<JiraService>(JiraService);
    httpService = module.get(AtlassianHttpService) as jest.Mocked<AtlassianHttpService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should search issues with JQL', async () => {
      const mockResult: JiraSearchResult = {
        issues: [
          {
            id: '1',
            key: 'TEST-1',
            self: 'https://test.atlassian.net/rest/api/3/issue/1',
            fields: {
              summary: 'Test issue',
              status: { id: '1', name: 'Open' },
            },
          },
        ],
        isLast: true,
      };

      httpService.get.mockResolvedValue(mockResult);

      const result = await service.search('project = TEST', 50);
      expect(result).toEqual(mockResult);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/search/jql', {
        params: {
          jql: 'project = TEST',
          maxResults: 50,
          fields: 'summary,status,assignee,priority,created,updated',
        },
      });
    });
  });

  describe('getIssue', () => {
    it('should get issue by key', async () => {
      const mockIssue: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'Test issue',
        },
      };

      httpService.get.mockResolvedValue(mockIssue);

      const result = await service.getIssue('TEST-1');
      expect(result).toEqual(mockIssue);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1', { params: {} });
    });

    it('should get issue with expand parameter', async () => {
      const mockIssue: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'Test issue',
        },
      };

      httpService.get.mockResolvedValue(mockIssue);

      await service.getIssue('TEST-1', 'renderedFields');
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1', {
        params: { expand: 'renderedFields' },
      });
    });
  });

  describe('createIssue', () => {
    it('should create issue with fields', async () => {
      const mockIssue: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'New issue',
        },
      };

      const fields = {
        project: { key: 'TEST' },
        summary: 'New issue',
        issuetype: { name: 'Task' },
      };

      httpService.post.mockResolvedValue(mockIssue);

      const result = await service.createIssue(fields);
      expect(result).toEqual(mockIssue);
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue', { fields });
    });
  });

  describe('updateIssue', () => {
    it('should update issue', async () => {
      const fields = { summary: 'Updated summary' };
      httpService.put.mockResolvedValue(undefined);

      await service.updateIssue('TEST-1', fields);
      expect(httpService.put).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1', { fields });
    });
  });

  describe('transitionIssue', () => {
    it('should transition issue', async () => {
      httpService.post.mockResolvedValue(undefined);

      await service.transitionIssue('TEST-1', '11');
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/transitions', {
        transition: { id: '11' },
      });
    });
  });

  describe('getTransitions', () => {
    it('should get available transitions', async () => {
      const mockTransitions = {
        transitions: [
          { id: '11', name: 'To Do', to: { id: '1', name: 'To Do' } },
          { id: '21', name: 'In Progress', to: { id: '2', name: 'In Progress' } },
        ],
      };

      httpService.get.mockResolvedValue(mockTransitions);

      const result = await service.getTransitions('TEST-1');
      expect(result).toEqual(mockTransitions);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/transitions');
    });
  });

  describe('addComment', () => {
    it('should add comment with ADF format', async () => {
      const mockComment: JiraComment = {
        id: '10000',
        author: { accountId: '1', displayName: 'Test User' },
        body: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
      };

      httpService.post.mockResolvedValue(mockComment);

      const result = await service.addComment('TEST-1', 'Test comment');
      expect(result).toEqual(mockComment);
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/comment', {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Test comment' }],
            },
          ],
        },
      });
    });
  });

  describe('getComments', () => {
    it('should get comments', async () => {
      const mockComments = {
        comments: [
          {
            id: '10000',
            author: { accountId: '1', displayName: 'Test User' },
            body: {},
            created: '2024-01-01T00:00:00.000Z',
            updated: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      httpService.get.mockResolvedValue(mockComments);

      const result = await service.getComments('TEST-1');
      expect(result).toEqual(mockComments);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/comment');
    });
  });

  describe('getProjects', () => {
    it('should get all projects', async () => {
      const mockProjects: JiraProject[] = [
        { id: '1', key: 'TEST', name: 'Test Project' },
      ];

      httpService.get.mockResolvedValue(mockProjects);

      const result = await service.getProjects();
      expect(result).toEqual(mockProjects);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/project');
    });
  });

  describe('getProject', () => {
    it('should get project by key', async () => {
      const mockProject: JiraProject = {
        id: '1',
        key: 'TEST',
        name: 'Test Project',
      };

      httpService.get.mockResolvedValue(mockProject);

      const result = await service.getProject('TEST');
      expect(result).toEqual(mockProject);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/project/TEST');
    });
  });

  describe('searchUsers', () => {
    it('should search users', async () => {
      const mockUsers = [
        { accountId: '1', displayName: 'Test User', emailAddress: 'test@example.com' },
      ];

      httpService.get.mockResolvedValue(mockUsers);

      const result = await service.searchUsers('test@example.com');
      expect(result).toEqual(mockUsers);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/user/search', {
        params: { query: 'test@example.com' },
      });
    });
  });

  describe('linkIssues', () => {
    it('should link two issues', async () => {
      httpService.post.mockResolvedValue(undefined);

      await service.linkIssues('TEST-1', 'TEST-2', 'blocks');
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issueLink', {
        type: { name: 'blocks' },
        inwardIssue: { key: 'TEST-1' },
        outwardIssue: { key: 'TEST-2' },
      });
    });
  });

  describe('getLinkTypes', () => {
    it('should get link types', async () => {
      const mockLinkTypes = {
        issueLinkTypes: [
          { id: '1', name: 'blocks', inward: 'is blocked by', outward: 'blocks' },
        ],
      };

      httpService.get.mockResolvedValue(mockLinkTypes);

      const result = await service.getLinkTypes();
      expect(result).toEqual(mockLinkTypes);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issueLinkType');
    });
  });

  describe('deleteIssue', () => {
    it('should delete issue', async () => {
      httpService.delete.mockResolvedValue(undefined);

      await service.deleteIssue('TEST-1');
      expect(httpService.delete).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1');
    });
  });

  describe('getStatuses', () => {
    it('should get all statuses', async () => {
      const mockStatuses = [
        { id: '1', name: 'To Do', statusCategory: { name: 'new' } },
      ];

      httpService.get.mockResolvedValue(mockStatuses);

      const result = await service.getStatuses();
      expect(result).toEqual(mockStatuses);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/status');
    });
  });

  describe('getIssueTypes', () => {
    it('should get all issue types', async () => {
      const mockIssueTypes = [
        { id: '1', name: 'Task', subtask: false },
      ];

      httpService.get.mockResolvedValue(mockIssueTypes);

      const result = await service.getIssueTypes();
      expect(result).toEqual(mockIssueTypes);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issuetype');
    });
  });

  describe('getPriorities', () => {
    it('should get all priorities', async () => {
      const mockPriorities = [
        { id: '1', name: 'Highest' },
      ];

      httpService.get.mockResolvedValue(mockPriorities);

      const result = await service.getPriorities();
      expect(result).toEqual(mockPriorities);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/priority');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment', async () => {
      httpService.delete.mockResolvedValue(undefined);

      await service.deleteComment('TEST-1', '10000');
      expect(httpService.delete).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/comment/10000');
    });
  });

  describe('removeIssueLink', () => {
    it('should remove issue link', async () => {
      httpService.delete.mockResolvedValue(undefined);

      await service.removeIssueLink('10000');
      expect(httpService.delete).toHaveBeenCalledWith('jira', '/rest/api/3/issueLink/10000');
    });
  });

  describe('getIssueLinks', () => {
    it('should get issue links', async () => {
      const mockIssue: JiraIssue & {
        fields: { issuelinks?: Array<{
          id: string;
          type: { name: string; inward: string; outward: string };
          inwardIssue?: { key: string };
          outwardIssue?: { key: string };
        }> };
      } = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'Test issue',
          issuelinks: [
            {
              id: '10000',
              type: { name: 'blocks', inward: 'is blocked by', outward: 'blocks' },
              outwardIssue: { key: 'TEST-2' },
            },
          ],
        },
      };

      httpService.get.mockResolvedValue(mockIssue);

      const result = await service.getIssueLinks('TEST-1');
      expect(result).toEqual(mockIssue.fields.issuelinks);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1', {
        params: { fields: 'issuelinks' },
      });
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

  describe('getCurrentUser', () => {
    it('should get current user', async () => {
      const mockUser = {
        accountId: '1',
        displayName: 'Test User',
        emailAddress: 'test@example.com',
      };

      httpService.get.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser();
      expect(result).toEqual(mockUser);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/myself');
    });
  });

  describe('getBoards', () => {
    it('should get all boards', async () => {
      const mockBoards = {
        values: [
          { id: 1, name: 'Board 1', type: 'scrum' },
          { id: 2, name: 'Board 2', type: 'kanban' },
        ],
      };

      httpService.get.mockResolvedValue(mockBoards);

      const result = await service.getBoards();
      expect(result).toEqual(mockBoards);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/agile/1.0/board', { params: {} });
    });

    it('should get boards filtered by project', async () => {
      const mockBoards = {
        values: [{ id: 1, name: 'Board 1', type: 'scrum' }],
      };

      httpService.get.mockResolvedValue(mockBoards);

      const result = await service.getBoards('TEST');
      expect(result).toEqual(mockBoards);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/agile/1.0/board', {
        params: { projectKeyOrId: 'TEST' },
      });
    });
  });

  describe('getSprints', () => {
    it('should get sprints for a board', async () => {
      const mockSprints = {
        values: [
          { id: 1, name: 'Sprint 1', state: 'active', startDate: '2024-01-01', endDate: '2024-01-14' },
        ],
      };

      httpService.get.mockResolvedValue(mockSprints);

      const result = await service.getSprints(1);
      expect(result).toEqual(mockSprints);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/agile/1.0/board/1/sprint', { params: {} });
    });

    it('should get sprints filtered by state', async () => {
      const mockSprints = {
        values: [{ id: 1, name: 'Sprint 1', state: 'active' }],
      };

      httpService.get.mockResolvedValue(mockSprints);

      const result = await service.getSprints(1, 'active');
      expect(result).toEqual(mockSprints);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/agile/1.0/board/1/sprint', {
        params: { state: 'active' },
      });
    });
  });

  describe('getSprintIssues', () => {
    it('should get issues in a sprint', async () => {
      const mockSprintIssues = {
        issues: [
          {
            id: '1',
            key: 'TEST-1',
            self: 'https://test.atlassian.net/rest/api/3/issue/1',
            fields: { summary: 'Issue 1', status: { id: '1', name: 'In Progress' } },
          },
        ],
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
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/agile/1.0/sprint/1/issue', {
        issues: ['TEST-1', 'TEST-2'],
      });
    });
  });

  describe('getWorklogs', () => {
    it('should get worklogs for an issue', async () => {
      const mockWorklogs = {
        worklogs: [
          {
            id: '10000',
            author: { displayName: 'Test User' },
            timeSpent: '2h',
            started: '2024-01-01T10:00:00.000Z',
            comment: {},
          },
        ],
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
        timeSpentSeconds: 7200,
        started: '2024-01-01T10:00:00.000+0000',
      });
    });

    it('should add worklog with comment', async () => {
      httpService.post.mockResolvedValue(undefined);

      await service.addWorklog('TEST-1', 7200, '2024-01-01T10:00:00.000+0000', 'Worked on feature');
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/worklog', {
        timeSpentSeconds: 7200,
        started: '2024-01-01T10:00:00.000+0000',
        comment: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Worked on feature' }] }],
        },
      });
    });
  });
});
