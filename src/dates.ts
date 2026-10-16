export function date(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}
export function overdue(dueAt: string, status: string, now = Date.now()) {
  return status === "Active" && Date.parse(dueAt) < now;
}
export function overdueDays(dueAt: string, status: string, now = Date.now()): number | null {
  return overdue(dueAt, status, now) ? Math.floor((now - Date.parse(dueAt)) / 86400000) : null;
}
export function reservationSearch(value: string) {
  return value.trim().replace(/^[bв]-\s*(\d+)$/i, "$1");
}
