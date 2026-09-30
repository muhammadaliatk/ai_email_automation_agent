import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RejectEmailDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
