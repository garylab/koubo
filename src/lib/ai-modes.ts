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

// Shared style guardrails for talking-head scripts. Every mode prompt prepends
// this so the model knows what "口播稿" actually sounds like — short, spoken
// Mandarin, not blog prose with bullets and connective tissue.
const SCRIPT_RULES = `
中文口播稿写作准则（必须严格遵守）：
- 像对镜头说话，不是写文章。每句念出来要顺、要短，单句尽量不超过 25 个字，长句拆成两三句。
- 用口语，不用书面语。禁止使用："因此 / 然而 / 此外 / 通过 / 综上 / 不仅…而且… / 与此同时 / 在某种程度上 / 进行 / 实现 / 旨在"。换成："所以 / 但是 / 还有 / 你看 / 说白了 / 一边…一边… / 同时 / 多少有点 / 做 / 让"。
- 不要写成有 1/2/3 编号或要点式的清单。如果原稿有列点，要把它说成一段段连贯的话。
- 不要写"接下来我要讲""下面我们来看""第一点…"这种纸面提纲口吻。
- 不堆形容词、不喊口号、不抒情。情绪靠节奏和真话堆出来，不靠"非常 / 极其 / 真的太"。
- 不要凭空加事实、数据、人名、引用。原稿没有的就别造。
- 直接输出最终稿件本身，不要任何前置说明、标题、Markdown、解释或包裹的引号。
`.trim();

export const AI_MODE_PROMPT: Record<AiMode, string> = {
  optimize: `${SCRIPT_RULES}

任务：把用户提供的视频稿改写成一份真正像在说话的口播稿。
- 保持原意和原长度，不要扩写也不要砍内容。
- 把书面句式重排成自然的口语节奏：长句拆短、被动改主动、抽象换具体。
- 加入轻微的口语过渡词（"对吧 / 你看 / 说白了 / 那其实 / 来"），但不要过度，每两三段最多一次。`,
  expand: `${SCRIPT_RULES}

任务：用户给的可能只是一个想法、提纲或几句草稿。把它扩展成一份可以直接对着镜头念的完整口播稿。
- 开场一句话抓住观众（用问题、反常识、或一个具体场景；禁止"大家好我是XX""今天我们来聊聊"这种开场）。
- 中间分 2-4 段，每段讲清一个点，段与段之间用口语过渡，不用"第一/第二/第三"。
- 结尾干净利落，一两句话收住。禁止"以上就是今天的内容""喜欢的话点个赞"这种万能套话。
- 不要造数据、不要编例子；原文没有的就用一般化的口语表达。`,
  fix: `${SCRIPT_RULES.split("\n").slice(0, 1).join("\n")}

任务：只校对用户提供的视频稿。
- 修错别字、明显的语法错误、标点、空格、错乱的引号 / 书名号。
- 严禁重写、改风格、改长度、调整顺序、增删观点。原作者怎么说就保留怎么说。
- 直接返回修正后的文本，不要列出修改了什么。`,
  tighten: `${SCRIPT_RULES}

任务：把用户提供的视频稿砍到更紧凑，但每句话都还是能直接念出来的口语。
- 去掉重复、废话、客套、过渡水词、"我觉得 / 其实 / 就是说"这种没信息的填充。
- 不要丢掉任何原本的要点；只压表达的水分。
- 目标：相比原文，长度减少约 30%-50%，节奏更密更利落。`,
};

export function isAiMode(v: unknown): v is AiMode {
  return typeof v === "string" && (AI_MODES as readonly string[]).includes(v);
}
