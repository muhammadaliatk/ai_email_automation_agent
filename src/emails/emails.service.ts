import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { IngestEmailDto } from './dto/ingest-email.dto';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async ingest(dto: IngestEmailDto) {
    const existing = await this.prisma.email.findUnique({
      where: { messageId: dto.messageId },
    });
    if (existing) {
      return existing;
    }

    const email = await this.prisma.email.create({
      data: {
        messageId: dto.messageId,
        from: dto.from,
        to: dto.to,
        subject: dto.subject,
        body: dto.body,
        receivedAt: new Date(dto.receivedAt),
      },
    });

    return this.classify(email.id);
  }

  private async classify(emailId: string) {
    const email = await this.findOne(emailId);
    try {
      const category = await this.gemini.classifyEmail(
        email.subject,
        email.body,
      );
      return this.prisma.email.update({
        where: { id: emailId },
        data: { category, status: 'CLASSIFIED' },
      });
    } catch (error) {
      this.logger.error(`Classification failed for email ${emailId}`, error);
      return this.prisma.email.update({
        where: { id: emailId },
        data: { status: 'FAILED' },
      });
    }
  }

  findAll() {
    return this.prisma.email.findMany({
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const email = await this.prisma.email.findUnique({ where: { id } });
    if (!email) {
      throw new NotFoundException(`Email with id "${id}" not found`);
    }
    return email;
  }
}
