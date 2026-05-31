import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBody, ApiResponse, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService, ChatMessage } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chat with CareerMate AI',
    description:
      'Send a message to the career coaching AI. Supports streaming responses.',
  })
  @ApiBody({
    type: Object,
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'How can I improve my CV for a backend role at a startup?',
        },
        user_profile: {
          type: 'object',
          description:
            'Optional — user profile for personalized answers. Can include: name, level, skills, education, bio, career_goal',
          example: {
            name: 'Ahmed',
            level: 'Junior',
            skills: ['NestJS', 'PostgreSQL', 'Docker'],
            education: 'Software Engineering',
          },
        },
        conversation_history: {
          type: 'array',
          description:
            'Optional — previous messages for context (last 3-4 exchanges recommended)',
          example: [
            {
              role: 'user',
              content: 'What is the best way to prepare for an interview?',
            },
            {
              role: 'assistant',
              content: 'Focus on researching the company...',
            },
          ],
        },
      },
      required: ['message'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Streaming text response from the AI',
    schema: {
      type: 'string',
      example:
        'Here are some practical ways to improve your backend CV...',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (empty message, missing fields)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (no valid JWT token)',
  })
  @ApiResponse({
    status: 503,
    description: 'Chat service unavailable (Python service not running)',
  })
  async chat(
    @Body() dto: any,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    // Validate request
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Request body must be a JSON object');
    }

    if (!dto.message) {
      throw new BadRequestException('Message field is required');
    }

    if (typeof dto.message !== 'string') {
      throw new BadRequestException('Message must be a string');
    }

    // Prepare the DTO with user context
    const chatDto = {
      message: dto.message,
      user_profile: {
        ...dto.user_profile,
        // Optionally add authenticated user info
        user_id: user?.id,
      },
      conversation_history: Array.isArray(dto.conversation_history)
        ? dto.conversation_history.filter(
            (msg: ChatMessage) =>
              msg.role &&
              msg.content &&
              typeof msg.role === 'string' &&
              typeof msg.content === 'string',
          )
        : [],
    };

    try {
      // Get stream from Python service
      const stream = await this.chatService.chat(chatDto);

      // Set response headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-cache');

      // Pipe the stream to response
      stream.pipe(res);

      // Handle stream errors
      stream.on('error', (error: any) => {
        console.error('[Chat Controller] Stream error:', error.message);
        if (!res.headersSent) {
          res
            .status(500)
            .send(
              'Error: Chat service stream failed. Please try again later.',
            );
        } else {
          res.end();
        }
      });
    } catch (error: any) {
      console.error('[Chat Controller] Error:', error.message);
      // Error is already handled by ChatService, just re-throw
      throw error;
    }
  }
}
