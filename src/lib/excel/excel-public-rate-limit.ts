const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 8;

const hits = new Map<string, number[]>();

export function excelExtractClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function isExcelExtractRateLimited(clientId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(clientId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(clientId, recent);
    return true;
  }
  recent.push(now);
  hits.set(clientId, recent);
  return false;
}
