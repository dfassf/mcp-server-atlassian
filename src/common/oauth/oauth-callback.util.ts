import * as http from 'http';
import { openBrowser } from '../utils/open-browser.util';

const AUTH_TIMEOUT_MS = 3 * 60 * 1000;

const SUCCESS_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>MCP Atlassian</title></head>
<body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="text-align:center;background:#fff;padding:48px 64px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
<svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin-bottom:16px"><circle cx="12" cy="12" r="12" fill="#36B37E"/><path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
<h1 style="margin:0 0 8px;font-size:24px;color:#172B4D">인증 완료</h1>
<p style="margin:0;color:#6B778C;font-size:15px">이 창을 닫고 터미널로 돌아가세요.</p>
</div></body></html>`;

const HTML_HEADER = { 'Content-Type': 'text/html; charset=utf-8' } as const;

/** 임시 HTTP 서버로 OAuth 콜백을 수신하고 인가 코드를 반환 */
export function waitForOAuthCallback(
  port: number,
  expectedState: string,
  authUrl: string,
  onBrowserError?: () => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanup = (server: http.Server, timer: NodeJS.Timeout) => {
      clearTimeout(timer);
      server.close();
    };

    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, HTML_HEADER);
        res.end('<h1>인증 실패</h1><p>브라우저를 닫아도 됩니다.</p>');
        cleanup(server, timeout);
        reject(new Error(`OAuth 인증 거부: ${error}`));
        return;
      }

      if (!code || state !== expectedState) {
        res.writeHead(400, HTML_HEADER);
        res.end('<h1>잘못된 요청</h1>');
        cleanup(server, timeout);
        reject(new Error('OAuth state 불일치 또는 code 누락'));
        return;
      }

      res.writeHead(200, HTML_HEADER);
      res.end(SUCCESS_HTML);
      cleanup(server, timeout);
      resolve(code);
    });

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error(`OAuth 인증 타임아웃 (${AUTH_TIMEOUT_MS / 1000}초)`));
    }, AUTH_TIMEOUT_MS);

    server.listen(port, () => openBrowser(authUrl, onBrowserError));
    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`콜백 서버 시작 실패 (포트 ${port}): ${err.message}`));
    });
  });
}
