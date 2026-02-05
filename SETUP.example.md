# 개인 설정 가이드

> 이 파일을 `SETUP.md`로 복사해서 본인 환경에 맞게 수정하세요.

## 1. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 아래 값들을 수정:

```env
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your.email@company.com
JIRA_API_TOKEN=your_api_token

CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_USERNAME=your.email@company.com
CONFLUENCE_API_TOKEN=your_api_token
```

> API 토큰 발급: https://id.atlassian.com/manage-profile/security/api-tokens

## 2. 프로젝트 목록

`jira_get_all_projects` 도구로 전체 목록 조회 가능

| 키 | 이름 | 용도 |
|----|------|------|
| `PROJ` | 예시 프로젝트 | 본인 프로젝트로 수정 |

## 3. 티켓 작성 가이드

상세한 티켓 작성 규칙은 [docs/JIRA_GUIDE.md](docs/JIRA_GUIDE.md) 참고

## 4. 사용 예시

```
# 이슈 검색
jira_search: project = PROJ AND status = "진행 중"

# 이슈 생성
jira_create_issue: projectKey = "PROJ", summary = "[API] 새 기능", issueType = "Task"

# 작업 시작 댓글
jira_add_comment: issueKey = "PROJ-1", body = "✅ 작업 시작합니다."
```
