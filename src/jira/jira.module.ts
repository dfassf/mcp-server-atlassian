import { Module } from '@nestjs/common';
import { JiraService } from './jira.service';
import { JiraToolsService } from './jira.tools';

@Module({
  providers: [JiraService, JiraToolsService],
  exports: [JiraService, JiraToolsService],
})
export class JiraModule {}
