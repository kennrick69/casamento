// Resolve a base do volume persistente de uploads de forma consistente em TODO
// o app (upload de foto, leitura de foto e health check usam ESTA função).
//
// Ordem de precedência:
//  1. RAILWAY_VOLUME_MOUNT_PATH — injetado AUTOMATICAMENTE pelo Railway quando há
//     um Volume anexado ao serviço. É a fonte de verdade do caminho REAL do mount.
//     Preferir esse valor faz o app "se curar" caso o override manual aponte para
//     um caminho errado (ex.: RAILWAY_VOLUME_PATH=/data mas o volume está em outro
//     path, ou nenhum volume montado em /data → ENOENT).
//  2. RAILWAY_VOLUME_PATH — override manual (retrocompat). Quando o volume é
//     montado em /data e esse env também é /data, os dois concordam.
//  3. Fallback de desenvolvimento: /tmp/casamento-uploads.
export const DEV_VOLUME_FALLBACK = "/tmp/casamento-uploads";

export function resolveVolumeBase(): string {
  const mount = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (mount) return mount;
  const manual = process.env.RAILWAY_VOLUME_PATH?.trim();
  if (manual) return manual;
  return DEV_VOLUME_FALLBACK;
}

// Há um Volume Railway de verdade anexado ao serviço? Só então os uploads
// persistem entre deploys. O Railway só injeta RAILWAY_VOLUME_MOUNT_PATH quando
// um Volume está anexado — sua ausência em produção significa armazenamento
// efêmero (as fotos somem a cada deploy).
export function hasPersistentVolume(): boolean {
  return !!process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
}

// Estamos rodando dentro do Railway? (para não acusar "sem volume" em dev local)
export function isRailwayRuntime(): boolean {
  return !!(
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID
  );
}
