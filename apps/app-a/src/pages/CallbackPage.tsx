import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { oidc } from '../auth/oidc';

/**
 * OIDC redirect_uri landing page.
 * Browser lands here with ?code=&state= after IdP /authorize.
 * We exchange the code for tokens (PKCE) then navigate home.
 */
export default function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // STEP 2+3: validate state, POST /token with code_verifier
        const returnTo = await oidc.handleCallback(window.location.search);
        if (!cancelled) navigate(returnTo || '/', { replace: true });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="shell">
        <div className="card">
          <h1>登录回调失败</h1>
          <pre className="error-box">{error}</pre>
          <a href="/">返回首页</a>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="card">
        <h1>正在完成登录…</h1>
        <p className="muted">用授权码换取 access_token / id_token（PKCE）</p>
      </div>
    </div>
  );
}
