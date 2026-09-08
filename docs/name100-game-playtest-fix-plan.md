# Name100Challenge 实测问题修复开发文档

## 状态

- 更新日期：2026-09-08
- 最新线上状态：提交 `2f3282b` 未成功部署；Run tests 失败，Build 和 Deploy 被跳过。
- 本轮本地状态：已复现并修复 Run tests 失败源，全量测试、本地代码检查、数据检查和生产构建均通过。
- 当前结论：本轮改动属于“已改代码，待提交/部署后上线验收”。

## 本轮处理的问题

### P0：发布流程失败

问题：

- GitHub Actions 的 Run tests 失败，导致 Build 和 Deploy 跳过。
- 本地复现后确认失败来自 `src/tests/homepage-game.test.ts` 的源码级断言：结果卡移动后，测试仍用 `lastIndexOf('  return (')` 截取 JSX，误截到 helper 函数区域。

修复：

- 更新 homepage 源码测试，改为从组件主 `return (` 截取。
- 同步断言新版结果卡标题、5 列工具栏、当前分类标签、反馈提交和结束时间持久化。

验收：

- CI 同款全量测试 `pnpm exec tsx --test <all test files>` 本地通过，194/194。

### P1：通关后刷新会改变剩余时间

问题：

- 100/100 时剩余 `05:22`，刷新变 `05:12`，再次刷新变 `12:00`。
- 根因是已结束回合恢复时仍按 `deadlineMs` 重新计算剩余时间；第二次持久化后 `isStarted=false` 又恢复为满时长。

修复：

- 已结束回合持久化时不再保存 `deadlineMs`。
- 恢复已结束回合时直接读取保存的 `remainingTime`。

验收：

- 100/100、主动 End、自然超时后刷新，结果卡中的剩余时间应保持不变。
- Play again 后恢复 `0/100` 和完整时长。

### P1：常见人物遗漏

新增答案：

- Ana de Armas：Actresses。
- Margot Robbie：Actresses。
- Sabrina Carpenter：Musicians + Actresses。
- Simone Biles：Athletes。
- Liu Yifei：Actresses，别名 Crystal Liu。

验收：

- 主游戏输入上述名字均可得分。
- 数据测试覆盖这些名字，防止回归。

### P1：非人物被计分

问题：

- Lady Antebellum 是音乐组合，不应作为个人答案计分。

修复：

- 从 `answers-women.json` 删除 Lady Antebellum。
- 在 `answer-data-policy.mjs` 增加 `excludedWomenAnswers`。
- `repair-answer-data.mjs` 会持续排除该条目。

验收：

- `checkAnswer('Lady Antebellum')` 返回 null。

### P1：分类不完整

修复：

- Virginia Woolf 保留主分类 Historical，并加入 Writers & More。
- J.K. Rowling 保留主分类 Historical，并加入 Writers & More。
- Jane Austen 已支持 Writers & More。
- 每日挑战和分类练习传入当前分类上下文，答案格优先展示当前模式命中的分类。

验收：

- Writers & More 输入 Virginia Woolf、J.K. Rowling、Jane Austen 均可得分。
- 今日挑战若包含 Writers & More，上述作家显示 More，而不是只显示 History。

### P1：缺失答案反馈尚不能提交

修复：

- 新增 `POST /api/game/feedback`。
- 前端 `Send feedback` 改为真实提交，包含名字、模式、页面路径、备注和 Turnstile token。
- 后端验证参数、游戏模式、Turnstile 后，写入 `game_comments` 表，状态为 `pending`，不会公开显示在留言墙。
- 前端提供发送中、成功、失败和重试反馈。

验收：

- 生产环境 Turnstile 与 D1 配置完整时，提交后显示 `Thanks, we'll review it.`
- 后台可从 `game_comments.status = pending` 查到反馈。

### P2：结果卡位置

状态：

- 新版结果卡已经真实移动到输入区下方，部署后验证即可。

验收：

- 100/100、超时、主动 End 后，不需要滚动到 100 格、榜单和留言墙之后即可看到结果。

### P2：缺少版本号

修复：

- GitHub Actions 注入 `VITE_GIT_SHA`。
- Build 前写入 `VITE_BUILD_TIME`。
- 页脚显示 `Version <short sha> | <UTC build time>`。

验收：

- 线上页脚可用于确认当前部署对应的 commit 和构建时间。

## 仍建议后续处理

- 系统性扩充答案库：按音乐、影视、体育、国际人物建立常见答案回归样本。
- 全量分类审计：重点检查作家、互联网人物、演员/歌手跨界人物、政治/历史/活动家重叠人物。
- 分享成绩增加完成用时和每日挑战日期。
- 增加可保存的成绩卡图片。
- 复盘分组增加“去练这个分类”的入口。

## 完整性检测清单

本轮没有使用 OpenSpec 技能；若后续进入 OpenSpec 流程，必须执行全套完整性检测：

- 接口参数完整性：反馈、成绩提交、分享配置的必选/可选参数完整。
- 请求/响应结构完整性：字段、类型、注释和错误结构完整。
- 异常场景完整性：空名字、非法分类、超长反馈、重复请求、过期 session、权限不足、Turnstile 失败全覆盖。
- 错误码完整性：每类异常有专属错误码和用户可读文案。
- 业务逻辑完整性：主游戏、男性、每日、分类模式闭环到结束、分享、保存、反馈。
- 边界场景完整性：0/30、1/30、29/30、30/30、99/100、100/100、刷新恢复后分享。
- 规范代码一致性：实现与 OpenSpec / OpenAPI 文档匹配。
- 兼容性完整性：旧存档、旧 `category` 数据、排行榜和评论功能不被破坏。

## 本轮验证

```bash
pnpm check
pnpm locale:check
pnpm data:check
pnpm exec tsx --test <all src/scripts *.test.ts>
pnpm build
git diff --check
```

结果：

- `pnpm check` 通过。
- `pnpm locale:check` 通过，733 keys。
- `pnpm data:check` 通过，女性答案 570，男性答案 533。
- 全量测试通过，194/194。
- `pnpm build` 通过，仅保留 Vite 大 chunk 警告。
- `git diff --check` 通过，仅有 Windows 换行转换提示。
