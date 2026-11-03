import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  jwtVerify,
  type JWK,
  type KeyLike,
} from 'jose';

@Injectable()
export class CryptoService implements OnModuleInit {
  private privateKey!: KeyLike;
  private publicKey!: KeyLike;
  private publicJwk!: JWK;
  readonly kid = 'sso-demo-key-1';
  readonly issuer = process.env.ISSUER || 'http://localhost:3000';

  async onModuleInit() {
    // Ephemeral RSA key pair for the demo process lifetime.
    // Restarting IdP invalidates previously issued tokens — fine for learning.
    const { privateKey, publicKey } = await generateKeyPair('RS256', {
      extractable: true,
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    const jwk = await exportJWK(publicKey);
    this.publicJwk = { ...jwk, kid: this.kid, alg: 'RS256', use: 'sig' };
  }

  getJwks() {
    return { keys: [this.publicJwk] };
  }

  async signIdToken(payload: Record<string, unknown>, expiresIn = '1h') {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: this.kid })
      .setIssuer(this.issuer)
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(this.privateKey);
  }

  async signAccessToken(payload: Record<string, unknown>, expiresIn = '1h') {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: this.kid })
      .setIssuer(this.issuer)
      .setAudience('sso-resource')
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(this.privateKey);
  }

  async verifyAccessToken(token: string) {
    return jwtVerify(token, this.publicKey, {
      issuer: this.issuer,
    });
  }
}
