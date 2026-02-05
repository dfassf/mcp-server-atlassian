import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpModule } from './mcp/mcp.module';
import { JiraModule } from './jira/jira.module';
import { ConfluenceModule } from './confluence/confluence.module';
import { CommonModule } from './common/common.module';
import configuration from './common/config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule,
    McpModule,
    JiraModule,
    ConfluenceModule,
  ],
})
export class AppModule {}
