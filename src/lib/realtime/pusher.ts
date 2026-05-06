import PusherServer from "pusher";
import type { RealtimeProvider } from "./types";

export class PusherProvider implements RealtimeProvider {
  private server: PusherServer;

  constructor() {
    this.server = new PusherServer({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER ?? "us2",
      useTLS: true,
    });
  }

  async trigger(channel: string, event: string, data: unknown) {
    await this.server.trigger(channel, event, data);
  }

  authorize(channel: string, socketId: string) {
    return this.server.authorizeChannel(socketId, channel);
  }
}
