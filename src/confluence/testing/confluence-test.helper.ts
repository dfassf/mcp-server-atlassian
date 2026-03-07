import { Test, TestingModule } from '@nestjs/testing';
import { ConfluenceService } from '../confluence.service';
import { AtlassianHttpService } from '../../common/http/atlassian-http.service';

export async function createConfluenceTestModule() {
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ConfluenceService,
      { provide: AtlassianHttpService, useValue: mockHttpService },
    ],
  }).compile();

  return {
    service: module.get<ConfluenceService>(ConfluenceService),
    httpService: module.get(AtlassianHttpService) as jest.Mocked<AtlassianHttpService>,
  };
}
