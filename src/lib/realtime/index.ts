import type { RealtimeProvider } from "./types";
import { PusherProvider } from "./pusher";
import { NoopRealtimeProvider } from "./noop";

export const realtime: RealtimeProvider =
  process.env.PUSHER_APP_ID
    ? new PusherProvider()
    : new NoopRealtimeProvider();

export type { RealtimeProvider } from "./types";
