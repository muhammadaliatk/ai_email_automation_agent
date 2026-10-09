import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(configService: ConfigService) {
    this.transporter = createTransport({
      host: configService.getOrThrow<string>('SMTP_HOST'),
      port: configService.get<number>('SMTP_PORT', 587),
      auth: {
        user: configService.getOrThrow<string>('SMTP_USER'),
        pass: configService.getOrThrow<string>('SMTP_PASS'),
      },
    });
  }

  async sendReply(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: input.from,
      to: input.to,
      subject: `Re: ${input.subject}`,
      text: input.text,
    });
  }
}
