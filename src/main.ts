import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Shared between real bootstrap and e2e tests, so tests never run without the same global pipes
 * production does — a TestingModule's app.init() does not run this file's bootstrap() otherwise.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  return app;
}

function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('MyBills API')
    .setDescription('MyBills backend REST API. See .claude/rules/api-contract.md for the human-readable contract.')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}

// Guarded so importing this file for `configureApp` (e.g. from e2e tests) never has the side
// effect of starting a second, real, unmanaged Nest app + HTTP server + Postgres pool.
if (require.main === module) {
  void bootstrap();
}
