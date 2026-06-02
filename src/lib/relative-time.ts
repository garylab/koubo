const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;

export function formatRelative(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  if (diff < 30_000) return "刚刚";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < MONTH) return `${Math.floor(diff / DAY)} 天前`;
  const d = new Date(ts);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
