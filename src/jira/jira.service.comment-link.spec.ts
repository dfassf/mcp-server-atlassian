import { JiraService } from './jira.service';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import { createJiraTestModule } from './testing/jira-test.helper';

describe('JiraService - Comment & Link', () => {
  let service: JiraService;
  let httpService: jest.Mocked<AtlassianHttpService>;

  beforeEach(async () => {
    ({ service, httpService } = await createJiraTestModule());
  });

  afterEach(() => jest.clearAllMocks());

  describe('addComment', () => {
    it('should add comment with ADF format', async () => {
      const mockComment = {
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
          type: 'doc', version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test comment' }] }],
        },
      });
    });
  });

  describe('getComments', () => {
    it('should get comments', async () => {
      const mockComments = {
        comments: [{ id: '10000', author: { accountId: '1', displayName: 'Test User' }, body: {}, created: '2024-01-01T00:00:00.000Z', updated: '2024-01-01T00:00:00.000Z' }],
      };
      httpService.get.mockResolvedValue(mockComments);

      const result = await service.getComments('TEST-1');
      expect(result).toEqual(mockComments);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/comment');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment', async () => {
      httpService.delete.mockResolvedValue(undefined);
      await service.deleteComment('TEST-1', '10000');
      expect(httpService.delete).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1/comment/10000');
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
      const mockLinkTypes = { issueLinkTypes: [{ id: '1', name: 'blocks', inward: 'is blocked by', outward: 'blocks' }] };
      httpService.get.mockResolvedValue(mockLinkTypes);

      const result = await service.getLinkTypes();
      expect(result).toEqual(mockLinkTypes);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issueLinkType');
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
      const mockIssue = {
        id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1',
        fields: {
          summary: 'Test issue',
          issuelinks: [{ id: '10000', type: { name: 'blocks', inward: 'is blocked by', outward: 'blocks' }, outwardIssue: { key: 'TEST-2' } }],
        },
      };
      httpService.get.mockResolvedValue(mockIssue);

      const result = await service.getIssueLinks('TEST-1');
      expect(result).toEqual(mockIssue.fields.issuelinks);
      expect(httpService.get).toHaveBeenCalledWith('jira', '/rest/api/3/issue/TEST-1', { params: { fields: 'issuelinks' } });
    });
  });
});
