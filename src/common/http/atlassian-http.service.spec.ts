import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AtlassianHttpService } from './atlassian-http.service';
import configuration from '../config/configuration';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AtlassianHttpService', () => {
  let service: AtlassianHttpService;
  let configService: ConfigService;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;

  beforeEach(async () => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    } as unknown as jest.Mocked<AxiosInstance>;

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          ignoreEnvFile: true,
        }),
      ],
      providers: [AtlassianHttpService],
    }).compile();

    service = module.get<AtlassianHttpService>(AtlassianHttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeClients', () => {
    it('should create Jira client when URL is provided', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        if (key === 'jira.username') return 'test@example.com';
        if (key === 'jira.apiToken') return 'token123';
        return undefined;
      });

      const newService = new AtlassianHttpService(configService);
      expect(mockedAxios.create).toHaveBeenCalled();
    });

    it('should throw error when no auth credentials provided', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        return undefined;
      });

      expect(() => new AtlassianHttpService(configService)).toThrow(
        'Authentication required: either personalToken or (username + apiToken) must be provided',
      );
    });

    it('should use personal token when provided', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        if (key === 'jira.personalToken') return 'pat123';
        return undefined;
      });

      new AtlassianHttpService(configService);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer pat123',
          }),
        }),
      );
    });

    it('should use basic auth when username and token provided', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        if (key === 'jira.username') return 'test@example.com';
        if (key === 'jira.apiToken') return 'token123';
        return undefined;
      });

      new AtlassianHttpService(configService);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        }),
      );
    });
  });

  describe('getClient', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        if (key === 'jira.username') return 'test@example.com';
        if (key === 'jira.apiToken') return 'token123';
        return undefined;
      });
      // 클라이언트 재초기화
      (service as unknown as { initializeClients: () => void }).initializeClients();
    });

    it('should return client when configured', () => {
      const client = service.getClient('jira');
      expect(client).toBeDefined();
    });

    it('should throw error when client not configured', () => {
      expect(() => service.getClient('confluence')).toThrow(
        'confluence client not configured. Check environment variables.',
      );
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        if (key === 'jira.username') return 'test@example.com';
        if (key === 'jira.apiToken') return 'token123';
        return undefined;
      });
      // 클라이언트 재초기화
      (service as unknown as { initializeClients: () => void }).initializeClients();
    });

    it('should handle GET request', async () => {
      const mockData = { id: '1', name: 'test' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });

      const result = await service.get('jira', '/test');
      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
    });

    it('should handle POST request', async () => {
      const mockData = { id: '1' };
      const postData = { name: 'test' };
      mockAxiosInstance.post.mockResolvedValue({ data: mockData });

      const result = await service.post('jira', '/test', postData);
      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, undefined);
    });

    it('should handle PUT request', async () => {
      const mockData = { id: '1' };
      const putData = { name: 'updated' };
      mockAxiosInstance.put.mockResolvedValue({ data: mockData });

      const result = await service.put('jira', '/test', putData);
      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', putData, undefined);
    });

    it('should handle DELETE request', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await service.delete('jira', '/test');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', undefined);
    });

    // Note: 인터셉터 테스트는 실제 axios 인스턴스가 필요하므로 통합 테스트에서 수행
    it.skip('should handle API errors with proper message', async () => {
      // 인터셉터는 실제 axios 인스턴스에서만 작동하므로 통합 테스트에서 검증 필요
    });

    it.skip('should handle network errors', async () => {
      // 인터셉터는 실제 axios 인스턴스에서만 작동하므로 통합 테스트에서 검증 필요
    });
  });
});
