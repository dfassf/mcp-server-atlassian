import { Test, TestingModule } from '@nestjs/testing';
import { ConfluenceToolsService } from './confluence.tools';
import { ConfluenceService } from './confluence.service';
import { ConfluencePage, ConfluenceSearchResult } from '../types/confluence.types';
import { ToolResult } from '../types/mcp.types';
import { ConfluenceApiError, AtlassianErrorCode } from '../common/errors/atlassian-api.error';

describe('ConfluenceToolsService', () => {
  let service: ConfluenceToolsService;
  let confluenceService: jest.Mocked<ConfluenceService>;

  beforeEach(async () => {
    const mockConfluenceService = {
      search: jest.fn(),
      getPage: jest.fn(),
      createPage: jest.fn(),
      updatePage: jest.fn(),
      deletePage: jest.fn(),
      getComments: jest.fn(),
      createSpace: jest.fn(),
      getSpaces: jest.fn(),
      getSpace: jest.fn(),
      getChildPages: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfluenceToolsService,
        {
          provide: ConfluenceService,
          useValue: mockConfluenceService,
        },
      ],
    }).compile();

    service = module.get<ConfluenceToolsService>(ConfluenceToolsService);
    confluenceService = module.get(ConfluenceService) as jest.Mocked<ConfluenceService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('getTools', () => {
    it('should return array of tools with name/description/inputSchema', () => {
      const tools = service.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      tools.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('executeTool', () => {
    describe('confluence_search', () => {
      it('should search and parse results', async () => {
        const mockResult: ConfluenceSearchResult = {
          results: [
            {
              id: '12345',
              title: 'Test Page',
              type: 'page',
              status: 'current',
              space: { id: 1, key: 'DEV', name: 'Development' },
            },
            {
              id: '67890',
              title: 'Another Page',
              type: 'page',
              status: 'current',
              space: { id: 2, key: 'PROD', name: 'Production' },
            },
          ],
          start: 0,
          limit: 25,
          size: 2,
        };

        confluenceService.search.mockResolvedValue(mockResult);

        const result = await service.executeTool('confluence_search', {
          cql: 'space = DEV AND type = page',
        });

        const parsed = JSON.parse(result.content[0].text!);
        expect(parsed.total).toBe(2);
        expect(parsed.pages).toHaveLength(2);
        expect(parsed.pages[0].id).toBe('12345');
        expect(parsed.pages[0].title).toBe('Test Page');
        expect(parsed.pages[0].spaceKey).toBe('DEV');
        expect(confluenceService.search).toHaveBeenCalledWith('space = DEV AND type = page', 25);
      });

      it('should pass custom limit', async () => {
        confluenceService.search.mockResolvedValue({
          results: [],
          start: 0,
          limit: 10,
          size: 0,
        });

        await service.executeTool('confluence_search', { cql: 'type = page', limit: 10 });
        expect(confluenceService.search).toHaveBeenCalledWith('type = page', 10);
      });
    });

    describe('confluence_get_page', () => {
      it('should get page and format response', async () => {
        const mockPage: ConfluencePage = {
          id: '12345',
          title: 'Test Page',
          type: 'page',
          status: 'current',
          space: { id: 1, key: 'DEV', name: 'Development' },
          version: { number: 3, when: '2024-01-01T00:00:00.000Z' },
          body: {
            storage: {
              value: '<p>Hello World</p>',
              representation: 'storage',
            },
          },
        };

        confluenceService.getPage.mockResolvedValue(mockPage);

        const result = await service.executeTool('confluence_get_page', { pageId: '12345' });

        const parsed = JSON.parse(result.content[0].text!);
        expect(parsed.id).toBe('12345');
        expect(parsed.title).toBe('Test Page');
        expect(parsed.spaceKey).toBe('DEV');
        expect(parsed.version).toBe(3);
        expect(parsed.content).toBe('<p>Hello World</p>');
        expect(confluenceService.getPage).toHaveBeenCalledWith('12345');
      });
    });

    describe('confluence_create_page', () => {
      it('should create a page', async () => {
        const mockPage: ConfluencePage = {
          id: '99999',
          title: 'New Page',
          type: 'page',
          status: 'current',
        };

        confluenceService.createPage.mockResolvedValue(mockPage);

        const result = await service.executeTool('confluence_create_page', {
          spaceKey: 'DEV',
          title: 'New Page',
          content: '<p>Content</p>',
        });

        expect(result.content[0].text).toContain('Page created');
        expect(result.content[0].text).toContain('New Page');
        expect(result.content[0].text).toContain('99999');
        expect(confluenceService.createPage).toHaveBeenCalledWith('DEV', 'New Page', '<p>Content</p>', undefined);
      });

      it('should create a page with parentId', async () => {
        const mockPage: ConfluencePage = {
          id: '99999',
          title: 'Child Page',
          type: 'page',
          status: 'current',
        };

        confluenceService.createPage.mockResolvedValue(mockPage);

        const result = await service.executeTool('confluence_create_page', {
          spaceKey: 'DEV',
          title: 'Child Page',
          content: '<p>Child content</p>',
          parentId: '12345',
        });

        expect(result.content[0].text).toContain('Page created');
        expect(result.content[0].text).toContain('Child Page');
        expect(confluenceService.createPage).toHaveBeenCalledWith('DEV', 'Child Page', '<p>Child content</p>', '12345');
      });
    });

    describe('confluence_update_page', () => {
      const dummyUpdateResult: ConfluencePage = {
        id: '12345',
        title: 'Updated',
        type: 'page',
        status: 'current',
      };

      it('should update page successfully on first attempt', async () => {
        const mockPage: ConfluencePage = {
          id: '12345',
          title: 'Existing Page',
          type: 'page',
          status: 'current',
          version: { number: 5, when: '2024-01-01T00:00:00.000Z' },
        };

        confluenceService.getPage.mockResolvedValue(mockPage);
        confluenceService.updatePage.mockResolvedValue(dummyUpdateResult);

        const result = await service.executeTool('confluence_update_page', {
          pageId: '12345',
          title: 'Updated Title',
          content: '<p>Updated</p>',
        });

        expect(result.content[0].text).toContain('12345');
        expect(result.content[0].text).toContain('updated successfully');
        expect(confluenceService.getPage).toHaveBeenCalledTimes(1);
        expect(confluenceService.updatePage).toHaveBeenCalledWith('12345', 'Updated Title', '<p>Updated</p>', 5);
      });

      it('should retry on 409 conflict and succeed', async () => {
        const firstPage: ConfluencePage = {
          id: '12345',
          title: 'Page',
          type: 'page',
          status: 'current',
          version: { number: 5, when: '2024-01-01T00:00:00.000Z' },
        };

        const retryPage: ConfluencePage = {
          id: '12345',
          title: 'Page',
          type: 'page',
          status: 'current',
          version: { number: 6, when: '2024-01-02T00:00:00.000Z' },
        };

        confluenceService.getPage
          .mockResolvedValueOnce(firstPage)
          .mockResolvedValueOnce(retryPage);

        const conflictError = new Error('Version conflict') as Error & { statusCode: number };
        conflictError.statusCode = 409;

        confluenceService.updatePage
          .mockRejectedValueOnce(conflictError)
          .mockResolvedValueOnce(dummyUpdateResult);

        const result = await service.executeTool('confluence_update_page', {
          pageId: '12345',
          title: 'Updated Title',
          content: '<p>Updated</p>',
        });

        expect(result.content[0].text).toContain('12345');
        expect(result.content[0].text).toContain('updated successfully');
        expect(confluenceService.getPage).toHaveBeenCalledTimes(2);
        expect(confluenceService.updatePage).toHaveBeenCalledTimes(2);
        expect(confluenceService.updatePage).toHaveBeenNthCalledWith(1, '12345', 'Updated Title', '<p>Updated</p>', 5);
        expect(confluenceService.updatePage).toHaveBeenNthCalledWith(2, '12345', 'Updated Title', '<p>Updated</p>', 6);
      });

      it('should return error for non-409 errors', async () => {
        const mockPage: ConfluencePage = {
          id: '12345',
          title: 'Page',
          type: 'page',
          status: 'current',
          version: { number: 5, when: '2024-01-01T00:00:00.000Z' },
        };

        confluenceService.getPage.mockResolvedValue(mockPage);

        const serverError = new Error('Internal Server Error');
        confluenceService.updatePage.mockRejectedValueOnce(serverError);

        const result = await service.executeTool('confluence_update_page', {
          pageId: '12345',
          title: 'Updated Title',
          content: '<p>Updated</p>',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Internal Server Error');
        expect(confluenceService.getPage).toHaveBeenCalledTimes(1);
        expect(confluenceService.updatePage).toHaveBeenCalledTimes(1);
      });
    });

    describe('confluence_delete_page', () => {
      it('should delete page successfully', async () => {
        confluenceService.deletePage.mockResolvedValue(undefined);

        const result = await service.executeTool('confluence_delete_page', { pageId: '12345' });

        expect(result.content[0].text).toContain('12345');
        expect(result.content[0].text).toContain('deleted successfully');
        expect(confluenceService.deletePage).toHaveBeenCalledWith('12345');
      });
    });

    describe('confluence_get_comments', () => {
      it('should get comments and format response', async () => {
        const mockComments = {
          results: [
            {
              id: 'c1',
              type: 'comment',
              status: 'current',
              title: '',
              version: {
                number: 1,
                when: '2024-01-01T00:00:00.000Z',
                by: { displayName: 'John Doe' },
              },
              body: {
                storage: {
                  value: '<p>Great page!</p>',
                  representation: 'storage',
                },
              },
            },
            {
              id: 'c2',
              type: 'comment',
              status: 'current',
              title: '',
              version: {
                number: 1,
                when: '2024-01-02T00:00:00.000Z',
                by: { displayName: 'Jane Smith' },
              },
              body: {
                storage: {
                  value: '<p>Thanks!</p>',
                  representation: 'storage',
                },
              },
            },
          ],
          start: 0,
          limit: 25,
          size: 2,
        };

        confluenceService.getComments.mockResolvedValue(mockComments);

        const result = await service.executeTool('confluence_get_comments', { pageId: '12345' });

        const parsed = JSON.parse(result.content[0].text!);
        expect(parsed.comments).toHaveLength(2);
        expect(parsed.comments[0].id).toBe('c1');
        expect(parsed.comments[0].author).toBe('John Doe');
        expect(parsed.comments[0].body).toBe('<p>Great page!</p>');
        expect(parsed.comments[1].author).toBe('Jane Smith');
        expect(confluenceService.getComments).toHaveBeenCalledWith('12345');
      });
    });

    describe('confluence_create_space', () => {
      it('should create space successfully', async () => {
        const mockSpace = {
          id: 1,
          key: 'AIBIO',
          name: 'AIBIO Project',
        };

        confluenceService.createSpace.mockResolvedValue(mockSpace);

        const result = await service.executeTool('confluence_create_space', {
          key: 'AIBIO',
          name: 'AIBIO Project',
        });

        expect(result.content[0].text).toContain('Space created');
        expect(result.content[0].text).toContain('AIBIO Project');
        expect(result.content[0].text).toContain('AIBIO');
        expect(confluenceService.createSpace).toHaveBeenCalledWith('AIBIO', 'AIBIO Project', undefined);
      });

      it('should create space with description', async () => {
        const mockSpace = {
          id: 2,
          key: 'DEV',
          name: 'Development',
        };

        confluenceService.createSpace.mockResolvedValue(mockSpace);

        const result = await service.executeTool('confluence_create_space', {
          key: 'DEV',
          name: 'Development',
          description: 'Development space for the team',
        });

        expect(result.content[0].text).toContain('Space created');
        expect(confluenceService.createSpace).toHaveBeenCalledWith('DEV', 'Development', 'Development space for the team');
      });
    });

    describe('unknown tool', () => {
      it('should return error for unknown tool', async () => {
        const result = await service.executeTool('unknown_tool', {});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unknown Confluence tool');
      });
    });

    describe('error handling', () => {
      it('should handle generic Error', async () => {
        const errorMessage = 'API Error';
        confluenceService.search.mockRejectedValueOnce(new Error(errorMessage));

        const result = await service.executeTool('confluence_search', { cql: 'invalid' });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(errorMessage);
      });

      it('should handle non-Error exceptions', async () => {
        confluenceService.search.mockRejectedValueOnce('String error');

        const result = await service.executeTool('confluence_search', { cql: 'invalid' });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('String error');
      });

      it('should handle ConfluenceApiError', async () => {
        const apiError = new ConfluenceApiError(
          AtlassianErrorCode.NOT_FOUND,
          'Page not found',
          404,
        );

        confluenceService.getPage.mockRejectedValueOnce(apiError);

        const result = await service.executeTool('confluence_get_page', { pageId: '99999' });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Page not found');
        expect(result.content[0].text).toContain('NOT_FOUND');
        expect(result.content[0].text).toContain('404');
      });
    });
  });
});
