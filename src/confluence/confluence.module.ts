import { Module } from '@nestjs/common';
import { ConfluenceService } from './confluence.service';
import { ConfluenceToolsService } from './confluence.tools';

@Module({
  providers: [ConfluenceService, ConfluenceToolsService],
  exports: [ConfluenceService, ConfluenceToolsService],
})
export class ConfluenceModule {}
