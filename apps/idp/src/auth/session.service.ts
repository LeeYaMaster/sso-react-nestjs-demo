import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface SessionData {
  sid: string;
  userId: string;
  username: string;
  createdAt: number;
}

/**
 * In-memory session store + cookie name helpers.
 * Cookie itself only holds the opaque session id (sid).
 */
@Injectable()
export class SessionService {
  static readonly COOKIE_NAME = 'idp_sid';
  private readonly sessions = new Map<string, SessionData>();

  create(userId: string, username: string): SessionData {
    const sid = randomBytes(24).toString('base64url');
    const data: SessionData = {
      sid,
      userId,
      username,
      createdAt: Date.now(),
    };
    this.sessions.set(sid, data);
    return data;
  }

  get(sid: string | undefined): SessionData | undefined {
    if (!sid) return undefined;
    return this.sessions.get(sid);
  }

  destroy(sid: string | undefined): void {
    if (sid) this.sessions.delete(sid);
  }
}
