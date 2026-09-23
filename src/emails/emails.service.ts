import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestEmailDto } from './dto/ingest-email.dto';

@Injectable()
export class EmailsService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(dto: IngestEmailDto) {
    const existing = await this.prisma.email.findUnique({
      where: { messageId: dto.messageId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.email.create({
      data: {
        messageId: dto.messageId,
        from: dto.from,
        to: dto.to,
        subject: dto.subject,
        body: dto.body,
        receivedAt: new Date(dto.receivedAt),
      },
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
