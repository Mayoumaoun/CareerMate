import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import multer from 'multer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend on port 3001
  app.enableCors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  multer.memoryStorage();
  const config = new DocumentBuilder()
    .setTitle('CareerMate API')
    .setDescription('API documentation for CareerMate application')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('career-mate')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  app.enableCors({ origin: 'http://localhost:3000' });
  SwaggerModule.setup('api', app, documentFactory);
  await app.listen(process.env.PORT ?? 3001);
  
}
bootstrap();
