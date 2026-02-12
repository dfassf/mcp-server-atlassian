import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { OAuthTokens } from './oauth.types';

@Injectable()
export class TokenStoreService {
  private readonly tokenDir: string;
  private readonly tokenPath: string;

  constructor() {
    this.tokenDir = path.join(os.homedir(), '.mcp-atlassian');
    this.tokenPath = path.join(this.tokenDir, 'tokens.json');
  }

  /** 저장된 OAuth 토큰 로드 */
  async loadTokens(): Promise<OAuthTokens | null> {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf-8');
      return JSON.parse(data) as OAuthTokens;
    } catch {
      return null;
    }
  }

  /** OAuth 토큰 저장 (파일 권한 0600) */
  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await fs.mkdir(this.tokenDir, { recursive: true });
    await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2), {
      mode: 0o600,
    });
  }

  /** 저장된 OAuth 토큰 삭제 */
  async deleteTokens(): Promise<void> {
    try {
      await fs.unlink(this.tokenPath);
    } catch {
      // 파일이 없으면 무시
    }
  }
}
