import { useMemo, useState } from 'react';
import { truncateToken } from '@sso/oidc-client';
import { APP_ACCENT, APP_NAME, SIBLING_APP_URL, oidc } from '../auth/oidc';

export default function HomePage() {
  const [, bump] = useState(0);
  const loggedIn = oidc.isLoggedIn();
  const profile = useMemo(() => oidc.getProfile(), [loggedIn, bump]);
  const tokens = useMemo(() => oidc.getTokens(), [loggedIn, bump]);

  return (
    <div className="shell" style={{ ['--accent' as string]: APP_ACCENT }}>
      <header className="top">
        <div>
          <span className="badge">SPA · 5174</span>
          <h1>{APP_NAME}</h1>
          <p className="muted">OIDC 客户端 client_id = <code>app-b-admin</code></p>
        </div>
        <nav className="nav">
          <a href={SIBLING_APP_URL} target="_blank" rel="noreferrer">
            ← 打开门户 App A
          </a>
        </nav>
      </header>

      <main className="card">
        {!loggedIn ? (
          <>
            <h2>尚未登录</h2>
            <p>
              若你已在 <strong>App A</strong> 登录且未做 IdP 登出，这里点登录应
              <strong>不再要求密码</strong>——这就是 SSO：浏览器带着 IdP 的
              <code>idp_sid</code> Cookie 访问 <code>/authorize</code>，IdP 直接发授权码。
            </p>
            <button
              className="btn"
              onClick={() => {
                void oidc.login('/');
              }}
            >
              使用 SSO 登录
            </button>
          </>
        ) : (
          <>
            <h2>已登录（可能来自 SSO）</h2>
            <dl className="kv">
              <dt>用户</dt>
              <dd>
                {profile?.name || profile?.preferred_username || profile?.sub}
              </dd>
              <dt>sub</dt>
              <dd>
                <code>{profile?.sub}</code>
              </dd>
              <dt>email</dt>
              <dd>{profile?.email}</dd>
              <dt>roles</dt>
              <dd>{(profile?.roles || []).join(', ') || '—'}</dd>
              <dt>access_token</dt>
              <dd>
                <code title={tokens?.access_token}>
                  {tokens ? truncateToken(tokens.access_token) : '—'}
                </code>
              </dd>
              <dt>id_token</dt>
              <dd>
                <code title={tokens?.id_token}>
                  {tokens ? truncateToken(tokens.id_token) : '—'}
                </code>
              </dd>
            </dl>

            <div className="actions">
              <button
                className="btn"
                onClick={() => {
                  void oidc.fetchUserInfo().then(() => bump((n) => n + 1));
                }}
              >
                刷新 userinfo
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  void oidc.logout();
                }}
              >
                登出（清本地 + IdP 会话）
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  oidc.logoutLocal();
                  bump((n) => n + 1);
                }}
              >
                仅清本地 Token
              </button>
            </div>

            <p className="tip">
              注意：App A 与 App B 的 Token 存在各自 origin 的 localStorage 中，
              互不共享。共享的是 <em>IdP 域名</em> 下的会话 Cookie，因此「免密」发生在
              再次走 /authorize 时，而不是直接复用对方的 access_token。
            </p>
          </>
        )}
      </main>
    </div>
  );
}
