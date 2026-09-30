import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { IngestEmailDto } from './dto/ingest-email.dto';
import { ApproveEmailDto } from './dto/approve-email.dto';
import { RejectEmailDto } from './dto/reject-email.dto';

@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post('ingest')
  ingest(@Body() dto: IngestEmailDto) {
    return this.emailsService.ingest(dto);
  }

  @Get()
  findAll() {
    return this.emailsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emailsService.findOne(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveEmailDto) {
    return this.emailsService.approve(id, dto);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectEmailDto) {
    return this.emailsService.reject(id, dto);
  }
}
