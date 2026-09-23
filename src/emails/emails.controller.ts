import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { IngestEmailDto } from './dto/ingest-email.dto';

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
}
