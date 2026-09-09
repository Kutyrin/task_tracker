import { Injectable } from '@nestjs/common';

import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server?: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitToProject(projectId: number, event: string, data: unknown) {
    this.server?.to(`project:${projectId}`).emit(event, data);
  }

  emitToTask(taskId: number, event: string, data: unknown) {
    this.server?.to(`task:${taskId}`).emit(event, data);
  }

  emitToUser(userId: number, event: string, data: unknown) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }
}