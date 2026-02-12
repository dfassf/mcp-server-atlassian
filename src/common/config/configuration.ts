export default () => ({
  jira: {
    url: process.env.JIRA_URL,
    username: process.env.JIRA_USERNAME,
    apiToken: process.env.JIRA_API_TOKEN,
    personalToken: process.env.JIRA_PERSONAL_TOKEN,
  },
  confluence: {
    url: process.env.CONFLUENCE_URL,
    username: process.env.CONFLUENCE_USERNAME,
    apiToken: process.env.CONFLUENCE_API_TOKEN,
    personalToken: process.env.CONFLUENCE_PERSONAL_TOKEN,
  },
  oauth: {
    clientId: process.env.ATLASSIAN_OAUTH_CLIENT_ID,
    clientSecret: process.env.ATLASSIAN_OAUTH_CLIENT_SECRET,
    callbackPort: parseInt(process.env.OAUTH_CALLBACK_PORT || '18080', 10),
    siteName: process.env.ATLASSIAN_SITE_NAME,
  },
  mcp: {
    transport: process.env.MCP_TRANSPORT || 'stdio',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  http: {
    timeout: parseInt(process.env.HTTP_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.HTTP_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.HTTP_RETRY_DELAY || '1000', 10),
  },
});
