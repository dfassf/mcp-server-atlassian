import { Module, Global, OnModuleInit } from '@nestjs/common';
import { AtlassianHttpService } from './http/atlassian-http.service';
import { ConfigValidator } from './config/config.validator';
import { LoggerService } from './logger/logger.service';

@Global()
@Module({
  providers: [AtlassianHttpService, ConfigValidator, LoggerService],
  exports: [AtlassianHttpService, ConfigValidator, LoggerService],
})
export class CommonModule implements OnModuleInit {
  constructor(
    private configValidator: ConfigValidator,
    private logger: LoggerService,
  ) {
    this.logger.setContext('CommonModule');
  }

  onModuleInit() {
    try {
      this.configValidator.validate();
      this.logger.log('Configuration validated successfully');
    } catch (error) {
      this.logger.error(
        `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
