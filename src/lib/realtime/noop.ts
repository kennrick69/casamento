import type { RealtimeProvider } from "./types";

// Usado em desenvolvimento sem Pusher configurado.
export class NoopRealtimeProvider implements RealtimeProvider {
  async trigger(channel: string, event: string, data: unknown) {
    console.log("[DEV REALTIME]", { channel, event, data });
  }

  authorize(_channel: string, _socketId: string) {
    return { auth: "dev-auth" };
  }
}
