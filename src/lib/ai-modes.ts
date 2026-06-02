export const AI_MODES = ["optimize", "expand", "fix", "tighten"] as const;

export type AiMode = (typeof AI_MODES)[number];

export const AI_MODE_LABEL: Record<AiMode, string> = {
  optimize: "优化",
  expand: "完善",
  fix: "修正",
  tighten: "精简",
};

export const AI_MODE_HINT: Record<AiMode, string> = {
  optimize: "通顺自然，节奏更口播",
  expand: "想法扩成完整稿",
  fix: "改错字、语法、标点",
  tighten: "去冗余，更紧凑",
};

export const AI_MODE_PROMPT: Record<AiMode, string> = {
  optimize: `你是口播视频稿优化助手。请重写用户提供的视频稿，让它：
1. 更口语化、节奏更自然，适合录制；
2. 保留原意，不要添加新的事实信息；
3. 句子短而有力，避免书面语；
4. 直接返回优化后的文本，不要任何前后说明或标题。`,
  expand: `你是口播视频稿创作助手。用户提供的可能只是一个想法、提纲或片段。请把它扩展成一份完整、可以直接录制的口播稿：
1. 给出有吸引力的开场和自然的收尾；
2. 中间内容承上启下，逻辑通顺，节奏适合口播；
3. 不要凭空捏造具体的事实、数据或人名；如果原文没有具体例子，可以用一般化的表达；
4. 直接返回扩写后的完整稿件，不要任何前后说明或标题。`,
  fix: `你是中文文本校对助手。请修正用户提供的视频稿中的错别字、语法错误、标点和格式问题：
1. 只做"必要的修改"，不重写、不改变风格、不改变原意；
2. 保留原作者的句式和口吻；
3. 直接返回修正后的文本，不要任何前后说明或标题。`,
  tighten: `你是口播视频稿精简助手。请把用户提供的视频稿改得更紧凑：
1. 去掉冗余、重复、废话；
2. 保留全部要点和原意，不要添加新信息；
3. 节奏短促、口语化，适合录制；
4. 直接返回精简后的文本，不要任何前后说明或标题。`,
};

export function isAiMode(v: unknown): v is AiMode {
  return typeof v === "string" && (AI_MODES as readonly string[]).includes(v);
}
