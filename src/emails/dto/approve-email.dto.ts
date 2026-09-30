import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveEmailDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  editedReply?: string;
}
