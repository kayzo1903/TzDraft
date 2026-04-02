import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { PuzzleMinerService } from '../../../application/puzzle/puzzle-miner.service';
import {
  ListPuzzlesQueryDto,
  SubmitAttemptDto,
  ListPendingPuzzlesQueryDto,
  ApprovePuzzleDto,
  TriggerMiningDto,
} from '../dtos/puzzle.dto';

// ─── Public & Player routes (/puzzles) ──────────────────────────────────────

@Controller('puzzles')
export class PuzzleController {
  constructor(private readonly prisma: PrismaService) {}

  /** List approved puzzles — filterable by difficulty and theme. */
  @Get()
  async listPuzzles(@Query() query: ListPuzzlesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { status: 'APPROVED' };
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.theme) where.theme = query.theme;

    const [puzzles, total] = await Promise.all([
      this.prisma.puzzle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          difficulty: true,
          theme: true,
          evalGap: true,
          publishedAt: true,
          sideToMove: true,
          _count: { select: { attempts: true } },
        },
      }),
      this.prisma.puzzle.count({ where }),
    ]);

    return { data: puzzles, total, page, limit };
  }

  /** Today's featured puzzle — the most recently published APPROVED puzzle. */
  @Get('daily')
  async getDailyPuzzle() {
    const puzzle = await this.prisma.puzzle.findFirst({
      where: { status: 'APPROVED' },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        difficulty: true,
        theme: true,
        pieces: true,
        sideToMove: true,
        publishedAt: true,
        _count: { select: { attempts: true } },
      },
    });

    if (!puzzle) throw new NotFoundException('No puzzles available yet');
    return puzzle;
  }

  /**
   * Single approved puzzle for display / solving.
   * The solution is intentionally NOT returned here.
   */
  @Get(':id')
  async getPuzzle(@Param('id') id: string) {
    const puzzle = await this.prisma.puzzle.findUnique({
      where: { id, status: 'APPROVED' },
      select: {
        id: true,
        title: true,
        difficulty: true,
        theme: true,
        pieces: true,
        sideToMove: true,
        publishedAt: true,
        _count: { select: { attempts: true } },
      },
    });

    if (!puzzle) throw new NotFoundException('Puzzle not found');
    return puzzle;
  }

  /**
   * Submit a solution attempt.
   * Checks the submitted moves against the stored solution.
   * On success, records the attempt and returns the solution.
   */
  @Post(':id/attempt')
  @UseGuards(JwtAuthGuard)
  async submitAttempt(
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
    @CurrentUser() user: any,
  ) {
    const puzzle = await this.prisma.puzzle.findUnique({
      where: { id, status: 'APPROVED' },
      select: { id: true, solution: true },
    });

    if (!puzzle) throw new NotFoundException('Puzzle not found');

    const solution = puzzle.solution as Array<{
      from: number;
      to: number;
      captures?: number[];
    }>;

    const correct = checkSolution(dto.moves, solution);

    await this.prisma.puzzleAttempt.create({
      data: {
        userId: user.id,
        puzzleId: id,
        solved: correct,
      },
    });

    return {
      correct,
      // Reveal the solution on any attempt so the player can learn
      solution,
    };
  }
}

// ─── Admin routes (/admin/puzzles) ──────────────────────────────────────────

@Controller('admin/puzzles')
@UseGuards(AdminGuard)
export class AdminPuzzleController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly miner: PuzzleMinerService,
  ) {}

  /** Aggregate stats: pending / approved / rejected counts. */
  @Get('stats')
  async getStats() {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.puzzle.count({ where: { status: 'PENDING' } }),
      this.prisma.puzzle.count({ where: { status: 'APPROVED' } }),
      this.prisma.puzzle.count({ where: { status: 'REJECTED' } }),
    ]);
    return { pending, approved, rejected };
  }

  /**
   * Manually trigger the puzzle miner for a given number of days back.
   * Defaults to 1 day. Max 90 days.
   * Example: POST /admin/puzzles/mine  { "days": 7 }
   */
  @Post('mine')
  async triggerMine(
    @Body() dto: TriggerMiningDto,
    @CurrentUser() admin: any,
    @Req() req: Request,
  ) {
    const days = dto.days ?? 1;
    const force = dto.force ?? false;
    this.auditLog('TRIGGER_PUZZLE_MINE', admin, req, { days, force });
    const result = await this.miner.triggerMining(days, force);
    return { days, ...result };
  }

  /** Paginated list of PENDING puzzle candidates for admin review. */
  @Get()
  async listPending(@Query() query: ListPendingPuzzlesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [puzzles, total] = await Promise.all([
      this.prisma.puzzle.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          difficulty: true,
          theme: true,
          evalGap: true,
          sourceGameId: true,
          sourceMoveNum: true,
          createdAt: true,
          pieces: true,
          sideToMove: true,
          solution: true,
        },
      }),
      this.prisma.puzzle.count({ where: { status: 'PENDING' } }),
    ]);

    return { data: puzzles, total, page, limit };
  }

  /** Full detail for a single candidate, including solution for preview. */
  @Get(':id')
  async getPending(@Param('id') id: string) {
    const puzzle = await this.prisma.puzzle.findUnique({
      where: { id },
      include: { _count: { select: { attempts: true } } },
    });

    if (!puzzle) throw new NotFoundException('Puzzle not found');
    return puzzle;
  }

  /**
   * Approve a candidate.
   * Admin can override title, difficulty, and theme before publishing.
   */
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApprovePuzzleDto,
    @CurrentUser() admin: any,
    @Req() req: Request,
  ) {
    const puzzle = await this.prisma.puzzle.findUnique({ where: { id } });
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    const updated = await this.prisma.puzzle.update({
      where: { id },
      data: {
        status: 'APPROVED',
        publishedAt: new Date(),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.theme !== undefined && { theme: dto.theme }),
      },
      select: {
        id: true,
        status: true,
        title: true,
        difficulty: true,
        theme: true,
      },
    });

    this.auditLog('APPROVE_PUZZLE', admin, req, { puzzleId: id });
    return updated;
  }

  /** Reject a candidate so it won't appear in the review queue again. */
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser() admin: any,
    @Req() req: Request,
  ) {
    const puzzle = await this.prisma.puzzle.findUnique({ where: { id } });
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    const updated = await this.prisma.puzzle.update({
      where: { id },
      data: { status: 'REJECTED' },
      select: { id: true, status: true },
    });

    this.auditLog('REJECT_PUZZLE', admin, req, { puzzleId: id });
    return updated;
  }

  private auditLog(
    action: string,
    admin: any,
    req: Request,
    details: Record<string, unknown> = {},
  ): void {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress;

    console.log(
      JSON.stringify({
        audit: true,
        action,
        adminId: admin?.id ?? 'unknown',
        ip,
        timestamp: new Date().toISOString(),
        ...details,
      }),
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function checkSolution(
  submitted: Array<{ from: number; to: number; captures?: number[] }>,
  solution: Array<{ from: number; to: number; captures?: number[] }>,
): boolean {
  if (submitted.length < solution.length) return false;

  for (let i = 0; i < solution.length; i++) {
    const s = solution[i];
    const p = submitted[i];
    if (!p || p.from !== s.from || p.to !== s.to) return false;

    // If solution specifies captures, verify them (order-insensitive).
    if (s.captures && s.captures.length > 0) {
      const expected = [...s.captures].sort((a, b) => a - b);
      const actual = [...(p.captures ?? [])].sort((a, b) => a - b);
      if (expected.join(',') !== actual.join(',')) return false;
    }
  }

  return true;
}
