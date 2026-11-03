import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  email: string;
  roles: string[];
}

function hashPassword(password: string): string {
  // Demo-only: SHA-256. Real systems use bcrypt/argon2.
  return createHash('sha256').update(password).digest('hex');
}

@Injectable()
export class UsersService {
  private readonly users: UserRecord[] = [
    {
      id: 'user-demo',
      username: 'demo',
      passwordHash: hashPassword('demo123'),
      name: '演示用户 Demo',
      email: 'demo@example.com',
      roles: ['user'],
    },
    {
      id: 'user-admin',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      name: '管理员 Admin',
      email: 'admin@example.com',
      roles: ['user', 'admin'],
    },
  ];

  findByUsername(username: string): UserRecord | undefined {
    return this.users.find((u) => u.username === username);
  }

  findById(id: string): UserRecord | undefined {
    return this.users.find((u) => u.id === id);
  }

  verifyPassword(user: UserRecord, password: string): boolean {
    return user.passwordHash === hashPassword(password);
  }

  toPublicClaims(user: UserRecord) {
    return {
      sub: user.id,
      preferred_username: user.username,
      name: user.name,
      email: user.email,
      roles: user.roles,
    };
  }
}
