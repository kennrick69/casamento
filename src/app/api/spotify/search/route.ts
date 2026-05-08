import { NextRequest, NextResponse } from "next/server";
import { isSpotifyConfigured, searchTracks } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ tracks: [], configured: false });
  }

  if (!isSpotifyConfigured()) {
    return NextResponse.json({ tracks: [], configured: false });
  }

  try {
    const tracks = await searchTracks(query);
    return NextResponse.json({ tracks, configured: true });
  } catch {
    return NextResponse.json({ tracks: [], configured: true, error: true });
  }
}
