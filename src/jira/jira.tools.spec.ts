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
      bulkCreateIssues: jest.fn(),
      getCurrentUser: jest.fn(),
      getBoards: jest.fn(),
      getSprints: jest.fn(),
      getSprintIssues: jest.fn(),
      moveIssuesToSprint: jest.fn(),
      getWorklogs: jest.fn(),
      addWorklog: jest.fn(),
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

    it('should handle jira_create_issue with description', async () => {
      const mockIssue: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: { summary: 'New issue' },
      };

      jiraService.createIssue.mockResolvedValue(mockIssue);

      await service.executeTool('jira_create_issue', {
        projectKey: 'TEST',
        summary: 'New issue',
        issueType: 'Task',
        description: 'Issue description',
      });
      expect(jiraService.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.objectContaining({ type: 'doc' }),
        }),
      );
    });

    it('should handle jira_create_issue with priority and labels', async () => {
      const mockIssue: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: { summary: 'New issue' },
      };

      jiraService.createIssue.mockResolvedValue(mockIssue);

      await service.executeTool('jira_create_issue', {
        projectKey: 'TEST',
        summary: 'New issue',
        issueType: 'Task',
        priority: 'High',
        labels: 'frontend,urgent',
      });
      expect(jiraService.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: { name: 'High' },
          labels: ['frontend', 'urgent'],
        }),
      );
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

    it('should handle jira_transition_issue with transition not found', async () => {
      const mockTransitions = {
        transitions: [
          { id: '11', name: 'Done', to: { id: '1', name: 'Done' } },
        ] as JiraTransition[],
      };

      jiraService.getTransitions.mockResolvedValue(mockTransitions);

      const result = await service.executeTool('jira_transition_issue', {
        issueKey: 'TEST-1',
        transitionName: 'Invalid Transition',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should handle jira_update_issue', async () => {
      jiraService.updateIssue.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_update_issue', {
        issueKey: 'TEST-1',
        summary: 'Updated summary',
      });
      expect(result.content[0].text).toContain('updated successfully');
      expect(jiraService.updateIssue).toHaveBeenCalled();
    });

    it('should handle jira_update_issue with description', async () => {
      jiraService.updateIssue.mockResolvedValue(undefined);

      await service.executeTool('jira_update_issue', {
        issueKey: 'TEST-1',
        description: 'Updated description',
      });
      expect(jiraService.updateIssue).toHaveBeenCalledWith(
        'TEST-1',
        expect.objectContaining({
          description: expect.objectContaining({ type: 'doc' }),
        }),
      );
    });

    it('should handle jira_update_issue with priority and labels', async () => {
      jiraService.updateIssue.mockResolvedValue(undefined);

      await service.executeTool('jira_update_issue', {
        issueKey: 'TEST-1',
        priority: 'High',
        labels: 'frontend,urgent',
      });
      expect(jiraService.updateIssue).toHaveBeenCalledWith(
        'TEST-1',
        expect.objectContaining({
          priority: { name: 'High' },
          labels: ['frontend', 'urgent'],
        }),
      );
    });

    it('should handle jira_update_issue with assignee email', async () => {
      jiraService.updateIssue.mockResolvedValue(undefined);
      jiraService.searchUsers.mockResolvedValue([
        { accountId: '123', displayName: 'Test User', emailAddress: 'test@example.com' },
      ]);

      await service.executeTool('jira_update_issue', {
        issueKey: 'TEST-1',
        assignee: 'test@example.com',
      });
      expect(jiraService.searchUsers).toHaveBeenCalledWith('test@example.com');
      expect(jiraService.updateIssue).toHaveBeenCalledWith(
        'TEST-1',
        expect.objectContaining({
          assignee: { id: '123' },
        }),
      );
    });

    it('should handle jira_update_issue with assignee accountId', async () => {
      jiraService.updateIssue.mockResolvedValue(undefined);

      await service.executeTool('jira_update_issue', {
        issueKey: 'TEST-1',
        assignee: '123',
      });
      expect(jiraService.searchUsers).not.toHaveBeenCalled();
      expect(jiraService.updateIssue).toHaveBeenCalledWith(
        'TEST-1',
        expect.objectContaining({
          assignee: { id: '123' },
        }),
      );
    });

    it('should handle jira_create_issue_link', async () => {
      jiraService.linkIssues.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_create_issue_link', {
        inwardIssueKey: 'TEST-1',
        outwardIssueKey: 'TEST-2',
        linkType: 'blocks',
      });
      expect(result.content[0].text).toContain('Linked');
      expect(jiraService.linkIssues).toHaveBeenCalledWith('TEST-1', 'TEST-2', 'blocks');
    });

    it('should handle jira_get_link_types', async () => {
      const mockLinkTypes = {
        issueLinkTypes: [
          { id: '1', name: 'blocks', inward: 'is blocked by', outward: 'blocks' },
        ],
      };

      jiraService.getLinkTypes.mockResolvedValue(mockLinkTypes);

      const result = await service.executeTool('jira_get_link_types', {});
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getLinkTypes).toHaveBeenCalled();
    });

    it('should handle jira_get_all_projects', async () => {
      const mockProjects = [
        { id: '1', key: 'TEST', name: 'Test Project' },
      ];

      jiraService.getProjects.mockResolvedValue(mockProjects);

      const result = await service.executeTool('jira_get_all_projects', {});
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getProjects).toHaveBeenCalled();
    });

    it('should handle jira_delete_issue', async () => {
      jiraService.deleteIssue.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_delete_issue', { issueKey: 'TEST-1' });
      expect(result.content[0].text).toContain('deleted successfully');
      expect(jiraService.deleteIssue).toHaveBeenCalledWith('TEST-1');
    });

    it('should handle jira_get_statuses', async () => {
      const mockStatuses = [
        { id: '1', name: 'To Do', statusCategory: { name: 'new' } },
      ];

      jiraService.getStatuses.mockResolvedValue(mockStatuses);

      const result = await service.executeTool('jira_get_statuses', {});
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getStatuses).toHaveBeenCalled();
    });

    it('should handle jira_get_issue_types', async () => {
      const mockIssueTypes = [
        { id: '1', name: 'Task', subtask: false },
      ];

      jiraService.getIssueTypes.mockResolvedValue(mockIssueTypes);

      const result = await service.executeTool('jira_get_issue_types', {});
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getIssueTypes).toHaveBeenCalled();
    });

    it('should handle jira_get_priorities', async () => {
      const mockPriorities = [
        { id: '1', name: 'Highest' },
      ];

      jiraService.getPriorities.mockResolvedValue(mockPriorities);

      const result = await service.executeTool('jira_get_priorities', {});
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getPriorities).toHaveBeenCalled();
    });

    it('should handle jira_delete_comment', async () => {
      jiraService.deleteComment.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_delete_comment', {
        issueKey: 'TEST-1',
        commentId: '10000',
      });
      expect(result.content[0].text).toContain('deleted');
      expect(jiraService.deleteComment).toHaveBeenCalledWith('TEST-1', '10000');
    });

    it('should handle jira_get_transitions', async () => {
      const mockTransitions = {
        transitions: [
          { id: '11', name: 'Done', to: { id: '1', name: 'Done' } },
        ] as JiraTransition[],
      };

      jiraService.getTransitions.mockResolvedValue(mockTransitions);

      const result = await service.executeTool('jira_get_transitions', { issueKey: 'TEST-1' });
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getTransitions).toHaveBeenCalledWith('TEST-1');
    });

    it('should handle jira_remove_issue_link', async () => {
      const mockLinks = [
        {
          id: '10000',
          type: { name: 'blocks', inward: 'is blocked by', outward: 'blocks' },
          outwardIssue: { key: 'TEST-2' },
        },
      ];

      jiraService.getIssueLinks.mockResolvedValue(mockLinks);
      jiraService.removeIssueLink.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_remove_issue_link', {
        issueKey: 'TEST-1',
        targetIssueKey: 'TEST-2',
      });
      expect(result.content[0].text).toContain('Removed');
      expect(jiraService.removeIssueLink).toHaveBeenCalledWith('10000');
    });

    it('should handle jira_remove_issue_link with linkType', async () => {
      const mockLinks = [
        {
          id: '10000',
          type: { name: 'blocks', inward: 'is blocked by', outward: 'blocks' },
          outwardIssue: { key: 'TEST-2' },
        },
      ];

      jiraService.getIssueLinks.mockResolvedValue(mockLinks);
      jiraService.removeIssueLink.mockResolvedValue(undefined);

      await service.executeTool('jira_remove_issue_link', {
        issueKey: 'TEST-1',
        targetIssueKey: 'TEST-2',
        linkType: 'blocks',
      });
      expect(jiraService.removeIssueLink).toHaveBeenCalledWith('10000');
    });

    it('should handle jira_remove_issue_link when link not found', async () => {
      jiraService.getIssueLinks.mockResolvedValue([]);

      const result = await service.executeTool('jira_remove_issue_link', {
        issueKey: 'TEST-1',
        targetIssueKey: 'TEST-2',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No link found');
    });

    it('should handle jira_remove_issue_link when link not found with linkType', async () => {
      jiraService.getIssueLinks.mockResolvedValue([
        {
          id: '10000',
          type: { name: 'relates', inward: 'relates to', outward: 'relates to' },
          outwardIssue: { key: 'TEST-2' },
        },
      ]);

      const result = await service.executeTool('jira_remove_issue_link', {
        issueKey: 'TEST-1',
        targetIssueKey: 'TEST-2',
        linkType: 'blocks',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No link found');
      expect(result.content[0].text).toContain('blocks');
    });

    it('should handle jira_remove_issue_link with inwardIssue', async () => {
      const mockLinks = [
        {
          id: '10000',
          type: { name: 'blocks', inward: 'is blocked by', outward: 'blocks' },
          inwardIssue: { key: 'TEST-2' },
        },
      ];

      jiraService.getIssueLinks.mockResolvedValue(mockLinks);
      jiraService.removeIssueLink.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_remove_issue_link', {
        issueKey: 'TEST-1',
        targetIssueKey: 'TEST-2',
      });
      expect(result.content[0].text).toContain('Removed');
      expect(jiraService.removeIssueLink).toHaveBeenCalledWith('10000');
    });

    it('should filter out links that do not match target issue', async () => {
      const mockLinks = [
        {
          id: '10000',
          type: { name: 'blocks', inward: 'is blocked by', outward: 'blocks' },
          outwardIssue: { key: 'TEST-3' },
        },
        {
          id: '10001',
          type: { name: 'blocks', inward: 'is blocked by', outward: 'blocks' },
          outwardIssue: { key: 'TEST-2' },
        },
      ];

      jiraService.getIssueLinks.mockResolvedValue(mockLinks);
      jiraService.removeIssueLink.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_remove_issue_link', {
        issueKey: 'TEST-1',
        targetIssueKey: 'TEST-2',
      });
      expect(result.content[0].text).toContain('Removed');
      expect(jiraService.removeIssueLink).toHaveBeenCalledWith('10001');
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

    it('should handle non-Error exceptions', async () => {
      jiraService.search.mockImplementationOnce(() => {
        return Promise.reject('String error');
      });

      const result = await service.executeTool('jira_search', { jql: 'invalid' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('String error');
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

    it('should throw error when user not found by email', async () => {
      jiraService.searchUsers.mockResolvedValue([]);

      const result = await service.executeTool('jira_create_issue', {
        projectKey: 'TEST',
        summary: 'New issue',
        issueType: 'Task',
        assignee: 'notfound@example.com',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('User not found');
    });
  });

  describe('jira_bulk_create_issues', () => {
    it('should create multiple issues', async () => {
      const mockResult = {
        issues: [
          { id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1', fields: { summary: 'Issue 1' } },
          { id: '2', key: 'TEST-2', self: 'https://test.atlassian.net/rest/api/3/issue/2', fields: { summary: 'Issue 2' } },
        ],
        errors: [],
      };

      jiraService.bulkCreateIssues.mockResolvedValue(mockResult);

      const result = await service.executeTool('jira_bulk_create_issues', {
        projectKey: 'TEST',
        issues: JSON.stringify([
          { summary: 'Issue 1', issueType: 'Task' },
          { summary: 'Issue 2', issueType: 'Bug' },
        ]),
      });

      expect(result.content[0].text).toContain('TEST-1');
      expect(result.content[0].text).toContain('TEST-2');
      expect(jiraService.bulkCreateIssues).toHaveBeenCalled();
    });

    it('should handle invalid JSON', async () => {
      const result = await service.executeTool('jira_bulk_create_issues', {
        projectKey: 'TEST',
        issues: 'invalid json',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid JSON format');
    });

    it('should reject empty array', async () => {
      const result = await service.executeTool('jira_bulk_create_issues', {
        projectKey: 'TEST',
        issues: JSON.stringify([]),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('non-empty array');
    });

    it('should reject more than 50 issues', async () => {
      const issues = Array(51).fill({ summary: 'Issue', issueType: 'Task' });
      const result = await service.executeTool('jira_bulk_create_issues', {
        projectKey: 'TEST',
        issues: JSON.stringify(issues),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Maximum 50');
    });

    it('should handle bulk create with description, priority, and labels', async () => {
      const mockResult = {
        issues: [
          { id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1', fields: { summary: 'Issue 1' } },
        ],
        errors: [],
      };

      jiraService.bulkCreateIssues.mockResolvedValue(mockResult);

      await service.executeTool('jira_bulk_create_issues', {
        projectKey: 'TEST',
        issues: JSON.stringify([
          {
            summary: 'Issue 1',
            issueType: 'Task',
            description: 'Description',
            priority: 'High',
            labels: 'frontend,urgent',
          },
        ]),
      });

      expect(jiraService.bulkCreateIssues).toHaveBeenCalledWith([
        {
          fields: expect.objectContaining({
            description: expect.objectContaining({ type: 'doc' }),
            priority: { name: 'High' },
            labels: ['frontend', 'urgent'],
          }),
        },
      ]);
    });

    it('should handle bulk create with no issues in result', async () => {
      const mockResult = {
        issues: [],
        errors: [{ message: 'Error' }],
      };

      jiraService.bulkCreateIssues.mockResolvedValue(mockResult);

      const result = await service.executeTool('jira_bulk_create_issues', {
        projectKey: 'TEST',
        issues: JSON.stringify([{ summary: 'Issue 1', issueType: 'Task' }]),
      });

      const resultText = result.content[0].text;
      expect(resultText).toContain('"created": 0');
      expect(resultText).toContain('"errors": 1');
    });

    it('should handle bulk create with undefined issues in result', async () => {
      const mockResult = {
        issues: undefined as any,
        errors: [{ message: 'Error' }],
      };

      jiraService.bulkCreateIssues.mockResolvedValue(mockResult);

      const result = await service.executeTool('jira_bulk_create_issues', {
        projectKey: 'TEST',
        issues: JSON.stringify([{ summary: 'Issue 1', issueType: 'Task' }]),
      });

      const resultText = result.content[0].text;
      expect(resultText).toContain('"created": 0');
      expect(resultText).toContain('"errors": 1');
    });

    it('should handle bulk create with service error', async () => {
      jiraService.bulkCreateIssues.mockRejectedValue(new Error('Service error'));

      const result = await service.executeTool('jira_bulk_create_issues', {
        projectKey: 'TEST',
        issues: JSON.stringify([{ summary: 'Issue 1', issueType: 'Task' }]),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Service error');
    });
  });

  describe('jira_get_my_issues', () => {
    it('should get issues assigned to current user', async () => {
      const mockResult: JiraSearchResult = {
        issues: [
          {
            id: '1',
            key: 'TEST-1',
            self: 'https://test.atlassian.net/rest/api/3/issue/1',
            fields: {
              summary: 'My issue',
              status: { id: '1', name: 'In Progress' },
              priority: { id: '1', name: 'High' },
            },
          },
        ],
        isLast: true,
      };

      jiraService.search.mockResolvedValue(mockResult);

      const result = await service.executeTool('jira_get_my_issues', {});
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.search).toHaveBeenCalledWith(
        'assignee = currentUser() ORDER BY updated DESC',
        50,
      );
    });

    it('should filter by status', async () => {
      const mockResult: JiraSearchResult = {
        issues: [],
        isLast: true,
      };

      jiraService.search.mockResolvedValue(mockResult);

      await service.executeTool('jira_get_my_issues', { status: 'In Progress' });
      expect(jiraService.search).toHaveBeenCalledWith(
        'assignee = currentUser() AND status = "In Progress" ORDER BY updated DESC',
        50,
      );
    });
  });

  describe('jira_get_boards', () => {
    it('should get all boards', async () => {
      const mockBoards = {
        values: [
          { id: 1, name: 'Board 1', type: 'scrum' },
          { id: 2, name: 'Board 2', type: 'kanban' },
        ],
      };

      jiraService.getBoards.mockResolvedValue(mockBoards);

      const result = await service.executeTool('jira_get_boards', {});
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getBoards).toHaveBeenCalledWith(undefined);
    });

    it('should filter by project', async () => {
      const mockBoards = { values: [{ id: 1, name: 'Board 1', type: 'scrum' }] };
      jiraService.getBoards.mockResolvedValue(mockBoards);

      await service.executeTool('jira_get_boards', { projectKey: 'TEST' });
      expect(jiraService.getBoards).toHaveBeenCalledWith('TEST');
    });
  });

  describe('jira_get_sprints', () => {
    it('should get sprints for a board', async () => {
      const mockSprints = {
        values: [
          { id: 1, name: 'Sprint 1', state: 'active', startDate: '2024-01-01', endDate: '2024-01-14' },
        ],
      };

      jiraService.getSprints.mockResolvedValue(mockSprints);

      const result = await service.executeTool('jira_get_sprints', { boardId: 1 });
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getSprints).toHaveBeenCalledWith(1, undefined);
    });

    it('should filter by state', async () => {
      const mockSprints = { values: [{ id: 1, name: 'Sprint 1', state: 'active' }] };
      jiraService.getSprints.mockResolvedValue(mockSprints);

      await service.executeTool('jira_get_sprints', { boardId: 1, state: 'active' });
      expect(jiraService.getSprints).toHaveBeenCalledWith(1, 'active');
    });
  });

  describe('jira_get_sprint_issues', () => {
    it('should get issues in a sprint', async () => {
      const mockSprintIssues = {
        issues: [
          {
            id: '1',
            key: 'TEST-1',
            self: 'https://test.atlassian.net/rest/api/3/issue/1',
            fields: {
              summary: 'Issue 1',
              status: { id: '1', name: 'In Progress' },
              assignee: { accountId: '1', displayName: 'Test User' },
              priority: { id: '1', name: 'High' },
            },
          },
        ],
      };

      jiraService.getSprintIssues.mockResolvedValue(mockSprintIssues);

      const result = await service.executeTool('jira_get_sprint_issues', { sprintId: 1 });
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getSprintIssues).toHaveBeenCalledWith(1);
    });
  });

  describe('jira_move_to_sprint', () => {
    it('should move issues to sprint', async () => {
      jiraService.moveIssuesToSprint.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_move_to_sprint', {
        sprintId: 1,
        issueKeys: 'TEST-1,TEST-2',
      });

      expect(result.content[0].text).toContain('Moved 2 issue(s)');
      expect(jiraService.moveIssuesToSprint).toHaveBeenCalledWith(1, ['TEST-1', 'TEST-2']);
    });
  });

  describe('jira_get_worklog', () => {
    it('should get worklogs for an issue', async () => {
      const mockWorklogs = {
        worklogs: [
          {
            id: '10000',
            author: { displayName: 'Test User' },
            timeSpent: '2h',
            started: '2024-01-01T10:00:00.000Z',
          },
        ],
      };

      jiraService.getWorklogs.mockResolvedValue(mockWorklogs);

      const result = await service.executeTool('jira_get_worklog', { issueKey: 'TEST-1' });
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.getWorklogs).toHaveBeenCalledWith('TEST-1');
    });
  });

  describe('jira_log_work', () => {
    it('should log work in hours', async () => {
      jiraService.addWorklog.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_log_work', {
        issueKey: 'TEST-1',
        timeSpent: '2h',
      });

      expect(result.content[0].text).toContain('Logged 2h');
      expect(jiraService.addWorklog).toHaveBeenCalledWith('TEST-1', 7200, expect.any(String), undefined);
    });

    it('should log work in minutes', async () => {
      jiraService.addWorklog.mockResolvedValue(undefined);

      await service.executeTool('jira_log_work', {
        issueKey: 'TEST-1',
        timeSpent: '30m',
      });

      expect(jiraService.addWorklog).toHaveBeenCalledWith('TEST-1', 1800, expect.any(String), undefined);
    });

    it('should log work in days', async () => {
      jiraService.addWorklog.mockResolvedValue(undefined);

      await service.executeTool('jira_log_work', {
        issueKey: 'TEST-1',
        timeSpent: '1d',
      });

      expect(jiraService.addWorklog).toHaveBeenCalledWith('TEST-1', 28800, expect.any(String), undefined);
    });

    it('should log work with comment', async () => {
      jiraService.addWorklog.mockResolvedValue(undefined);

      await service.executeTool('jira_log_work', {
        issueKey: 'TEST-1',
        timeSpent: '2h',
        comment: 'Worked on feature',
      });

      expect(jiraService.addWorklog).toHaveBeenCalledWith('TEST-1', 7200, expect.any(String), 'Worked on feature');
    });

    it('should reject invalid time format', async () => {
      const result = await service.executeTool('jira_log_work', {
        issueKey: 'TEST-1',
        timeSpent: 'invalid',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid time format');
    });
  });

  describe('jira_get_project_summary', () => {
    it('should get project summary', async () => {
      const mockResults = [
        { issues: [{ id: '1', key: 'TEST-1', self: '', fields: { summary: 'Issue 1' } }], isLast: true },
        { issues: [{ id: '2', key: 'TEST-2', self: '', fields: { summary: 'Issue 2' } }], isLast: true },
        { issues: [{ id: '3', key: 'TEST-3', self: '', fields: { summary: 'Issue 3' } }], isLast: true },
        { issues: [{ id: '4', key: 'TEST-4', self: '', fields: { summary: 'Issue 4' } }], isLast: true },
      ];

      jiraService.search
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2])
        .mockResolvedValueOnce(mockResults[3]);

      const result = await service.executeTool('jira_get_project_summary', { projectKey: 'TEST' });
      expect(result.content[0].text).toBeDefined();
      expect(jiraService.search).toHaveBeenCalledTimes(4);
    });
  });

  describe('jira_clone_issue', () => {
    it('should clone an issue with default summary', async () => {
      const mockOriginal: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'Original issue',
          project: { id: '1', key: 'TEST', name: 'Test Project' },
          issuetype: { id: '1', name: 'Task', subtask: false },
          description: {},
          priority: { id: '1', name: 'High' },
        },
      };

      const mockNew: JiraIssue = {
        id: '2',
        key: 'TEST-2',
        self: 'https://test.atlassian.net/rest/api/3/issue/2',
        fields: { summary: '[Clone] Original issue' },
      };

      jiraService.getIssue.mockResolvedValue(mockOriginal);
      jiraService.createIssue.mockResolvedValue(mockNew);

      const result = await service.executeTool('jira_clone_issue', { issueKey: 'TEST-1' });
      expect(result.content[0].text).toContain('Cloned TEST-1 -> TEST-2');
      expect(jiraService.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: '[Clone] Original issue',
        }),
      );
    });

    it('should clone an issue with custom summary', async () => {
      const mockOriginal: JiraIssue = {
        id: '1',
        key: 'TEST-1',
        self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'Original issue',
          project: { id: '1', key: 'TEST', name: 'Test Project' },
          issuetype: { id: '1', name: 'Task', subtask: false },
          description: {},
          priority: { id: '1', name: 'High' },
        },
      };

      const mockNew: JiraIssue = {
        id: '2',
        key: 'TEST-2',
        self: 'https://test.atlassian.net/rest/api/3/issue/2',
        fields: { summary: 'Custom summary' },
      };

      jiraService.getIssue.mockResolvedValue(mockOriginal);
      jiraService.createIssue.mockResolvedValue(mockNew);

      await service.executeTool('jira_clone_issue', {
        issueKey: 'TEST-1',
        summary: 'Custom summary',
      });

      expect(jiraService.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: 'Custom summary',
        }),
      );
    });
  });

  describe('jira_assign_to_me', () => {
    it('should assign issue to current user', async () => {
      const mockUser = {
        accountId: '123',
        displayName: 'Test User',
        emailAddress: 'test@example.com',
      };

      jiraService.getCurrentUser.mockResolvedValue(mockUser);
      jiraService.updateIssue.mockResolvedValue(undefined);

      const result = await service.executeTool('jira_assign_to_me', { issueKey: 'TEST-1' });
      expect(result.content[0].text).toContain('Assigned TEST-1 to Test User');
      expect(jiraService.updateIssue).toHaveBeenCalledWith('TEST-1', {
        assignee: { id: '123' },
      });
    });
  });
});
