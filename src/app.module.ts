import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EmailsModule } from './emails/emails.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, EmailsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
