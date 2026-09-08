# Name100Challenge 实测问题修复开发文档

## 状态

- 当前状态：已实施，待生产部署后复核。
- 完成时间：2026-09-08。
- 阶段 A：已完成。已补齐第一批缺失人物，修正 Madam C. J. Walker 分类，并支持多分类筛选。
- 阶段 B：已完成。分享文案已按模式、目标人数和时长生成，结束态 Share score 强制包含成绩。
- 阶段 C：已完成。结果卡已上移到输入区附近，有进度重置需要确认，计时器 00:00 后进入 completed 状态。
- 阶段 D：部分完成。已答格子已显示分类文字，缺失答案已提供站内轻量反馈表并带入被拒绝名字；反馈表目前为前端占位入口，尚未接入后端审核流。
- 验证状态：全量 Node 测试 162/162 通过；本次改动文件定向 Biome 通过；`pnpm.cmd build` 通过。完整 `pnpm.cmd check` 受仓库既有 `.codebuddy/db/vectra` 缓存格式问题和 `wrangler.jsonc` 末尾空行影响未通过，需另行清理后复跑。浏览器冒烟验证因本机 dev server 监听后 HTTP 超时未完成。

## 背景

2026-09-08 的完整实测已覆盖主游戏 100/100 通关、结算、分享、重玩、每日挑战自然超时、男性模式、音乐分类和计时器。主游戏后半程使用网站公开答案逐个输入，用于验证通关流程。

当前最影响二次游玩的不是新增页面，而是答案判定可信度、分类直觉和分享结果准确性。修复顺序应为：

1. 补答案和修分类。
2. 修复各模式分享文案和超时成绩分享。
3. 改善结算、重置、计时器和反馈入口。

## 现状代码落点

- 主游戏组件：`src/components/game/name100-game.tsx`
- 答案判定：`src/lib/gameEngine.ts`
- 分享文案：`src/lib/share.ts`
- 女性答案库：`src/data/answers-women.json`
- 男性答案库：`src/data/answers-men.json`
- 分类元数据和每日挑战筛选：`src/lib/name100-data.ts`
- 每日挑战页面：`src/routes/(pages)/challenge.tsx`
- 男性模式页面：`src/routes/(pages)/men.tsx`
- 分类模式页面：`src/routes/(pages)/categories/$slug.tsx`
- 计时器工具：`src/components/game/timer-tool.tsx`
- 现有测试：`src/lib/share.test.ts`、`src/lib/game-community.test.ts`、`src/routes/api/game/*.test.ts`、`src/tests/homepage-game.test.ts`

## 实测问题清单

| 优先级 | 问题 | 实测现象 | 修复目标 |
| --- | --- | --- | --- |
| 高 | 常见人物没有收录 | 主游戏输入 Billie Eilish、Zendaya、Michelle Yeoh 均被拒绝 | 补齐高频、跨文化、用户最容易想到的人物 |
| 高 | 人物分类错误或不符合直觉 | Madam C. J. Walker 在音乐分类中得分；每日挑战含 Writers & More 但 Jane Austen 被拒绝 | 修正明显错类，并支持多分类归属 |
| 高 | 分享邀请文案没有跟随模式变化 | 男性模式仍写“100 位女性、12 分钟”；每日挑战 30 人、5 分钟仍写“100 人、12 分钟” | 分享文案由当前模式、目标人数、时限生成 |
| 高 | 超时后分享不包含成绩 | 每日挑战 1/30 超时后点击 Share score，复制内容仍是通用邀请 | 通关和超时结束都生成成绩分享文案 |
| 中 | 游戏结束反馈不明显 | 100/100 后输入区附近仍是最后一个名字答对提示，结算和保存成绩在页面下方 | 输入区附近出现明显结果卡，提供重玩、分享、保存入口 |
| 中 | 中途重置容易误触 | 4 分后点圆形重置按钮立即清零，没有确认或撤销 | 有进度时确认，或提供短时间撤销 |
| 中 | 计时器到零后仍提供无效 Start | 00:00 后点 Start 短暂变 Pause，再回 Start，不重新计时 | 到时后按钮改为“再来一轮”，恢复选定时长 |
| 低 | 补充答案反馈路径太长 | Report a missing answer 先跳 Contact，再要求去 GitHub Issue，且没有带入刚才输入的名字 | 提供简短反馈表，自动带入名字和游戏模式 |
| 低 | 类别只通过颜色体现 | 首页规则说有类别标签，但格子主要显示名字和颜色 | 已答格子显示可读分类标签，便于复盘 |
| 低 | 100 个格子让游戏区很长 | 规则和长篇介绍占用注意力，游戏区滚动长 | 保留输入框和计时器可见，规则/长介绍折叠 |

## 修复方案

### 1. 答案库补齐和分类数据升级

#### 1.1 先补齐高频缺失人物

第一批最小补充名单：

- Billie Eilish：`musicians`
- Zendaya：建议主分类 `actresses`，别名包含 `Zendaya Coleman`
- Michelle Yeoh：`actresses`
- Jane Austen：建议主分类 `other`，可进入 Writers & More

同时复核历史反馈中已出现的高频缺失名单，至少包含：

- Michelle Obama
- Melania Trump
- Kate Middleton
- Rosa Parks
- Marie Curie
- Ada Lovelace

验收要求：

- 以上名字在主游戏均可得分。
- Jane Austen 在 Writers & More 每日/分类池中可得分。
- 新增别名不能造成 `checkAnswer()` 的多重精确匹配，否则会返回 `null`。

#### 1.2 修正 Madam C. J. Walker 分类

当前 `Madam C. J. Walker` 位于 `musicians`，应从音乐分类移出。建议：

- 主分类：`business`
- 次分类：`activists` 或 `historical`
- 资料依据：美国国家公园管理局页面将其描述为 entrepreneur，并强调 philanthropy 与 activism；不应作为音乐人物优先归类。

参考资料：

- https://www.nps.gov/articles/000/-h-our-history-lesson-madam-c-j-walker-african-american-millionaire-philanthropist-activist.htm

#### 1.3 支持多分类

当前 `Answer` 只有单个 `category: string`，导致“人物跨领域”无法表达，且每日挑战按单分类过滤时会拒绝符合玩家直觉的答案。

建议将答案结构升级为向后兼容格式：

```ts
export interface Answer {
  name: string;
  aliases: string[];
  category: string;
  categories?: string[];
  hint?: string;
}
```

规则：

- `category` 保留为主分类，用于旧逻辑、默认颜色、排行榜展示和兼容旧数据。
- `categories` 为可选数组，包含主分类和次分类。
- 所有分类筛选使用 `getAnswerCategories(answer)`，判断 `category === slug || categories?.includes(slug)`。
- 去重仍按人物规范名去重，不按分类重复计分。

需要改动：

- `src/lib/gameEngine.ts`：新增分类 helper 类型或保持 Answer 类型兼容。
- `src/lib/name100-data.ts`：`getAnswersByCategory()`、`getCategoryStats()`、`getDailyAnswers()` 改为多分类匹配。
- `src/components/game/name100-game.tsx`：已答格子的颜色仍可用主分类；新增分类文字标签时优先展示当前游戏上下文分类，其次展示主分类。
- `src/routes/(pages)/answers.tsx`：答案列表可在多个分类中出现，或展示“主分类 + 其他分类”说明。若选择多分类重复展示，要避免总数文案误导为唯一人物数。

#### 1.4 数据质量检测脚本

新增或扩展测试，覆盖：

- `name` 非空，`aliases` 数组存在，`category` 属于 `categoryOrder`。
- `categories` 如存在，必须非空、去重、全部属于 `categoryOrder`，且包含 `category`。
- 规范化后的 `name + aliases` 不允许跨人物冲突，除非显式白名单。
- 第一批补充名单必须命中。
- Madam C. J. Walker 不允许出现在 `musicians` 分类池。
- Jane Austen 必须出现在 `other` / Writers & More 分类池。

## 2. 分享逻辑修复

### 2.1 分享配置模型

当前 `shareChallenge()` 只接收 `score`、`targetScore` 和 `href`，邀请文案硬编码为女性 100 人 12 分钟。建议新增模式上下文：

```ts
type ShareChallengeOptions = {
  score: number;
  targetScore: number;
  durationSeconds: number;
  href: string;
  modeLabel: string;
  subjectLabel: string;
  resultMode?: 'auto' | 'invite' | 'score';
  shareNavigator: ChallengeShareNavigator;
  onMessage: (message: string) => void;
};
```

示例文案：

- 主女性模式，未达到成绩阈值：
  `Can you name 100 famous women in 12 minutes? Try the Name 100 Challenge:`
- 男性模式：
  `Can you name 100 famous men in 12 minutes? Try the Name 100 Men Challenge:`
- 每日挑战邀请：
  `Can you name 30 famous women in 5 minutes in today's daily challenge?`
- 分类练习邀请：
  `Can you name 30 actresses in 5 minutes?`
- 任意结束成绩：
  `I named 1 of 30 in today's Name 100 Daily Challenge. Can you beat me?`

### 2.2 超时结束必须分享成绩

当前低分使用 `MIN_BRAG_SCORE_RATIO = 0.1`，因此 1/30 会回退为通用邀请。这个规则适合未结束时的顶部 Share，但不适合结束卡片中的 Share score。

建议拆分两个入口：

- 顶部 `Share`：游戏未结束时可继续使用邀请文案；游戏结束时分享成绩。
- 结算卡 `Share score`：强制 `resultMode: 'score'`，只要 `score > 0` 就包含成绩；`score = 0` 也应明确写 `I scored 0 of 30...`，避免“Share score”复制出邀请。

验收要求：

- `/men` 分享不出现 `women`。
- `/challenge` 分享不出现 `100` 或 `12 minutes`，除非真实配置就是 100/12。
- 每日挑战 1/30 超时后 Share score 包含 `1 of 30`。
- 主游戏 100/100 通关分享仍包含成绩。
- Clipboard fallback 和 Web Share API payload 文案一致。

## 3. 结束、重置和计时器交互

### 3.1 结束结果卡上移

当前结算卡在 100 个格子之后，用户通关或超时后容易只看到输入框变灰和旧提示。

建议：

- 在输入框/进度条下方、答案格子之前增加 `RoundResultCard`。
- 游戏结束时隐藏或替换最后一次答对提示，展示：
  - Final score
  - 用时或剩余时间
  - Play again
  - Share score
  - Save score
- 下方原结算区可以删除，或保留更轻量的详细信息，避免重复主操作。

### 3.2 重置保护

当前 `resetGame()` 被圆形按钮直接调用。有进度时应保护玩家。

建议方案：

- `score > 0 && !isGameOver` 时点击 Restart，弹出确认对话框。
- 确认文案必须包含当前分数：`Restart and lose your 4 answers?`
- 移动端也要可用，优先使用现有 shadcn alert dialog。
- 低成本替代方案：点击后先显示 5 秒撤销 snackbar，再真正清空。但实现复杂度更高，不作为首选。

验收要求：

- 0 分点击 Restart 仍立即重置。
- 已有分数点击 Restart 不立即清零。
- 确认后清零并恢复时长。
- 取消后分数、已答名单和剩余时间不变。

### 3.3 计时器到零后的 Start 行为

`src/components/game/timer-tool.tsx` 到 00:00 后应进入 completed 状态。

建议：

- 状态机区分 `idle | running | paused | completed`。
- completed 状态主按钮显示 `Play again` 或 `Restart timer`。
- 点击后恢复选定时长并回到 idle，或直接开始新一轮；二者选一并保持文案一致。
- 00:00 状态不允许出现短暂 Pause 闪烁。

## 4. 反馈入口优化

### 4.1 缺失答案反馈表

将 “Report a missing answer” 改为站内轻量反馈：

- 自动带入最后一次被拒绝输入。
- 自动带入 `gameId`、`targetScore`、`durationSeconds`、当前页面路径。
- 字段：名字、建议分类、补充说明、可选来源链接。
- 成功后显示“Thanks, we'll review it.”，不要要求用户再去 GitHub。

后端可复用现有评论/联系能力，也可以新增独立 endpoint。若新增 API，必须补齐：

- 参数校验。
- 错误码。
- 频率限制。
- Turnstile 或其他反滥用策略。
- 后台审核状态。

## 5. 布局和复盘可读性

### 5.1 已答格子显示分类文字

当前颜色可以表达分类，但缺少文字标签。建议每个已答格子展示：

- 人名。
- 小号分类标签，如 `Music`、`Acting`、`Writers`。

移动端空间不足时：

- 分类标签可缩短为 `Music` 等短标题。
- 保证人名不被分类挤掉；优先保留人名完整性。

### 5.2 保持游戏操作区可见

建议：

- 输入框、计时器、分数、Restart、Share 保持 sticky。
- 规则和长篇介绍默认折叠，首屏优先展示游戏。
- 100 格答案区保持紧凑，可考虑虚拟化或按 25 个一组视觉分段；先不引入复杂组件。

## 6. 测试计划

### 6.1 数据测试

新增 `src/lib/name100-data.test.ts` 或扩展现有测试：

- 补充名单全部被 `checkAnswer()` 命中。
- 多分类筛选命中 Jane Austen。
- Madam C. J. Walker 不在音乐分类结果中。
- 分类统计逻辑明确区分“唯一人物数”和“分类条目数”。
- 所有别名规范化后无冲突。

### 6.2 分享测试

扩展 `src/lib/share.test.ts`：

- women / men / daily / category 四种文案。
- 未结束顶部分享和结束 Share score 的差异。
- 1/30、0/30、100/100、30/30 边界。
- Clipboard fallback 文案和 Web Share payload 一致。

### 6.3 组件行为测试

扩展 `src/tests/homepage-game.test.ts` 或引入 React Testing Library 后补行为测试：

- 结束卡出现在答案格子之前。
- 有分数时 Restart 出确认。
- Share score 调用强制成绩文案。
- 已答格子包含分类可读文本。

### 6.4 手动验收

手动通过 `pnpm dev` 验证：

- 主游戏输入 Billie Eilish、Zendaya、Michelle Yeoh 均得分。
- 音乐分类输入 Madam C. J. Walker 不得分；商业分类可得分。
- 每日挑战含 Writers & More 时 Jane Austen 可得分。
- `/men` 分享文案为男性模式。
- `/challenge` 1/30 超时后 Share score 复制成绩。
- 100/100 结束时输入区附近出现结果卡。
- 4 分时重置必须确认。
- 计时器到 00:00 后主按钮不再闪烁为 Pause。

建议命令：

```bash
node --test --import tsx src/lib/name100-data.test.ts src/lib/share.test.ts src/tests/homepage-game.test.ts
pnpm check
pnpm build
```

## 7. 完整性检测清单

本次修复如进入 OpenSpec 流程，必须执行完整功能完整性检测：

- 接口参数完整性：新增反馈 API 或分享参数必须定义必选/可选字段。
- 请求/响应结构完整性：反馈表、成绩分享、排行榜提交字段必须有类型和注释。
- 异常场景完整性：空名字、重复别名、非法分类、超长反馈、超时分享、0 分分享、权限/反滥用失败全覆盖。
- 错误码完整性：反馈提交和成绩提交异常必须有专属错误码与用户可读文案。
- 业务逻辑完整性：主游戏、男性、每日、分类模式都能闭环到结束、分享、保存/反馈。
- 边界场景完整性：0/30、1/30、29/30、30/30、99/100、100/100、重复请求、刷新恢复后分享。
- 规范代码一致性：代码实现必须与设计文档和后续 OpenAPI/OpenSpec 完全匹配。
- 兼容性完整性：旧存档、旧答案 `category` 字段、现有排行榜提交和评论功能不被破坏。

## 8. 分阶段交付建议

### 阶段 A：答案和分类可信度

交付：

- 补第一批缺失人物。
- 修 Madam C. J. Walker。
- 引入 `categories?: string[]` 和分类 helper。
- 补数据质量测试。

完成标准：

- 数据测试通过。
- 每日/分类筛选支持多分类。
- 主游戏旧存档不受影响。

### 阶段 B：分享准确性

交付：

- 分享文案参数化。
- 结束状态 Share score 强制成绩文案。
- women / men / daily / category 测试覆盖。

完成标准：

- 实测所有模式复制内容与页面模式一致。
- 超时低分分享包含成绩。

### 阶段 C：结束和重置体验

交付：

- 结果卡上移到输入区附近。
- 有进度重置确认。
- 计时器 completed 状态修复。

完成标准：

- 用户通关/超时后不需要滚动到底部才能看到结果和操作。
- 中途重置不会误清进度。
- 计时器到零后按钮状态稳定。

### 阶段 D：反馈和复盘

交付：

- 缺失答案站内反馈表。
- 已答格子显示分类文字。
- 规则/长介绍折叠或弱化。

完成标准：

- 玩家可在站内提交缺失答案，且自动带入被拒绝名字。
- 玩家能从已答格子看懂分类。
- 首屏更聚焦游戏操作。
