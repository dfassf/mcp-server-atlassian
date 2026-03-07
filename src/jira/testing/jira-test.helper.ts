import { Test, TestingModule } from '@nestjs/testing';
import { JiraService } from '../jira.service';
import { AtlassianHttpService } from '../../common/http/atlassian-http.service';

export async function createJiraTestModule() {
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      JiraService,
      { provide: AtlassianHttpService, useValue: mockHttpService },
    ],
  }).compile();

  return {
    service: module.get<JiraService>(JiraService),
    httpService: module.get(AtlassianHttpService) as jest.Mocked<AtlassianHttpService>,
  };
}
