import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiError, GoogleGenAI, Type } from '@google/genai';
import { EmailCategory } from '../../generated/prisma/enums';

const EMAIL_CATEGORIES = Object.values(EmailCategory);
const RETRYABLE_STATUS_CODES = [429, 503];
const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(configService: ConfigService) {
    this.client = new GoogleGenAI({
      apiKey: configService.getOrThrow<string>('GEMINI_API_KEY'),
    });
    this.model =
      configService.get<string>('GEMINI_MODEL') ?? 'gemini-3.6-flash';
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isRetryable =
          error instanceof ApiError &&
          RETRYABLE_STATUS_CODES.includes(error.status);
        if (!isRetryable || attempt === MAX_ATTEMPTS) {
          throw error;
        }
        const delayMs = attempt * 1000;
        this.logger.warn(
          `Gemini request failed with status ${error.status} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delayMs}ms`,
        );
        await sleep(delayMs);
      }
    }
    throw new Error('unreachable');
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.withRetry(() =>
      this.client.models.generateContent({
        model: this.model,
        contents: prompt,
      }),
    );

    const text = response.text;
    if (!text) {
      this.logger.warn('Gemini returned an empty response');
      return '';
    }
    return text;
  }

  async classifyEmail(subject: string, body: string): Promise<EmailCategory> {
    const response = await this.withRetry(() =>
      this.client.models.generateContent({
        model: this.model,
        contents: [
          'Classify the following customer email into exactly one category.',
          '',
          `Subject: ${subject}`,
          `Body: ${body}`,
        ].join('\n'),
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, enum: EMAIL_CATEGORIES },
            },
            required: ['category'],
          },
        },
      }),
    );

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty classification response');
    }

    const parsed = JSON.parse(text) as { category: string };
    if (!EMAIL_CATEGORIES.includes(parsed.category as EmailCategory)) {
      throw new Error(
        `Gemini returned an unknown category: "${parsed.category}"`,
      );
    }

    return parsed.category as EmailCategory;
  }
}
