import { UseGuards } from '@nestjs/common';

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { RealtimeService } from './realtime.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseGuards(WsJwtGuard)
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{
        sub: number;
        email: string;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      client.data.user = {
        userId: payload.sub,
        email: payload.email,
      };

      client.join(`user:${payload.sub}`);

      console.log(
        `WebSocket client connected: ${client.id} (user ${payload.sub})`,
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`WebSocket client disconnected: ${client.id}`);
  }
  @SubscribeMessage('join-project')
  async handleJoinProject(
    @MessageBody() projectId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user.userId;

    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (!member) {
      throw new WsException('Project not found');
    }

    const room = `project:${projectId}`;

    await client.join(room);

    return {
      event: 'joined-project',
      data: {
        projectId,
        room,
      },
    };
  }
  @SubscribeMessage('join-task')
  async handleJoinTask(
    @MessageBody() taskId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user.userId;

    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        projectId: true,
      },
    });

    if (!task) {
      throw new WsException('Task not found');
    }

    if (!task.projectId) {
      throw new WsException('Task is not assigned to a project');
    }

    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId,
      },
    });

    if (!member) {
      throw new WsException('Project not found');
    }

    const room = `task:${taskId}`;

    await client.join(room);

    return {
      event: 'joined-task',
      data: {
        taskId,
        projectId: task.projectId,
        room,
      },
    };
  }
  @WebSocketServer()
  server!: Server;

  afterInit(server: Server) {
    this.realtimeService.setServer(server);
  }
}
