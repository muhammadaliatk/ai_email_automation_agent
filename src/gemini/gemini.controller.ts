import { Body, Controller, Post } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { GeminiService } from './gemini.service';

class TestPromptDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

// Temporary: proves the Gemini API key + SDK work end-to-end; removed once classification endpoints exist.
@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('test')
  async test(@Body() dto: TestPromptDto) {
    const text = await this.geminiService.generateText(dto.prompt);
    return { response: text };
  }
}
