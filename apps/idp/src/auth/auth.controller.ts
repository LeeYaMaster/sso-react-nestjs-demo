import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { SessionService } from './session.service';
import { renderLoginPage } from '../views/login.page';

@Controller()
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {}

  @Get('login')
  loginPage(
    @Query('continue') cont: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const sid = req.cookies?.[SessionService.COOKIE_NAME] as string | undefined;
    const session = this.sessions.get(sid);
    // Already logged in → bounce back to continue URL (usually /authorize)
    if (session && cont) {
      return res.redirect(cont);
    }
    res.type('html').send(renderLoginPage({ continueUrl: cont || '/', error }));
  }

  @Post('login')
  loginSubmit(
    @Body() body: { username?: string; password?: string; continue?: string },
    @Res() res: Response,
  ) {
    const username = (body.username || '').trim();
    const password = body.password || '';
    const cont = body.continue || '/';

    const user = this.users.findByUsername(username);
    if (!user || !this.users.verifyPassword(user, password)) {
      const q = new URLSearchParams({
        continue: cont,
        error: '用户名或密码错误',
      });
      return res.redirect(`/login?${q.toString()}`);
    }

    const session = this.sessions.create(user.id, user.username);

    // SameSite=Lax: cookie is sent on top-level navigations (redirect SSO),
    // but not on cross-site XHR/fetch from other origins — good educational default.
    res.cookie(SessionService.COOKIE_NAME, session.sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // localhost HTTP demo
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.redirect(cont);
  }

  @Get('logout')
  logoutGet(
    @Query('post_logout_redirect_uri') postLogout: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.clearAndRedirect(req, res, postLogout);
  }

  @Post('logout')
  logoutPost(
    @Query('post_logout_redirect_uri') postLogout: string | undefined,
    @Body() body: { post_logout_redirect_uri?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.clearAndRedirect(
      req,
      res,
      postLogout || body.post_logout_redirect_uri,
    );
  }

  private clearAndRedirect(
    req: Request,
    res: Response,
    postLogout?: string,
  ) {
    const sid = req.cookies?.[SessionService.COOKIE_NAME] as string | undefined;
    this.sessions.destroy(sid);
    res.clearCookie(SessionService.COOKIE_NAME, { path: '/' });

    const allowed = [
      'http://localhost:5173/',
      'http://localhost:5173',
      'http://localhost:5174/',
      'http://localhost:5174',
    ];
    if (postLogout && allowed.some((a) => postLogout.startsWith(a.replace(/\/$/, '') + '/') || postLogout === a || postLogout.replace(/\/$/, '') === a.replace(/\/$/, ''))) {
      return res.redirect(postLogout);
    }
    if (postLogout && (postLogout.startsWith('http://localhost:5173') || postLogout.startsWith('http://localhost:5174'))) {
      return res.redirect(postLogout);
    }
    res.type('html').send('<html><body><h1>已登出</h1><p>SSO 会话已清除。</p></body></html>');
  }
}
