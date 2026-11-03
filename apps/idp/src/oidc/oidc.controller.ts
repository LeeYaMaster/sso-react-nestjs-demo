import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CryptoService } from '../crypto/crypto.service';
import { UsersService } from '../users/users.service';
import { SessionService } from '../auth/session.service';
import { findClient } from './clients';
import { CodeStore } from './code.store';

@Controller()
export class OidcController {
  constructor(
    private readonly crypto: CryptoService,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
    private readonly codes: CodeStore,
  ) {}

  @Get('.well-known/openid-configuration')
  discovery() {
    const issuer = this.crypto.issuer;
    return {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/jwks.json`,
      end_session_endpoint: `${issuer}/logout`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: ['openid', 'profile', 'email'],
      claims_supported: [
        'sub',
        'preferred_username',
        'name',
        'email',
        'roles',
        'nonce',
      ],
    };
  }

  @Get('jwks.json')
  jwks() {
    return this.crypto.getJwks();
  }

  /**
   * Authorization endpoint.
   * If IdP session cookie is present → skip login and issue code (SSO!).
   * Otherwise → redirect to /login?continue=<this authorize URL>.
   */
  @Get('authorize')
  authorize(
    @Query() query: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const {
      response_type,
      client_id,
      redirect_uri,
      scope = 'openid',
      state,
      nonce,
      code_challenge,
      code_challenge_method,
    } = query;

    const client = findClient(client_id);
    if (!client) {
      throw new BadRequestException('unknown client_id');
    }
    if (response_type !== 'code') {
      return this.redirectError(res, redirect_uri, state, 'unsupported_response_type');
    }
    if (!client.redirect_uris.includes(redirect_uri)) {
      throw new BadRequestException('invalid redirect_uri');
    }
    if (!code_challenge || code_challenge_method !== 'S256') {
      return this.redirectError(
        res,
        redirect_uri,
        state,
        'invalid_request',
        'PKCE S256 required',
      );
    }

    const sid = req.cookies?.[SessionService.COOKIE_NAME] as string | undefined;
    const session = this.sessions.get(sid);

    if (!session) {
      // No SSO session → show login, then come back here
      const continueUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const q = new URLSearchParams({ continue: continueUrl });
      return res.redirect(`/login?${q.toString()}`);
    }

    // Session exists → auto-approve (educational "consent skip")
    const code = this.codes.issue({
      clientId: client_id,
      redirectUri: redirect_uri,
      userId: session.userId,
      scope,
      nonce,
      codeChallenge: code_challenge,
      codeChallengeMethod: 'S256',
    });

    const redirect = new URL(redirect_uri);
    redirect.searchParams.set('code', code);
    if (state) redirect.searchParams.set('state', state);
    return res.redirect(redirect.toString());
  }

  /**
   * Token endpoint — exchange authorization_code + code_verifier for tokens.
   */
  @Post('token')
  async token(
    @Body() body: Record<string, string>,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');

    if (body.grant_type !== 'authorization_code') {
      throw new BadRequestException({ error: 'unsupported_grant_type' });
    }

    const client = findClient(body.client_id);
    if (!client) {
      throw new BadRequestException({ error: 'invalid_client' });
    }

    const record = this.codes.consume(body.code);
    if (!record) {
      throw new BadRequestException({ error: 'invalid_grant', error_description: 'code invalid or expired' });
    }
    if (record.clientId !== body.client_id) {
      throw new BadRequestException({ error: 'invalid_grant', error_description: 'client mismatch' });
    }
    if (record.redirectUri !== body.redirect_uri) {
      throw new BadRequestException({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
    }
    if (!body.code_verifier || !CodeStore.verifyPkce(body.code_verifier, record.codeChallenge)) {
      throw new BadRequestException({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
    }

    const user = this.users.findById(record.userId);
    if (!user) {
      throw new BadRequestException({ error: 'invalid_grant' });
    }

    const claims = this.users.toPublicClaims(user);
    const access_token = await this.crypto.signAccessToken({
      ...claims,
      scope: record.scope,
      client_id: record.clientId,
    });

    const idPayload: Record<string, unknown> = {
      ...claims,
      aud: record.clientId,
    };
    if (record.nonce) idPayload.nonce = record.nonce;

    const id_token = await this.crypto.signIdToken(idPayload);

    return {
      access_token,
      id_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: record.scope,
    };
  }

  @Get('userinfo')
  async userinfo(@Headers('authorization') authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    const token = authorization.slice('Bearer '.length);
    try {
      const { payload } = await this.crypto.verifyAccessToken(token);
      const sub = String(payload.sub);
      const user = this.users.findById(sub);
      if (!user) throw new UnauthorizedException();
      return this.users.toPublicClaims(user);
    } catch {
      throw new UnauthorizedException();
    }
  }

  private redirectError(
    res: Response,
    redirectUri: string,
    state: string | undefined,
    error: string,
    desc?: string,
  ) {
    const url = new URL(redirectUri);
    url.searchParams.set('error', error);
    if (desc) url.searchParams.set('error_description', desc);
    if (state) url.searchParams.set('state', state);
    return res.redirect(url.toString());
  }
}
