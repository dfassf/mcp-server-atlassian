import { ConfluenceService } from './confluence.service';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import { createConfluenceTestModule } from './testing/confluence-test.helper';

describe('ConfluenceService - Page', () => {
  let service: ConfluenceService;
  let httpService: jest.Mocked<AtlassianHttpService>;

  beforeEach(async () => {
    ({ service, httpService } = await createConfluenceTestModule());
  });

  afterEach(() => jest.clearAllMocks());

  describe('search', () => {
    const mockSearchResult = {
      results: [{ id: '12345', type: 'page', status: 'current', title: 'Test Page' }],
      start: 0, limit: 25, size: 1, totalSize: 1,
    };

    it('should search with CQL and default limit', async () => {
      httpService.get.mockResolvedValue(mockSearchResult);
      const result = await service.search('type = page');
      expect(result).toEqual(mockSearchResult);
      expect(httpService.get).toHaveBeenCalledWith('confluence', '/rest/api/content/search', { params: { cql: 'type = page', limit: 25 } });
    });

    it('should search with CQL and custom limit', async () => {
      httpService.get.mockResolvedValue(mockSearchResult);
      const result = await service.search('space = DEV', 50);
      expect(result).toEqual(mockSearchResult);
      expect(httpService.get).toHaveBeenCalledWith('confluence', '/rest/api/content/search', { params: { cql: 'space = DEV', limit: 50 } });
    });
  });

  describe('getPage', () => {
    it('should get page by id and map v2 response to ConfluencePage', async () => {
      const v2Response = {
        id: '12345', title: 'Test Page', status: 'current', spaceId: 'SPACE1',
        version: { number: 3, createdAt: '2024-06-01T12:00:00.000Z', authorId: 'user-1' },
        body: { storage: { value: '<p>Hello World</p>', representation: 'storage' } },
      };
      httpService.get.mockResolvedValue(v2Response);

      const result = await service.getPage('12345');
      expect(result).toEqual({
        id: '12345', type: 'page', status: 'current', title: 'Test Page',
        version: { number: 3, when: '2024-06-01T12:00:00.000Z' },
        body: { storage: { value: '<p>Hello World</p>', representation: 'storage' } },
      });
      expect(httpService.get).toHaveBeenCalledWith('confluence', '/api/v2/pages/12345', { params: { 'body-format': 'storage' } });
    });

    it('should handle page without body', async () => {
      const v2Response = {
        id: '12345', title: 'Empty Page', status: 'current', spaceId: 'SPACE1',
        version: { number: 1, createdAt: '2024-06-01T12:00:00.000Z', authorId: 'user-1' },
      };
      httpService.get.mockResolvedValue(v2Response);

      const result = await service.getPage('12345');
      expect(result).toEqual({
        id: '12345', type: 'page', status: 'current', title: 'Empty Page',
        version: { number: 1, when: '2024-06-01T12:00:00.000Z' },
        body: undefined,
      });
    });
  });

  describe('createPage', () => {
    const mockCreatedPage = { id: '99999', type: 'page', status: 'current', title: 'New Page', space: { id: 1, key: 'DEV', name: 'Development' } };

    it('should create page without parentId', async () => {
      httpService.post.mockResolvedValue(mockCreatedPage);
      const result = await service.createPage('DEV', 'New Page', '<p>Content</p>');
      expect(result).toEqual(mockCreatedPage);
      expect(httpService.post).toHaveBeenCalledWith('confluence', '/rest/api/content', {
        type: 'page', title: 'New Page', space: { key: 'DEV' },
        body: { storage: { value: '<p>Content</p>', representation: 'storage' } },
      });
    });

    it('should create page with parentId', async () => {
      httpService.post.mockResolvedValue(mockCreatedPage);
      const result = await service.createPage('DEV', 'New Page', '<p>Content</p>', '11111');
      expect(result).toEqual(mockCreatedPage);
      expect(httpService.post).toHaveBeenCalledWith('confluence', '/rest/api/content', {
        type: 'page', title: 'New Page', space: { key: 'DEV' },
        body: { storage: { value: '<p>Content</p>', representation: 'storage' } },
        ancestors: [{ id: '11111' }],
      });
    });
  });

  describe('updatePage', () => {
    it('should update page with version incremented by 1', async () => {
      const mockUpdatedPage = { id: '12345', type: 'page', status: 'current', title: 'Updated Title', version: { number: 4, when: '2024-06-02T12:00:00.000Z' } };
      httpService.put.mockResolvedValue(mockUpdatedPage);

      const result = await service.updatePage('12345', 'Updated Title', '<p>Updated</p>', 3);
      expect(result).toEqual(mockUpdatedPage);
      expect(httpService.put).toHaveBeenCalledWith('confluence', '/rest/api/content/12345', {
        type: 'page', title: 'Updated Title',
        body: { storage: { value: '<p>Updated</p>', representation: 'storage' } },
        version: { number: 4 },
      });
    });
  });

  describe('getChildPages', () => {
    it('should get child pages by pageId', async () => {
      const mockChildren = { results: [{ id: '20001', type: 'page', status: 'current', title: 'Child Page 1' }, { id: '20002', type: 'page', status: 'current', title: 'Child Page 2' }] };
      httpService.get.mockResolvedValue(mockChildren);

      const result = await service.getChildPages('10000');
      expect(result).toEqual(mockChildren);
      expect(httpService.get).toHaveBeenCalledWith('confluence', '/rest/api/content/10000/child/page');
    });
  });

  describe('deletePage', () => {
    it('should delete page by pageId', async () => {
      httpService.delete.mockResolvedValue(undefined);
      await service.deletePage('12345');
      expect(httpService.delete).toHaveBeenCalledWith('confluence', '/rest/api/content/12345');
    });
  });

  describe('getComments', () => {
    it('should get comments with expand params', async () => {
      const mockComments = {
        results: [
          { id: '30001', title: 'Re: Test Page', body: { storage: { value: '<p>Great article!</p>' } }, version: { by: { displayName: 'John Doe' }, when: '2024-06-01T15:30:00.000Z' } },
          { id: '30002', title: 'Re: Test Page', body: { storage: { value: '<p>Thanks!</p>' } }, version: { by: { displayName: 'Jane Smith' }, when: '2024-06-01T16:00:00.000Z' } },
        ],
      };
      httpService.get.mockResolvedValue(mockComments);

      const result = await service.getComments('12345');
      expect(result).toEqual(mockComments);
      expect(httpService.get).toHaveBeenCalledWith('confluence', '/rest/api/content/12345/child/comment', { params: { expand: 'body.storage,version' } });
    });
  });
});
