import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { AppointmentEventPayload } from './dto/appointment-event.payload';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the value of a named cookie from a raw Cookie header string. */
function extractCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

// ─── Socket Event Names ───────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  CHECKED_IN: 'appointment.checked_in',
  CONSULTATION_STARTED: 'appointment.consultation_started',
  COMPLETED: 'appointment.completed',
  CANCELLED: 'appointment.cancelled',
  NO_SHOW: 'appointment.no_show',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ─── Room name builders ───────────────────────────────────────────────────────

export const buildDoctorRoom = (doctorId: string) => `doctor:${doctorId}`;
export const buildPatientRoom = (patientId: string) => `patient:${patientId}`;

// ─── Gateway ──────────────────────────────────────────────────────────────────

/**
 * AppointmentGateway
 *
 * Namespace : /appointments
 * Transport : websocket
 *
 * Connection flow:
 *   1. Client connects → gateway verifies JWT from "token" cookie.
 *      Invalid JWT → immediate disconnect.
 *   2. Client emits "join_room" with { room: "doctor:uuid" | "patient:uuid" }.
 *      Gateway validates the room prefix matches the authenticated user's role.
 *   3. Services call emitAppointmentEvent() which broadcasts ONLY to the
 *      affected doctor room and patient room — never to all sockets.
 */
@WebSocketGateway({
  namespace: '/appointments',
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  transports: ['websocket'],
})
export class AppointmentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(AppointmentGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Connection Lifecycle ──────────────────────────────────────────────────

  /**
   * Runs on every new socket connection.
   * Validates JWT from the "token" cookie; disconnects if invalid.
   */
  handleConnection(client: Socket): void {
    try {
      const cookieHeader = client.handshake.headers.cookie;
      const token = extractCookieValue(cookieHeader, 'token');

      if (!token) {
        this.logger.warn(
          `[Connect] Rejected unauthenticated socket ${client.id} — no token cookie`,
        );
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET') as string;
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
      }>(token, { secret });

      // Attach decoded user info to the socket for later use in handleJoinRoom
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.data.email = payload.email;

      this.logger.log(
        `[Connect] Socket ${client.id} authenticated — user ${payload.sub} (${payload.role})`,
      );
    } catch (err: any) {
      this.logger.warn(
        `[Connect] Rejected socket ${client.id} — invalid JWT: ${err.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(
      `[Disconnect] Socket ${client.id} disconnected — user ${client.data?.userId ?? 'unknown'}`,
    );
  }

  // ─── Room Management ───────────────────────────────────────────────────────

  /**
   * Client sends:  { room: "doctor:uuid" | "patient:uuid" }
   *
   * Security rules:
   *  - DOCTOR role may only join rooms prefixed with "doctor:"
   *  - PATIENT role may only join rooms prefixed with "patient:"
   *  - Any other room format is rejected
   */
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ): { success: boolean; message: string } {
    const { room } = data;
    const { role } = client.data as { role: string; userId: string };

    if (!room || typeof room !== 'string') {
      return { success: false, message: 'Invalid room name' };
    }

    const isDoctor = role === 'DOCTOR';
    const isPatient = role === 'PATIENT';

    const wantsDoctorRoom = room.startsWith('doctor:');
    const wantsPatientRoom = room.startsWith('patient:');

    if (isDoctor && !wantsDoctorRoom) {
      this.logger.warn(
        `[JoinRoom] DOCTOR socket ${client.id} tried to join unauthorized room "${room}"`,
      );
      return { success: false, message: 'Doctors may only join doctor rooms' };
    }

    if (isPatient && !wantsPatientRoom) {
      this.logger.warn(
        `[JoinRoom] PATIENT socket ${client.id} tried to join unauthorized room "${room}"`,
      );
      return {
        success: false,
        message: 'Patients may only join patient rooms',
      };
    }

    if (!wantsDoctorRoom && !wantsPatientRoom) {
      return { success: false, message: 'Unknown room format' };
    }

    void client.join(room);
    this.logger.log(
      `[JoinRoom] Socket ${client.id} (${role}) joined room "${room}"`,
    );
    return { success: true, message: `Joined room ${room}` };
  }

  // ─── Broadcast Helper ──────────────────────────────────────────────────────

  /**
   * Emits a typed appointment event to the doctor room and the patient room.
   *
   * Called by CheckInService and AppointmentService after every status change.
   * Never uses io.emit() — only targeted room broadcasts.
   */
  emitAppointmentEvent(
    event: SocketEventName,
    payload: AppointmentEventPayload,
  ): void {
    const doctorRoom = buildDoctorRoom(payload.doctorId);
    const patientRoom = buildPatientRoom(payload.patientId);

    // ── Audit log ────────────────────────────────────────────────────────────
    this.logger.log(
      `[Emit] ${event} → rooms [${doctorRoom}, ${patientRoom}] ` +
        `| appointmentId=${payload.appointmentId} status=${payload.status}`,
    );

    // ── Targeted broadcast (never io.emit) ───────────────────────────────────
    this.server.to(doctorRoom).emit(event, payload);
    this.server.to(patientRoom).emit(event, payload);
  }
}
