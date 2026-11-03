import { Module } from '@nestjs/common';
import { OidcController } from './oidc.controller';
import { CodeStore } from './code.store';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [OidcController],
  providers: [CodeStore],
})
export class OidcModule {}
