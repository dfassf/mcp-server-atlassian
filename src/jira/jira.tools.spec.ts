import { Test, TestingModule } from '@nestjs/testing';
import { JiraToolsService } from './jira.tools';
import { JiraService } from './jira.service';
import { JiraIssue, JiraSearchResult, JiraComment, JiraTransition } from '../types/jira.types';
import { ToolResult } from '../types/mcp.types';

describe('JiraToolsService', () => {
  let service: JiraToolsService;
  let jiraService: jest.Mocked<JiraService>;

  beforeEach(async () => {
    const mockJiraService = {
      search: jest.fn(),
      getIssue: jest.fn(),
      createIssue: jest.fn(),
      updateIssue: jest.fn(),
      transitionIssue: jest.fn(),
      getTransitions: jest.fn(),
      addComment: jest.fn(),
      getComments: jest.fn(),
      deleteComment: jest.fn(),
      getProjects: jest.fn(),
      getStatuses: jest.fn(),
      getIssueTypes: jest.fn(),
      getPriorities: jest.fn(),
      getLinkTypes: jest.fn(),
      linkIssues: jest.fn(),
      removeIssueLink: jest.fn(),
      getIssueLinks: jest.fn(),
      deleteIssue: jest.fn(),
      searchUsers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraToolsService,
        {
          provide: JiraService,
          useValue: mockJiraService,
        },
      ],
    }).compile();

    service = module.get<JiraToolsService>(JiraToolsService);
    jiraService = module.get(JiraService) as jest.Mocked<JiraService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = service.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty('name');
      expect(tools[0]).toHaveProperty('description');
      expect(tools[0]).toHaveProperty('inputSchema');
    });
  });

  describe('executeTool', () => {
    it('should handle jira_search', async () => {
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

      jiraService.search.mockResolvedValue(mockResult);

      const result = await service.executeTool('jira_search', { jql: 'project = TEST' });
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.search).toHaveBeenCalledWith('project = TEST', 50);
    });

    it('should handle jira_get_issue', async () => {
      const mockIssue: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'Test issue',
          status: { id: '1', name: 'Open' },
        },
      };

      jiraService.getIssue.mockResolvedValue(mockIssue);

      const result = await service.executeTool('jira_get_issue', { issueKey: 'TEST-1' });
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getIssue).toHaveBeenCalledWith('TEST-1', 'renderedFields');
    });

    it('should handle jira_create_issue', async () => {
      const mockIssue: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'New issue',
        },
      };

      jiraService.createIssue.mockResolvedValue(mockIssue);
      jiraService.searchUsers.mockResolvedValue([
        { accountId: '1', displayName: 'Test User', emailAddress: 'test@example.com' },
      ]);

      const result = await service.executeTool('jira_create_issue', {
        projectKey: 'TEST',
        summary: 'New issue',
        issueType: 'Task',
      });
      expect(result.content[0].text).toContain('TEST-1');
      expect(jiraService.createIssue).toHaveBeenCalled();
    });

    it('should handle jira_transition_issue', async () => {
      const mockTransitions = {
        transitions: [
          { id: '11', name: 'Done', to: { id: '1', name: 'Done' } },
        ] as JiraTransition[],
      };

      jiraService.getTransitions.mockResolvedValue(mockTransitions);
      jiraService.transitionIssue.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_transition_issue', {
        issueKey: 'TEST-1',
        transitionName: 'Done',
      });
      expect(result.content[0].text).toContain('Done');
      expect(jiraService.transitionIssue).toHaveBeenCalledWith('TEST-1', '11');
    });

    it('should handle jira_add_comment', async () => {
      const mockComment: JiraComment = {
        id: '10000',
        author: { accountId: '1', displayName: 'Test User' },
        body: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
      };

      jiraService.addComment.mockResolvedValue(mockComment);

      const result = await service.executeTool('jira_add_comment', {
        issueKey: 'TEST-1',
        body: 'Test comment',
      });
      expect(result.content[0].text).toContain('TEST-1');
      expect(jiraService.addComment).toHaveBeenCalledWith('TEST-1', 'Test comment');
    });

    it('should handle jira_get_comments', async () => {
      const mockComments = {
        comments: [
          {
            id: '10000',
            author: { accountId: '1', displayName: 'Test User' },
            body: {},
            created: '2024-01-01T00:00:00.000Z',
            updated: '2024-01-01T00:00:00.000Z',
          },
        ] as JiraComment[],
      };

      jiraService.getComments.mockResolvedValue(mockComments);

      const result = await service.executeTool('jira_get_comments', { issueKey: 'TEST-1' });
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getComments).toHaveBeenCalledWith('TEST-1');
    });

    it('should handle errors gracefully', async () => {
      const errorMessage = 'API Error';
      jiraService.search.mockImplementationOnce(() => {
        return Promise.reject(new Error(errorMessage));
      });

      const result = await service.executeTool('jira_search', { jql: 'invalid' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should return error for unknown tool', async () => {
      const result = await service.executeTool('unknown_tool', {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown Jira tool');
    });
  });

  describe('createIssue with assignee', () => {
    it('should resolve email to accountId when creating issue', async () => {
      const mockIssue: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'New issue',
        },
      };

      jiraService.createIssue.mockResolvedValue(mockIssue);
      jiraService.searchUsers.mockResolvedValue([
        { accountId: '123', displayName: 'Test User', emailAddress: 'test@example.com' },
      ]);

      const result = await service.executeTool('jira_create_issue', {
        projectKey: 'TEST',
        summary: 'New issue',
        issueType: 'Task',
        assignee: 'test@example.com',
      });
      expect(result.content[0].text).toContain('TEST-1');
      expect(jiraService.searchUsers).toHaveBeenCalledWith('test@example.com');
      expect(jiraService.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: { id: '123' },
        }),
      );
    });

    it('should use accountId directly when not an email', async () => {
      const mockIssue: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'New issue',
        },
      };

      jiraService.createIssue.mockResolvedValue(mockIssue);

      await service.executeTool('jira_create_issue', {
        projectKey: 'TEST',
        summary: 'New issue',
        issueType: 'Task',
        assignee: '123',
      });
      expect(jiraService.searchUsers).not.toHaveBeenCalled();
      expect(jiraService.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: { id: '123' },
        }),
      );
    });
  });
});
