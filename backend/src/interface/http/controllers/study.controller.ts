import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SaveStudyDto } from '../dtos/study.dto';

/**
 * Player-facing: /studies
 * - POST /studies        — save a free-play study (requires JWT)
 * - GET  /studies/mine   — list own saved studies
 */
@Controller('studies')
@UseGuards(JwtAuthGuard)
export class StudyController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async saveStudy(
    @Body() dto: SaveStudyDto,
    @CurrentUser() user: any,
  ) {
    const study = await this.prisma.savedStudy.create({
      data: {
        userId: user.id,
        name: dto.name,
        description: dto.description ?? null,
        fenHistory: dto.fenHistory,
        moveHistory: dto.moveHistory as any,
        moveCount: dto.moveCount,
        status: 'PENDING',
      },
      select: {
        id: true,
        name: true,
        description: true,
        moveCount: true,
        status: true,
        createdAt: true,
      },
    });

    return { data: study };
  }

  // NOTE: /mine must be declared BEFORE /:id so NestJS matches the literal first.
  @Get('mine')
  async listMine(@CurrentUser() user: any) {
    const studies = await this.prisma.savedStudy.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        moveCount: true,
        status: true,
        createdAt: true,
      },
    });

    return { data: studies };
  }

  /** Full study detail — only the owner can fetch it. */
  @Get(':id')
  async getStudy(@Param('id') id: string, @CurrentUser() user: any) {
    const study = await this.prisma.savedStudy.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        fenHistory: true,
        moveHistory: true,
        moveCount: true,
        status: true,
        createdAt: true,
        userId: true,
      },
    });

    if (!study || study.userId !== user.id) {
      throw new NotFoundException('Study not found');
    }

    return { data: study };
  }
}

/**
 * Admin: /admin/studies
 * - GET  /admin/studies  — list all PENDING studies for review
 */
@Controller('admin/studies')
@UseGuards(AdminGuard)
export class AdminStudyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listPending() {
    const studies = await this.prisma.savedStudy.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        fenHistory: true,
        moveHistory: true,
        moveCount: true,
        createdAt: true,
        user: { select: { id: true, displayName: true } },
      },
    });

    return { data: studies };
  }
}
