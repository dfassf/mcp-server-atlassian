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
  constructor(private configValidator: ConfigValidator) {}

  onModuleInit() {
    this.configValidator.validate();
  }
}
