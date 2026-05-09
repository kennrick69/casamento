/**
 * Backblaze B2 backup uploader.
 *
 * Uses the B2 S3-compatible API so no extra SDK is needed — plain fetch is enough.
 * Required env vars (when configured):
 *   B2_KEY_ID          — Application Key ID
 *   B2_APPLICATION_KEY — Application Key (secret)
 *   B2_BUCKET          — Bucket name (e.g. "casamento-backups")
 *   B2_ENDPOINT        — S3-compatible endpoint (e.g. "https://s3.us-east-005.backblazeb2.com")
 *
 * When any var is missing, all operations no-op and return { ok: false, reason: "not-configured" }.
 */

const RETENTION_DAYS_B2 = 90;

function getB2Config() {
  const keyId = process.env.B2_KEY_ID;
  const appKey = process.env.B2_APPLICATION_KEY;
  const bucket = process.env.B2_BUCKET;
  const endpoint = process.env.B2_ENDPOINT;
  if (!keyId || !appKey || !bucket || !endpoint) return null;
  return { keyId, appKey, bucket, endpoint };
}

function getAuthHeader(keyId: string, appKey: string) {
  const creds = Buffer.from(`${keyId}:${appKey}`).toString("base64");
  return `Basic ${creds}`;
}

export async function uploadBackupToB2(
  slug: string,
  date: string,
  content: string
): Promise<{ ok: boolean; reason?: string; key?: string }> {
  const cfg = getB2Config();
  if (!cfg) return { ok: false, reason: "not-configured" };

  const key = `backups/${slug}/backup-${date}.json`;
  const url = `${cfg.endpoint}/${cfg.bucket}/${key}`;
  const body = Buffer.from(content, "utf-8");

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: getAuthHeader(cfg.keyId, cfg.appKey),
        "Content-Type": "application/json",
        "Content-Length": String(body.byteLength),
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: `B2 PUT ${res.status}: ${text.slice(0, 100)}` };
    }

    return { ok: true, key };
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
}

export async function pruneOldB2Backups(slug: string): Promise<{ pruned: number; reason?: string }> {
  const cfg = getB2Config();
  if (!cfg) return { pruned: 0, reason: "not-configured" };

  const prefix = `backups/${slug}/`;
  const listUrl = `${cfg.endpoint}/${cfg.bucket}?prefix=${encodeURIComponent(prefix)}&list-type=2`;

  try {
    const listRes = await fetch(listUrl, {
      headers: { Authorization: getAuthHeader(cfg.keyId, cfg.appKey) },
    });
    if (!listRes.ok) return { pruned: 0, reason: `list ${listRes.status}` };

    const xml = await listRes.text();
    const keyMatches = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
    const cutoff = Date.now() - RETENTION_DAYS_B2 * 24 * 60 * 60 * 1000;

    let pruned = 0;
    for (const key of keyMatches) {
      const dateMatch = key.match(/backup-(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) continue;
      const fileDate = new Date(dateMatch[1]).getTime();
      if (fileDate < cutoff) {
        const delRes = await fetch(`${cfg.endpoint}/${cfg.bucket}/${key}`, {
          method: "DELETE",
          headers: { Authorization: getAuthHeader(cfg.keyId, cfg.appKey) },
        });
        if (delRes.ok) pruned++;
      }
    }
    return { pruned };
  } catch (err) {
    return { pruned: 0, reason: String(err) };
  }
}

export function isB2Configured(): boolean {
  return getB2Config() !== null;
}
