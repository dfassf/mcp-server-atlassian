import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import { TokenStoreService } from './token-store.service';
import { OAuthTokens } from './oauth.types';
import { LoggerService } from '../logger/logger.service';
import axios from 'axios';
import configuration from '../config/configuration';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OAuthService', () => {
  let service: OAuthService;
  let tokenStore: jest.Mocked<TokenStoreService>;
  let configService: ConfigService;

  const mockTokens: OAuthTokens = {
    accessToken: 'access-123',
    refreshToken: 'refresh-456',
    expiresAt: Date.now() + 3600000, // 1시간 후
    cloudId: 'cloud-789',
    siteName: 'Test Site',
    siteUrl: 'https://test.atlassian.net',
  };

  beforeEach(async () => {
    const mockTokenStore = {
      loadTokens: jest.fn(),
      saveTokens: jest.fn(),
      deleteTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          ignoreEnvFile: true,
        }),
      ],
      providers: [
        OAuthService,
        LoggerService,
        { provide: TokenStoreService, useValue: mockTokenStore },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    tokenStore = module.get(TokenStoreService) as jest.Mocked<TokenStoreService>;
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('isTokenExpired', () => {
    it('should return false when token is valid', () => {
      const tokens: OAuthTokens = {
        ...mockTokens,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10분 후
      };
      expect(service.isTokenExpired(tokens)).toBe(false);
    });

    it('should return true when token expires within 5 minutes', () => {
      const tokens: OAuthTokens = {
        ...mockTokens,
        expiresAt: Date.now() + 4 * 60 * 1000, // 4분 후 (5분 버퍼 이내)
      };
      expect(service.isTokenExpired(tokens)).toBe(true);
    });

    it('should return true when token is already expired', () => {
      const tokens: OAuthTokens = {
        ...mockTokens,
        expiresAt: Date.now() - 1000, // 이미 만료
      };
      expect(service.isTokenExpired(tokens)).toBe(true);
    });

    it('should return true at exactly 5 minutes before expiry', () => {
      const tokens: OAuthTokens = {
        ...mockTokens,
        expiresAt: Date.now() + 5 * 60 * 1000, // 정확히 5분 후
      };
      expect(service.isTokenExpired(tokens)).toBe(true);
    });
  });

  describe('getValidAccessToken', () => {
    it('should return access token when valid', async () => {
      tokenStore.loadTokens.mockResolvedValue(mockTokens);

      const result = await service.getValidAccessToken();

      expect(result).toBe('access-123');
      expect(tokenStore.loadTokens).toHaveBeenCalled();
    });

    it('should throw when no tokens exist', async () => {
      tokenStore.loadTokens.mockResolvedValue(null);

      await expect(service.getValidAccessToken()).rejects.toThrow(
        'OAuth 토큰이 없습니다',
      );
    });

    it('should refresh and return new token when expired', async () => {
      const expiredTokens: OAuthTokens = {
        ...mockTokens,
        expiresAt: Date.now() - 1000,
      };
      const newTokens: OAuthTokens = {
        ...mockTokens,
        accessToken: 'new-access-token',
        expiresAt: Date.now() + 3600000,
      };

      tokenStore.loadTokens
        .mockResolvedValueOnce(expiredTokens) // getValidAccessToken 호출
        .mockResolvedValueOnce(expiredTokens); // refreshTokens 내부 호출

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'oauth.clientId') return 'test-client-id';
        if (key === 'oauth.clientSecret') return 'test-client-secret';
        return undefined;
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'read:jira-work',
        },
      });

      tokenStore.saveTokens.mockResolvedValue(undefined);

      const result = await service.getValidAccessToken();

      expect(result).toBe('new-access-token');
    });
  });

  describe('refreshTokens', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'oauth.clientId') return 'test-client-id';
        if (key === 'oauth.clientSecret') return 'test-client-secret';
        return undefined;
      });
    });

    it('should refresh tokens successfully', async () => {
      tokenStore.loadTokens.mockResolvedValue(mockTokens);
      tokenStore.saveTokens.mockResolvedValue(undefined);

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'read:jira-work',
        },
      });

      const result = await service.refreshTokens();

      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
      expect(result.cloudId).toBe(mockTokens.cloudId); // cloudId 유지
      expect(tokenStore.saveTokens).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://auth.atlassian.com/oauth/token',
        {
          grant_type: 'refresh_token',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: mockTokens.refreshToken,
        },
      );
    });

    it('should throw when no tokens to refresh', async () => {
      tokenStore.loadTokens.mockResolvedValue(null);

      await expect(service.refreshTokens()).rejects.toThrow(
        '갱신할 OAuth 토큰이 없습니다',
      );
    });

    it('should delete tokens and throw on 400 error (expired refresh token)', async () => {
      tokenStore.loadTokens.mockResolvedValue(mockTokens);
      tokenStore.deleteTokens.mockResolvedValue(undefined);

      const axiosError = {
        response: { status: 400 },
        isAxiosError: true,
      };
      mockedAxios.post.mockRejectedValue(axiosError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(service.refreshTokens()).rejects.toThrow(
        'Refresh token이 만료되었습니다',
      );
      expect(tokenStore.deleteTokens).toHaveBeenCalled();
    });

    it('should deduplicate concurrent refresh calls', async () => {
      tokenStore.loadTokens.mockResolvedValue(mockTokens);
      tokenStore.saveTokens.mockResolvedValue(undefined);

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'read:jira-work',
        },
      });

      const [result1, result2] = await Promise.all([
        service.refreshTokens(),
        service.refreshTokens(),
      ]);

      expect(result1).toEqual(result2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // 한 번만 호출
    });
  });

  describe('getAccessibleResources', () => {
    it('should return accessible resources', async () => {
      const mockResources = [
        {
          id: 'cloud-123',
          name: 'Test Site',
          url: 'https://test.atlassian.net',
          scopes: ['read:jira-work'],
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: mockResources });

      const result = await service.getAccessibleResources('test-token');

      expect(result).toEqual(mockResources);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.atlassian.com/oauth/token/accessible-resources',
        { headers: { Authorization: 'Bearer test-token' } },
      );
    });

    it('should return empty array when no resources', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      const result = await service.getAccessibleResources('test-token');

      expect(result).toEqual([]);
    });
  });
});
