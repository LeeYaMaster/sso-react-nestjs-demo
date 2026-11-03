import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { CryptoModule } from './crypto/crypto.module';
import { AuthModule } from './auth/auth.module';
import { OidcModule } from './oidc/oidc.module';

@Module({
  imports: [UsersModule, CryptoModule, AuthModule, OidcModule],
})
export class AppModule {}
