import { Injectable, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../config/api-config';
import { SecurityService } from './security.service';

export interface IncomingSocketMessage {
  senderId: string;
  recipientId: string;
  content: string;
  isSafetyAlert?: boolean;
  crushId?: string;
  messageId?: string;
  timestamp?: string;
  isSelfDestruct?: boolean;
  selfDestructDurationMs?: number;
}

export interface SafetyUpdate {
  senderId: string;
  recipientId: string;
  status?: string;
  location?: string;
  crushId?: string;
}

type MessageHandler = (message: IncomingSocketMessage) => void;
type SafetyHandler = (update: SafetyUpdate) => void;

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private security = inject(SecurityService);
  private socket: Socket | null = null;
  private joinedRoom: string | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private safetyHandlers = new Set<SafetyHandler>();

  private _connected = signal(false);
  public connected = this._connected.asReadonly();

  /**
   * Connects and joins the user's private room. Safe to call repeatedly; it only
   * reconnects when the identity actually changes.
   */
  connect(userId: string): void {
    if (!userId) return;
    const token = this.security.authHeaders()['x-auth-token'];

    if (!token) {
      this.disconnect();
      console.warn('Realtime connection unavailable: missing auth token');
      return;
    }

    if (this.socket && this.joinedRoom === userId) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }

    if (this.socket && this.joinedRoom !== userId) {
      this.disconnect();
    }

    this.socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token }
    });

    this.joinedRoom = userId;

    this.socket.on('connect', () => {
      this._connected.set(true);
      this.socket?.emit('join', userId);
    });

    this.socket.on('disconnect', () => this._connected.set(false));

    this.socket.on('connect_error', (err: Error) => {
      // Chat degrades to REST-only rather than breaking the app.
      console.warn('Realtime connection unavailable:', err.message);
      this._connected.set(false);
    });

    this.socket.on('receiveMessage', (data: IncomingSocketMessage) => {
      this.messageHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('safetyUpdate', (data: SafetyUpdate) => {
      this.safetyHandlers.forEach((handler) => handler(data));
    });
  }

  emitMessage(payload: IncomingSocketMessage): void {
    this.socket?.emit('sendMessage', payload);
  }

  emitSafetyAlert(payload: SafetyUpdate): void {
    this.socket?.emit('safetyAlert', payload);
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onSafetyUpdate(handler: SafetyHandler): () => void {
    this.safetyHandlers.add(handler);
    return () => this.safetyHandlers.delete(handler);
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.joinedRoom = null;
    this._connected.set(false);
  }
}
