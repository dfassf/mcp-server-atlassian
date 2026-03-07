import { JiraService } from './jira.service';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import { createJiraTestModule } from './testing/jira-test.helper';

describe('JiraService - Meta & Workflow', () => {
  let service: JiraService;
  let httpService: jest.Mocked<AtlassianHttpService>;

  beforeEach(async () => {
    ({ service, httpService } = await createJiraTestModule());
  });

  afterEach(() => jest.clearAllMocks());

  describe('transitionIssue', () => {
    it('should transition issue', async () => {
      httpService.post.mockResolvedValue(undefined);
      await service.transitionIssue('TEST-1', '11');
      expect(httpService.post).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/transitions', { transition: { id: '11' } });
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

  describe('getProjects', () => {
    it('should get all projects', async () => {
      const mockProjects = [{ id: '1', key: 'TEST', name: 'Test Project' }];
      httpService.get.mockResolvedValue(mockProjects);

      const result = await service.getProjects();
      expect(result).toEqual(mockProjects);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/project');
    });
  });

  describe('getProject', () => {
    it('should get project by key', async () => {
      const mockProject = { id: '1', key: 'TEST', name: 'Test Project' };
      httpService.get.mockResolvedValue(mockProject);

      const result = await service.getProject('TEST');
      expect(result).toEqual(mockProject);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/project/TEST');
    });
  });

  describe('searchUsers', () => {
    it('should search users', async () => {
      const mockUsers = [{ accountId: '1', displayName: 'Test User', emailAddress: 'test@example.com' }];
      httpService.get.mockResolvedValue(mockUsers);

      const result = await service.searchUsers('test@example.com');
      expect(result).toEqual(mockUsers);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/user/search', { params: { query: 'test@example.com' } });
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user', async () => {
      const mockUser = { accountId: '1', displayName: 'Test User', emailAddress: 'test@example.com' };
      httpService.get.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser();
      expect(result).toEqual(mockUser);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/myself');
    });
  });

  describe('getStatuses', () => {
    it('should get all statuses', async () => {
      const mockStatuses = [{ id: '1', name: 'To Do', statusCategory: { name: 'new' } }];
      httpService.get.mockResolvedValue(mockStatuses);

      const result = await service.getStatuses();
      expect(result).toEqual(mockStatuses);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/status');
    });
  });

  describe('getIssueTypes', () => {
    it('should get all issue types', async () => {
      const mockIssueTypes = [{ id: '1', name: 'Task', subtask: false }];
      httpService.get.mockResolvedValue(mockIssueTypes);

      const result = await service.getIssueTypes();
      expect(result).toEqual(mockIssueTypes);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issuetype');
    });
  });

  describe('getPriorities', () => {
    it('should get all priorities', async () => {
      const mockPriorities = [{ id: '1', name: 'Highest' }];
      httpService.get.mockResolvedValue(mockPriorities);

      const result = await service.getPriorities();
      expect(result).toEqual(mockPriorities);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/priority');
    });
  });
});
