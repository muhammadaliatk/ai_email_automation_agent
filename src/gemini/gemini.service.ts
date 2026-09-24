import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiError, GoogleGenAI, Schema, Type } from '@google/genai';
import {
  EmailCategory,
  EmailSentiment,
  EmailUrgency,
} from '../../generated/prisma/enums';

const EMAIL_CATEGORIES = Object.values(EmailCategory);
const EMAIL_SENTIMENTS = Object.values(EmailSentiment);
const EMAIL_URGENCIES = Object.values(EmailUrgency);

export interface ExtractedEmailInfo {
  sentiment: EmailSentiment;
  urgency: EmailUrgency;
  summary: string;
  entities: { type: string; value: string }[];
}
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

  private async generateStructured<T>(
    prompt: string,
    schema: Schema,
  ): Promise<T> {
    const response = await this.withRetry(() =>
      this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      }),
    );

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty structured response');
    }
    return JSON.parse(text) as T;
  }

  async classifyEmail(subject: string, body: string): Promise<EmailCategory> {
    const { category } = await this.generateStructured<{ category: string }>(
      [
        'Classify the following customer email into exactly one category.',
        '',
        `Subject: ${subject}`,
        `Body: ${body}`,
      ].join('\n'),
      {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: EMAIL_CATEGORIES },
        },
        required: ['category'],
      },
    );

    if (!EMAIL_CATEGORIES.includes(category as EmailCategory)) {
      throw new Error(`Gemini returned an unknown category: "${category}"`);
    }
    return category as EmailCategory;
  }

  async extractInfo(
    subject: string,
    body: string,
  ): Promise<ExtractedEmailInfo> {
    const result = await this.generateStructured<ExtractedEmailInfo>(
      [
        'Analyze the following customer email and extract structured information.',
        '- sentiment: the overall emotional tone of the customer.',
        '- urgency: how urgently this email needs a response.',
        '- summary: one short sentence summarizing the email.',
        '- entities: any concrete details worth extracting (order numbers,',
        '  product names, dates, amounts, etc). Use an empty array if none.',
        '',
        `Subject: ${subject}`,
        `Body: ${body}`,
      ].join('\n'),
      {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING, enum: EMAIL_SENTIMENTS },
          urgency: { type: Type.STRING, enum: EMAIL_URGENCIES },
          summary: { type: Type.STRING },
          entities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                value: { type: Type.STRING },
              },
              required: ['type', 'value'],
            },
          },
        },
        required: ['sentiment', 'urgency', 'summary', 'entities'],
      },
    );

    if (!EMAIL_SENTIMENTS.includes(result.sentiment)) {
      throw new Error(
        `Gemini returned an unknown sentiment: "${result.sentiment}"`,
      );
    }
    if (!EMAIL_URGENCIES.includes(result.urgency)) {
      throw new Error(
        `Gemini returned an unknown urgency: "${result.urgency}"`,
      );
    }
    return result;
  }
}
