import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';

export interface AuthCodeRecord {
  code: string;
  clientId: string;
  redirectUri: string;
  userId: string;
  scope: string;
  nonce?: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  expiresAt: number;
  consumed: boolean;
}

@Injectable()
export class CodeStore {
  private readonly codes = new Map<string, AuthCodeRecord>();

  issue(input: Omit<AuthCodeRecord, 'code' | 'expiresAt' | 'consumed'>): string {
    const code = randomBytes(24).toString('base64url');
    this.codes.set(code, {
      ...input,
      code,
      expiresAt: Date.now() + 60_000, // 60s
      consumed: false,
    });
    return code;
  }

  consume(code: string): AuthCodeRecord | null {
    const rec = this.codes.get(code);
    if (!rec) return null;
    if (rec.consumed || Date.now() > rec.expiresAt) {
      this.codes.delete(code);
      return null;
    }
    rec.consumed = true;
    this.codes.delete(code);
    return rec;
  }

  /** Verify PKCE: BASE64URL(SHA256(verifier)) === challenge */
  static verifyPkce(verifier: string, challenge: string): boolean {
    const hash = createHash('sha256').update(verifier).digest();
    const computed = hash
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return computed === challenge;
  }
}
