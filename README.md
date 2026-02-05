# Local MCP Atlassian

NestJS 기반 MCP(Model Context Protocol) 서버 - Jira & Confluence 연동

## 개요

Claude, Cursor AI 등 AI 어시스턴트가 Jira/Confluence와 직접 연동할 수 있도록 해주는 MCP 서버입니다. 검증된 오픈소스 프로젝트도 있으나 혹시 모를 보안 문제 때문에 자체적으로 구현했습니다. 기능 종류는 오픈소스 프로젝트들을 취합하였습니다.

## 초기 설정

```bash
cp SETUP.example.md SETUP.md
cp .env.example .env
```

`SETUP.md`의 가이드를 따라 환경변수와 프로젝트 목록을 설정하세요.

티켓 작성 규칙은 [docs/JIRA_GUIDE.md](docs/JIRA_GUIDE.md) 참고

## 기능

### Jira - 기본

| 도구 | 설명 |
|------|------|
| `jira_search` | JQL로 이슈 검색 |
| `jira_get_issue` | 이슈 상세 조회 |
| `jira_create_issue` | 이슈 생성 (assignee, priority, labels 지원) |
| `jira_update_issue` | 이슈 수정 |
| `jira_delete_issue` | 이슈 삭제 |
| `jira_transition_issue` | 이슈 상태 변경 |
| `jira_add_comment` | 댓글 추가 |
| `jira_get_comments` | 댓글 목록 조회 |
| `jira_delete_comment` | 댓글 삭제 |

### Jira - 연결 및 메타데이터

| 도구 | 설명 |
|------|------|
| `jira_create_issue_link` | 이슈 연결 (blocks, relates 등) |
| `jira_remove_issue_link` | 이슈 연결 해제 |
| `jira_get_link_types` | 링크 타입 목록 조회 |
| `jira_get_all_projects` | 전체 프로젝트 목록 |
| `jira_get_statuses` | 상태 목록 조회 |
| `jira_get_issue_types` | 이슈 타입 목록 (Task, Bug, Story 등) |
| `jira_get_priorities` | 우선순위 목록 (Highest~Lowest) |
| `jira_get_transitions` | 이슈별 가능한 상태 전환 목록 |

### Confluence (보류 - 유료 전환 후 테스트 예정)

| 도구 | 설명 |
|------|------|
| `confluence_search` | CQL로 페이지 검색 |
| `confluence_get_page` | 페이지 조회 |
| `confluence_create_page` | 페이지 생성 |
| `confluence_update_page` | 페이지 수정 |
| `confluence_delete_page` | 페이지 삭제 |
| `confluence_get_comments` | 페이지 댓글 조회 |

## 주의사항

- 댓글에서 `(/)`, `(x)` 같은 위키 마크업 이모티콘은 Jira Cloud ADF에서 자동 변환되지 않음
  - 직접 이모지 사용 권장: ✅, ❌, ⚠️
- assignee는 이메일 또는 accountId 모두 사용 가능 (이메일 입력 시 자동 변환)
- 핫리로드 미지원 - 기능 추가 후 빌드 & MCP 서버 재시작 필요

## 설치

```bash
npm install
npm run build
```

## 설정

`.env` 파일 생성:

```env
# Jira Cloud
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your.email@company.com
JIRA_API_TOKEN=your_api_token

# Confluence Cloud
CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_USERNAME=your.email@company.com
CONFLUENCE_API_TOKEN=your_api_token
```

## 사용법

### Claude Desktop 설정

`~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "local-atlassian": {
      "command": "node",
      "args": ["/path/to/local-mcp-atlassian/dist/main.js"],
      "env": {
        "JIRA_URL": "https://your-company.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "your_api_token",
        "CONFLUENCE_URL": "https://your-company.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your.email@company.com",
        "CONFLUENCE_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

## 개발

```bash
# 빌드
npm run build

# 테스트
npm run test
```

## 기술 스택

- NestJS
- TypeScript
- @modelcontextprotocol/sdk
- Zod (스키마 검증)

## 라이선스

MIT
