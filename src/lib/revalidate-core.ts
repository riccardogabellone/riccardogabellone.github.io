export function shouldRefresh(bakedFetchedAt: string, remoteLastUpdated: string): boolean {
  const a = Date.parse(bakedFetchedAt);
  const b = Date.parse(remoteLastUpdated);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b > a;
}
