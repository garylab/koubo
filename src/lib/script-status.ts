export const SCRIPT_STATUSES = [
  "unrecorded",
  "recording",
  "recorded",
  "published",
] as const;

export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];

export const SCRIPT_STATUS_LABEL: Record<ScriptStatus, string> = {
  unrecorded: "未录制",
  recording: "录制中",
  recorded: "已录制",
  published: "已发布",
};

export function isScriptStatus(v: unknown): v is ScriptStatus {
  return (
    typeof v === "string" && (SCRIPT_STATUSES as readonly string[]).includes(v)
  );
}
