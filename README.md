# Local MCP Atlassian

NestJS 기반 MCP(Model Context Protocol) 서버 - Jira & Confluence 연동

## 개요

Claude, Cursor AI 등 AI 어시스턴트가 Jira/Confluence와 직접 연동할 수 있도록 해주는 MCP(Model Context Protocol) 서버입니다. 검증된 오픈소스 프로젝트도 있으나 혹시 모를 보안 문제 때문에 자체적으로 구현했습니다. 기능 종류는 오픈소스 프로젝트들을 취합하였습니다.

### MCP 서버란?

MCP(Model Context Protocol)는 AI 어시스턴트가 외부 시스템과 상호작용할 수 있도록 하는 표준 프로토콜입니다. 이 서버는 MCP SDK를 사용하여 Jira와 Confluence API를 도구(Tools)로 노출시킵니다.

**작동 방식:**
1. AI 어시스턴트(Claude Desktop, Cursor 등)가 MCP 서버에 연결
2. 서버는 사용 가능한 도구 목록을 제공 (예: `jira_search`, `jira_create_issue` 등)
3. AI가 사용자 요청에 따라 적절한 도구를 호출
4. 서버는 Atlassian API를 호출하고 결과를 AI에게 반환

**제공하는 도구:**
- **Jira 도구 18개**: 이슈 검색/생성/수정/삭제, 상태 변경, 댓글 관리, 이슈 연결, 메타데이터 조회 등
- **Confluence 도구 6개**: 페이지 검색/생성/수정/삭제, 댓글 조회 등

이를 통해 AI 어시스턴트가 자연어로 "PROJ-123 이슈를 진행 중으로 변경해줘"라고 요청하면, 서버가 자동으로 해당 이슈의 상태를 변경할 수 있습니다.

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

### MCP 서버 작동 원리

이 서버는 `@modelcontextprotocol/sdk`를 사용하여 구현되었습니다:

1. **서버 초기화** (`src/mcp/mcp.service.ts`):
   - MCP Server 인스턴스 생성
   - STDIO 전송 방식으로 AI 어시스턴트와 통신
   - 도구 목록 및 실행 핸들러 등록

2. **도구 등록**:
   - Jira 도구: `JiraToolsService.getTools()`로 18개 도구 제공
   - Confluence 도구: `ConfluenceToolsService.getTools()`로 6개 도구 제공
   - 총 24개 도구를 AI 어시스턴트에 노출

3. **도구 실행**:
   - AI가 도구 호출 요청 시 `CallToolRequestSchema` 핸들러가 실행
   - 도구 이름에 따라 적절한 서비스로 라우팅 (`jira_*` → JiraToolsService, `confluence_*` → ConfluenceToolsService)
   - 결과를 `ToolResult` 형식으로 반환

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

설정 후 Claude Desktop을 재시작하면, Claude가 자동으로 사용 가능한 도구 목록을 확인하고 사용할 수 있습니다.

### 사용 예시

Claude Desktop에서 다음과 같이 요청할 수 있습니다:

```
"PROJ 프로젝트에서 진행 중인 이슈를 찾아줘"
→ jira_search 도구 호출: { jql: "project = PROJ AND status = '진행 중'" }

"새로운 버그 이슈를 생성해줘: API 에러 처리 개선"
→ jira_create_issue 도구 호출: { projectKey: "PROJ", summary: "API 에러 처리 개선", issueType: "Bug" }

"PROJ-123 이슈를 완료 상태로 변경해줘"
→ jira_transition_issue 도구 호출: { issueKey: "PROJ-123", transitionName: "Done" }
```

AI가 자동으로 적절한 도구를 선택하고 실행합니다.

## 개발

```bash
# 빌드
npm run build

# 테스트
npm run test
```

## 아키텍처

### 프로젝트 구조

```
src/
├── mcp/                    # MCP 서버 핵심 로직
│   ├── mcp.service.ts      # MCP Server 초기화 및 도구 라우팅
│   └── mcp.module.ts
├── jira/                   # Jira 도구 구현
│   ├── jira.service.ts     # Jira API 클라이언트
│   ├── jira.tools.ts       # Jira 도구 정의 및 실행 로직
│   └── jira.module.ts
├── confluence/             # Confluence 도구 구현
│   ├── confluence.service.ts
│   ├── confluence.tools.ts
│   └── confluence.module.ts
├── common/                 # 공통 모듈
│   ├── http/               # HTTP 클라이언트 (인증, 에러 핸들링)
│   ├── config/             # 설정 및 검증
│   ├── logger/             # 구조화된 로깅
│   └── utils/              # 유틸리티 함수
└── types/                  # TypeScript 타입 정의
```

### 핵심 컴포넌트

1. **MCP Service** (`src/mcp/mcp.service.ts`):
   - MCP SDK의 `Server` 클래스를 사용하여 서버 생성
   - `StdioServerTransport`로 표준 입출력을 통한 통신
   - 도구 목록 제공 (`ListToolsRequestSchema`) 및 도구 실행 (`CallToolRequestSchema`) 핸들러 구현

2. **HTTP Service** (`src/common/http/atlassian-http.service.ts`):
   - Axios 기반 HTTP 클라이언트
   - Basic Auth 및 Personal Access Token 지원
   - 에러 인터셉터를 통한 사용자 친화적 에러 메시지 변환

3. **Tools Services** (`src/jira/jira.tools.ts`, `src/confluence/confluence.tools.ts`):
   - 각 도구의 스키마 정의 및 실행 로직 구현
   - Zod를 사용한 입력 검증
   - `ToolResult` 형식으로 결과 반환

## 기술 스택

- **NestJS**: 모듈화된 아키텍처 및 의존성 주입
- **TypeScript**: 타입 안정성 및 개발자 경험 향상
- **@modelcontextprotocol/sdk**: MCP 프로토콜 구현
- **Zod**: 런타임 스키마 검증
- **Axios**: HTTP 클라이언트
- **Jest**: 테스트 프레임워크 (48개 테스트, 높은 커버리지)

## 라이선스

MIT
