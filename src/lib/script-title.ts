const MAX_TITLE_LEN = 40;

export function deriveTitle(content: string | null | undefined): string {
  if (!content) return "（空稿件）";
  const trimmed = content.trim();
  if (!trimmed) return "（空稿件）";
  const firstLine = trimmed.split(/\r?\n/)[0];
  if (firstLine.length <= MAX_TITLE_LEN) return firstLine;
  return firstLine.slice(0, MAX_TITLE_LEN) + "…";
}
