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
});
