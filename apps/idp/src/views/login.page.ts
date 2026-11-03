export function renderLoginPage(opts: {
  continueUrl: string;
  error?: string;
}): string {
  const err = opts.error
    ? `<div class="error">${escapeHtml(opts.error)}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SSO IdP 登录</title>
  <style>
    :root { font-family: system-ui, -apple-system, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      background: linear-gradient(145deg, #0f172a, #1e293b); color: #e2e8f0; }
    .card { width: min(380px, 92vw); background: #1e293b; border: 1px solid #334155;
      border-radius: 12px; padding: 28px 24px; box-shadow: 0 20px 40px rgba(0,0,0,.35); }
    h1 { margin: 0 0 4px; font-size: 1.35rem; }
    p.sub { margin: 0 0 20px; color: #94a3b8; font-size: .9rem; }
    label { display: block; font-size: .8rem; color: #94a3b8; margin-bottom: 4px; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px;
      border: 1px solid #475569; background: #0f172a; color: #f8fafc; margin-bottom: 14px; }
    button { width: 100%; padding: 11px; border: 0; border-radius: 8px; cursor: pointer;
      background: #3b82f6; color: white; font-weight: 600; font-size: 1rem; }
    button:hover { background: #2563eb; }
    .error { background: #7f1d1d; color: #fecaca; padding: 8px 10px; border-radius: 6px;
      margin-bottom: 12px; font-size: .85rem; }
    .hint { margin-top: 16px; font-size: .78rem; color: #64748b; line-height: 1.5; }
    code { background: #0f172a; padding: 1px 5px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>教学 IdP 登录</h1>
    <p class="sub">NestJS 最小 OIDC · 会话 Cookie 驱动 SSO</p>
    ${err}
    <form method="POST" action="/login">
      <input type="hidden" name="continue" value="${escapeHtml(opts.continueUrl)}" />
      <label for="username">用户名</label>
      <input id="username" name="username" autocomplete="username" required autofocus />
      <label for="password">密码</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">登录</button>
    </form>
    <p class="hint">演示账号：<code>demo</code> / <code>demo123</code>，
      <code>admin</code> / <code>admin123</code></p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
