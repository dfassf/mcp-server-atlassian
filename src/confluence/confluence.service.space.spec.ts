import { ConfluenceService } from './confluence.service';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import { createConfluenceTestModule } from './testing/confluence-test.helper';

describe('ConfluenceService - Space', () => {
  let service: ConfluenceService;
  let httpService: jest.Mocked<AtlassianHttpService>;

  beforeEach(async () => {
    ({ service, httpService } = await createConfluenceTestModule());
  });

  afterEach(() => jest.clearAllMocks());

  describe('createSpace', () => {
    const mockSpace = { id: 1, key: 'NEWSPACE', name: 'New Space', type: 'global' };

    it('should create space without description', async () => {
      httpService.post.mockResolvedValue(mockSpace);
      const result = await service.createSpace('NEWSPACE', 'New Space');
      expect(result).toEqual(mockSpace);
      expect(httpService.post).toHaveBeenCalledWith('confluence', '/rest/api/space', {
        key: 'NEWSPACE', name: 'New Space', type: 'global',
      });
    });

    it('should create space with description', async () => {
      httpService.post.mockResolvedValue(mockSpace);
      const result = await service.createSpace('NEWSPACE', 'New Space', 'A test space');
      expect(result).toEqual(mockSpace);
      expect(httpService.post).toHaveBeenCalledWith('confluence', '/rest/api/space', {
        key: 'NEWSPACE', name: 'New Space', type: 'global',
        description: { plain: { value: 'A test space', representation: 'plain' } },
      });
    });
  });

  describe('getSpaces', () => {
    it('should get spaces with default limit', async () => {
      const mockSpaces = { results: [{ id: 1, key: 'DEV', name: 'Development', type: 'global' }, { id: 2, key: 'QA', name: 'QA', type: 'global' }] };
      httpService.get.mockResolvedValue(mockSpaces);

      const result = await service.getSpaces();
      expect(result).toEqual(mockSpaces);
      expect(httpService.get).toHaveBeenCalledWith('confluence', '/rest/api/space', { params: { limit: 25 } });
    });

    it('should get spaces with custom limit', async () => {
      httpService.get.mockResolvedValue({ results: [] });
      const result = await service.getSpaces(10);
      expect(result).toEqual({ results: [] });
      expect(httpService.get).toHaveBeenCalledWith('confluence', '/rest/api/space', { params: { limit: 10 } });
    });
  });

  describe('getSpace', () => {
    it('should get space by key', async () => {
      const mockSpace = { id: 1, key: 'DEV', name: 'Development', type: 'global', status: 'current' };
      httpService.get.mockResolvedValue(mockSpace);

      const result = await service.getSpace('DEV');
      expect(result).toEqual(mockSpace);
      expect(httpService.get).toHaveBeenCalledWith('confluence', '/rest/api/space/DEV');
    });
  });
});
