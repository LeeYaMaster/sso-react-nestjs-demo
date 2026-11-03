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
          <span className="badge">SPA · 5173</span>
          <h1>{APP_NAME}</h1>
          <p className="muted">OIDC 客户端 client_id = <code>app-a-portal</code></p>
        </div>
        <nav className="nav">
          <a href={SIBLING_APP_URL} target="_blank" rel="noreferrer">
            打开后台 App B →
          </a>
        </nav>
      </header>

      <main className="card">
        {!loggedIn ? (
          <>
            <h2>尚未登录</h2>
            <p>
              点击下方按钮会跳转到 IdP <code>/authorize</code>（带 PKCE）。
              首次需要输入密码；若 IdP 已有会话 Cookie，则会静默发码（SSO）。
            </p>
            <button
              className="btn"
              onClick={() => {
                // STEP 1: redirect to IdP /authorize with code_challenge
                void oidc.login('/');
              }}
            >
              使用 SSO 登录
            </button>
          </>
        ) : (
          <>
            <h2>已登录</h2>
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
                  // Clears local tokens AND IdP session cookie via /logout
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
              体验 SSO：保持本页登录状态，点击右上角打开 <strong>App B</strong>，
              在 App B 点「登录」——应不再要求密码（IdP Cookie 仍在）。
              若点「仅清本地 Token」，再登录仍可 SSO；若点完整登出，两站都需重新输密码。
            </p>
          </>
        )}
      </main>
    </div>
  );
}
