import { Module, Global, OnModuleInit } from '@nestjs/common';
import { AtlassianHttpService } from './http/atlassian-http.service';
import { ConfigValidator } from './config/config.validator';
import { LoggerService } from './logger/logger.service';
import { OAuthService } from './oauth/oauth.service';
import { TokenStoreService } from './oauth/token-store.service';

@Global()
@Module({
  providers: [
    AtlassianHttpService,
    ConfigValidator,
    LoggerService,
    OAuthService,
    TokenStoreService,
  ],
  exports: [
    AtlassianHttpService,
    ConfigValidator,
    LoggerService,
    OAuthService,
    TokenStoreService,
  ],
})
export class CommonModule implements OnModuleInit {
  constructor(
    private configValidator: ConfigValidator,
    private httpService: AtlassianHttpService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('CommonModule');
  }

  async onModuleInit() {
    try {
      this.configValidator.validate();
      this.logger.log('Configuration validated successfully');

      // OAuth 모드일 때 비동기 클라이언트 초기화
      await this.httpService.initializeOAuthClients();
    } catch (error) {
      this.logger.error(
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
