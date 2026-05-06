import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CreateTargetJobRoadmapDto } from './modules/career/roadmap/dto/CreateTargetJobRoadmap.dto';
import { CreateJobOfferRoadmapDto } from './modules/career/roadmap/dto/CreateJobOfferRoadmap.dto';
import { CreateGenericRoadmapDto } from './modules/career/roadmap/dto/CreateGenericRoadmap.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
  }))
  const config = new DocumentBuilder()
    .setTitle('CareerMate API')
    .setDescription('API documentation for CareerMate application')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('career-mate')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config, {
  extraModels: [
    CreateTargetJobRoadmapDto,
    CreateJobOfferRoadmapDto,
    CreateGenericRoadmapDto,
  ],}); 
  SwaggerModule.setup('api', app, documentFactory);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
