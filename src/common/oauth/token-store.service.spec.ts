import { TokenStoreService } from './token-store.service';
import { OAuthTokens } from './oauth.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

jest.mock('fs/promises');
const mockedFs = jest.mocked(fs);

describe('TokenStoreService', () => {
  let service: TokenStoreService;
  const expectedDir = path.join(os.homedir(), '.mcp-atlassian');
  const expectedPath = path.join(expectedDir, 'tokens.json');

  const mockTokens: OAuthTokens = {
    accessToken: 'access-123',
    refreshToken: 'refresh-456',
    expiresAt: Date.now() + 3600000,
    cloudId: 'cloud-789',
    siteName: 'Test Site',
    siteUrl: 'https://test.atlassian.net',
  };

  beforeEach(() => {
    service = new TokenStoreService();
    jest.clearAllMocks();
  });

  describe('loadTokens', () => {
    it('should load and parse tokens from file', async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockTokens));

      const result = await service.loadTokens();

      expect(result).toEqual(mockTokens);
      expect(mockedFs.readFile).toHaveBeenCalledWith(expectedPath, 'utf-8');
    });

    it('should return null when file does not exist', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await service.loadTokens();

      expect(result).toBeNull();
    });

    it('should return null when file contains invalid JSON', async () => {
      mockedFs.readFile.mockResolvedValue('invalid json');

      const result = await service.loadTokens();

      expect(result).toBeNull();
    });
  });

  describe('saveTokens', () => {
    it('should create directory and save tokens', async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await service.saveTokens(mockTokens);

      expect(mockedFs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expectedPath,
        JSON.stringify(mockTokens, null, 2),
        { mode: 0o600 },
      );
    });
  });

  describe('deleteTokens', () => {
    it('should delete tokens file', async () => {
      mockedFs.unlink.mockResolvedValue(undefined);

      await service.deleteTokens();

      expect(mockedFs.unlink).toHaveBeenCalledWith(expectedPath);
    });

    it('should not throw when file does not exist', async () => {
      mockedFs.unlink.mockRejectedValue(new Error('ENOENT'));

      await expect(service.deleteTokens()).resolves.not.toThrow();
    });
  });
});
