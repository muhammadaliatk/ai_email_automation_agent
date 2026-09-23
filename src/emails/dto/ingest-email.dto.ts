import { IsDateString, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class IngestEmailDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsEmail()
  from: string;

  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsDateString()
  receivedAt: string;
}
