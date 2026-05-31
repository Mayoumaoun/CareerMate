import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestDto {
  message: string;
  user_profile?: Record<string, any>;
  conversation_history?: ChatMessage[];
}

@Injectable()
export class ChatService {
  private readonly pythonServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Default to localhost:8000 in development, or use env variable
    this.pythonServiceUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:8000';
  }

  /**
   * Send a chat message to the Python FastAPI service
   * Returns a stream of the response
   */
  async chat(dto: ChatRequestDto): Promise<any> {
    try {
      // Validate input
      if (!dto.message || typeof dto.message !== 'string') {
        throw new HttpException(
          'Message is required and must be a string',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (dto.message.trim().length === 0) {
        throw new HttpException(
          'Message cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Prepare payload
      const payload = {
        message: dto.message.trim(),
        user_profile: dto.user_profile || {},
        conversation_history: dto.conversation_history || [],
      };

      // Call Python service with streaming
      const response = await this.httpService.axiosRef.post(
        `${this.pythonServiceUrl}/chat`,
        payload,
        {
          responseType: 'stream',
          timeout: 60000, // 60s timeout for streaming
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data; // Return the stream
    } catch (error: any) {
      // Handle specific error types
      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          `Chat service unavailable (Python service not running at ${this.pythonServiceUrl})`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.code === 'ENOTFOUND') {
        throw new HttpException(
          `Chat service host not found: ${this.pythonServiceUrl}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.response?.status === 422) {
        throw new HttpException(
          'Invalid request format',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error.response?.status >= 500) {
        throw new HttpException(
          'Chat service error - please try again',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Chat failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
