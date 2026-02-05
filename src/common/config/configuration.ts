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
  mcp: {
    transport: process.env.MCP_TRANSPORT || 'stdio',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
});
