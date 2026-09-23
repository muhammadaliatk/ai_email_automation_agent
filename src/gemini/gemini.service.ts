import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(configService: ConfigService) {
    this.client = new GoogleGenAI({
      apiKey: configService.getOrThrow<string>('GEMINI_API_KEY'),
    });
    this.model = configService.get<string>('GEMINI_MODEL') ?? 'gemini-3.6-flash';
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      this.logger.warn('Gemini returned an empty response');
      return '';
    }
    return text;
  }
}
