import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateBoardDto } from './dto/create-board.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { MoveColumnDto } from './dto/move-column.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

import { BoardsService } from './boards.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  // Board

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateBoardDto) {
    return this.boardsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.boardsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.boardsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boardsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.boardsService.remove(req.user.userId, id);
  }

  // Columns

  @Post(':boardId/columns')
  createColumn(
    @Req() req: AuthenticatedRequest,
    @Param('boardId', ParseIntPipe) boardId: number,
    @Body() dto: CreateColumnDto,
  ) {
    return this.boardsService.createColumn(req.user.userId, boardId, dto);
  }

  @Get(':boardId/columns')
  findColumns(
    @Req() req: AuthenticatedRequest,
    @Param('boardId', ParseIntPipe) boardId: number,
  ) {
    return this.boardsService.findColumns(req.user.userId, boardId);
  }

  @Patch(':boardId/columns/:id')
  updateColumn(
    @Req() req: AuthenticatedRequest,
    @Param('boardId', ParseIntPipe) boardId: number,
    @Param('id', ParseIntPipe) columnId: number,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.boardsService.updateColumn(
      req.user.userId,
      boardId,
      columnId,
      dto,
    );
  }

  @Patch(':boardId/columns/:id/move')
  moveColumn(
    @Req() req: AuthenticatedRequest,
    @Param('boardId', ParseIntPipe) boardId: number,
    @Param('id', ParseIntPipe) columnId: number,
    @Body() dto: MoveColumnDto,
  ) {
    return this.boardsService.moveColumn(
      req.user.userId,
      boardId,
      columnId,
      dto,
    );
  }

  @Delete(':boardId/columns/:id')
  removeColumn(
    @Req() req: AuthenticatedRequest,
    @Param('boardId', ParseIntPipe) boardId: number,
    @Param('id', ParseIntPipe) columnId: number,
  ) {
    return this.boardsService.removeColumn(req.user.userId, boardId, columnId);
  }
}
