import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { MailService } from '../mail/mail.service';
import { IngestEmailDto } from './dto/ingest-email.dto';
import { ApproveEmailDto } from './dto/approve-email.dto';
import { RejectEmailDto } from './dto/reject-email.dto';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly mail: MailService,
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

    return this.processNewEmail(email.id);
  }

  private async processNewEmail(emailId: string) {
    const classified = await this.classify(emailId);
    if (classified.status === 'FAILED') {
      return classified;
    }

    const extracted = await this.extract(emailId);
    if (extracted.status === 'FAILED' || extracted.category === 'SPAM') {
      return extracted;
    }

    return this.draft(emailId);
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

  private async extract(emailId: string) {
    const email = await this.findOne(emailId);
    try {
      const info = await this.gemini.extractInfo(email.subject, email.body);
      return this.prisma.email.update({
        where: { id: emailId },
        data: {
          sentiment: info.sentiment,
          urgency: info.urgency,
          summary: info.summary,
          extractedEntities: info.entities,
          status: 'EXTRACTED',
        },
      });
    } catch (error) {
      this.logger.error(`Extraction failed for email ${emailId}`, error);
      return this.prisma.email.update({
        where: { id: emailId },
        data: { status: 'FAILED' },
      });
    }
  }

  private async draft(emailId: string) {
    const email = await this.findOne(emailId);
    try {
      const entities = (email.extractedEntities ?? []) as {
        type: string;
        value: string;
      }[];
      const draftReply = await this.gemini.generateReply({
        subject: email.subject,
        body: email.body,
        category: email.category!,
        sentiment: email.sentiment!,
        urgency: email.urgency!,
        summary: email.summary!,
        entities,
      });
      return this.prisma.email.update({
        where: { id: emailId },
        data: { draftReply, status: 'DRAFTED' },
      });
    } catch (error) {
      this.logger.error(`Draft generation failed for email ${emailId}`, error);
      return this.prisma.email.update({
        where: { id: emailId },
        data: { status: 'FAILED' },
      });
    }
  }

  async approve(emailId: string, dto: ApproveEmailDto) {
    const email = await this.findOne(emailId);
    if (email.status !== 'DRAFTED') {
      throw new BadRequestException(
        `Email must be in DRAFTED status to approve (current: ${email.status})`,
      );
    }

    return this.prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'APPROVED',
        finalReply: dto.editedReply ?? email.draftReply,
      },
    });
  }

  async reject(emailId: string, dto: RejectEmailDto) {
    const email = await this.findOne(emailId);
    if (email.status !== 'DRAFTED') {
      throw new BadRequestException(
        `Email must be in DRAFTED status to reject (current: ${email.status})`,
      );
    }

    return this.prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.reason,
      },
    });
  }

  async send(emailId: string) {
    const email = await this.findOne(emailId);
    if (email.status !== 'APPROVED') {
      throw new BadRequestException(
        `Email must be in APPROVED status to send (current: ${email.status})`,
      );
    }

    await this.mail.sendReply({
      from: email.to,
      to: email.from,
      subject: email.subject,
      text: email.finalReply!,
    });

    return this.prisma.email.update({
      where: { id: emailId },
      data: { status: 'SENT', sentAt: new Date() },
    });
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
