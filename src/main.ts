import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import multer from 'multer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
  }))
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
