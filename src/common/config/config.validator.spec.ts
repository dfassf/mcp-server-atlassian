import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigValidator } from './config.validator';
import configuration from './configuration';

describe('ConfigValidator', () => {
  let validator: ConfigValidator;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          ignoreEnvFile: true,
        }),
      ],
      providers: [ConfigValidator],
    }).compile();

    validator = module.get<ConfigValidator>(ConfigValidator);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('validate', () => {
    it('should throw error when no services are configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      expect(() => validator.validate()).toThrow('At least one service (Jira or Confluence) must be configured');
    });

    it('should throw error when Jira URL is set but no auth credentials', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        if (key === 'jira.username') return undefined;
        if (key === 'jira.apiToken') return undefined;
        if (key === 'jira.personalToken') return undefined;
        return undefined;
      });

      expect(() => validator.validate()).toThrow('Jira: Either JIRA_PERSONAL_TOKEN or (JIRA_USERNAME + JIRA_API_TOKEN) must be provided');
    });

    it('should pass when Jira URL and username+token are set', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        if (key === 'jira.username') return 'test@example.com';
        if (key === 'jira.apiToken') return 'token123';
        return undefined;
      });

      expect(() => validator.validate()).not.toThrow();
    });

    it('should pass when Jira URL and personal token are set', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        if (key === 'jira.personalToken') return 'pat123';
        return undefined;
      });

      expect(() => validator.validate()).not.toThrow();
    });

    it('should throw error when Confluence URL is set but no auth credentials', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'confluence.url') return 'https://test.atlassian.net/wiki';
        if (key === 'confluence.username') return undefined;
        if (key === 'confluence.apiToken') return undefined;
        if (key === 'confluence.personalToken') return undefined;
        return undefined;
      });

      expect(() => validator.validate()).toThrow('Confluence: Either CONFLUENCE_PERSONAL_TOKEN or (CONFLUENCE_USERNAME + CONFLUENCE_API_TOKEN) must be provided');
    });

    it('should pass when both Jira and Confluence are properly configured', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jira.url') return 'https://test.atlassian.net';
        if (key === 'jira.username') return 'test@example.com';
        if (key === 'jira.apiToken') return 'token123';
        if (key === 'confluence.url') return 'https://test.atlassian.net/wiki';
        if (key === 'confluence.username') return 'test@example.com';
        if (key === 'confluence.apiToken') return 'token123';
        return undefined;
      });

      expect(() => validator.validate()).not.toThrow();
    });
  });
});
