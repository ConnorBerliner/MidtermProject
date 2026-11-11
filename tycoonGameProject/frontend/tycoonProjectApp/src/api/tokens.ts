const ACCESS = "tycoon.access";
const REFRESH = "tycoon.refresh";

export const tokens = {
  getAccess: (): string | null => localStorage.getItem(ACCESS),
  getRefresh: (): string | null => localStorage.getItem(REFRESH),
  set(access: string, refresh?: string): void {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};