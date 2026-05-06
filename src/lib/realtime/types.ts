export interface RealtimeProvider {
  trigger(channel: string, event: string, data: unknown): Promise<void>;
  authorize(channel: string, socketId: string): { auth: string };
}
