import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Allow SPA origins to call discovery / token / userinfo
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  // Session cookie is set with SameSite=Lax so top-level redirects from
  // App A / App B still carry the IdP cookie (classic SSO browser pattern).
  app.use(cookieParser(process.env.SESSION_SECRET || 'dev-only-session-secret'));

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`IdP listening on http://localhost:${port}`);
}

bootstrap();
