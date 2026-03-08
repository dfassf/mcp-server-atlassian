import { exec } from 'child_process';

/** OS에 맞는 브라우저로 URL 열기 */
export function openBrowser(url: string, onError?: () => void): void {
  const command =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(command, (err) => {
    if (err) onError?.();
  });
}
