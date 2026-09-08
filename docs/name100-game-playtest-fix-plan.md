# Name100Challenge 实测问题修复开发文档

## 状态

- 更新日期：2026-09-08
- 当前阶段：第二轮复测后的集中修复
- 本轮输入：主游戏 100/100、分享、重玩、每日挑战超时、分类模式、计时器，以及三家竞品短局体验
- 线上版本号：无部署版本号，无法精确核对是否对应最后一次 Git 提交

## 第二轮复测结论

上一轮修复已在线上生效，以下问题已经通过桌面浏览器复测：

- Billie Eilish、Zendaya、Michelle Yeoh 已可得分。
- Madam C. J. Walker 已归为 Business，音乐模式不再接受。
- Jane Austen 已可进入今日 Writers & More 范围。
- 男性模式分享文案不再写成女性。
- 每日挑战超时后 Share score 可复制成绩和每日挑战链接。
- 重置已有进度时有确认框，取消后保留进度。
- 计时器归零后显示 Restart timer 并能恢复所选时长。
- 缺失答案反馈已改为页内表单并带入名字和模式。
- 答案格已增加文字分类标签。

仍需继续优化的问题：

- 通关反馈仍不够明显，结算入口仍可能离玩家当前视线太远。
- 答案库仍遗漏常见人物：Sabrina Carpenter、Simone Biles、Liu Yifei。
- 分类修复不完整：J.K. Rowling 在 Writers & More 今日局中仍可能被拒绝；Pokimane 仍可在音乐分类得分。
- 分类标签挤压名字，桌面上 Jennifer Lawrence、Katharine Hepburn 等出现省略。
- 没有主动结束本局入口。
- 分享内容缺少完成用时、每日挑战日期和可保存成绩卡。
- 复盘答案仍是长串名字，缺少分类、简介和练习入口。

## 本轮已实施修复

### 1. 答案库与分类

- 新增 Sabrina Carpenter：主分类 Musicians，次分类 Actresses。
- 新增 Simone Biles：Athletes。
- 新增 Liu Yifei：Actresses，别名 Crystal Liu。
- J.K. Rowling 增加别名 JK Rowling、Joanne Rowling，并加入 Writers & More。
- Pokimane 移出 Musicians，改为 Writers & More。
- 分类测试补充上述回归样本。

验收要求：

- 主游戏输入 Sabrina Carpenter、Simone Biles、Liu Yifei 均可得分。
- Writers & More 今日局或分类局输入 JK Rowling 可得分。
- 音乐分类输入 Pokimane 不得分，Writers & More 输入 Pokimane 可得分。
- 新增别名不能造成跨人物精确匹配冲突。

### 2. 结算前置与主动结束

- 在主工具栏增加 End 按钮，玩家可主动结束当前回合并查看成绩。
- 结果卡真实放入输入区域下方，而不是仅靠 CSS 排序从页面底部移动。
- 游戏结束后输入区附近直接显示 Completed 或 Time up、分数、用时、剩余时间、Play again、Share score、Save score。
- 游戏结束后不再优先显示最后一次答对提示。

验收要求：

- 100/100 后无需滚动到社区区块下方即可看到结果卡。
- 自然超时后输入区附近直接显示 Time up 和成绩。
- 点击 End 后保留当前分数进入正常结算流程。
- Play again、Share score、Save score 均在结果卡内可见。

### 3. 答案格可读性与当前分类展示

- 已答格改为两行布局：第一行名字，第二行分类标签。
- 名字允许换行，并提供原生 title 作为完整名字提示。
- 每日挑战和分类练习会把当前分类上下文传入游戏组件。
- 答案格优先展示当前模式命中的分类；例如 Jane Austen 在 Writers & More 今日局显示 More，而不是 History。

验收要求：

- Jennifer Lawrence、Katharine Hepburn 不应因分类标签被截断。
- 多分类人物在分类局或每日局展示与当前模式相符的标签。
- 旧数据只有 `category` 字段时仍能正常展示和判分。

### 4. 复盘内容

- Show missed answer examples 从逗号长串改为按分类分组。
- 每组展示少量推荐答案和一句 hint，便于玩家复盘。

后续仍建议增加对应分类练习入口。

## 尚未完成

### 高优先级

- 系统性补齐答案库。需要按音乐、影视、体育、国际人物建立常见名字回归样本，而不是只修复报告中的个别名字。
- 全量分类审计。重点检查互联网人物、作家、演员/歌手跨界人物、历史/政治/活动家重叠人物。
- 线上可观测版本号。建议在页面或响应头暴露构建时间 / Git SHA，方便复测确认。

### 中优先级

- 成绩分享增加模式、成绩、用时；每日挑战增加日期。
- 增加可保存的成绩卡图片。
- 缺失答案页内表单接入后端提交、审核和错误码。
- 复盘结果增加“去练这个分类”的入口。

## 竞品观察

### name100women.org

可借鉴：

- 答对后显示头像、简介、国家。
- 可主动结束。
- 结果弹窗包含成绩和用时。

局限：

- Hermione Granger 被模糊匹配成 Hermione Gingold 并加分，说明模糊匹配过宽。

### name-100-women.vercel.app

可借鉴：

- 可主动放弃并保留结果。
- 结算页突出成绩、用时、重玩。
- 自动生成成绩图片。
- 有排行榜展示完成用时。

局限：

- 每个答案需要等待在线验证，反馈速度弱于本站。

### nameawoman.co.uk

可借鉴：

- 正确、错误记录分开显示。
- 正确答案附人物简介，方便核对。

局限：

- 本次拒绝 Billie Eilish。
- 界面较简陋，出现破损图片。

## 完整性检测清单

本次没有使用 OpenSpec 技能或 OpenAPI 规范变更；若后续进入 OpenSpec 流程，必须执行以下完整性检测：

- 接口参数完整性：反馈 API、成绩提交、分享配置的必选/可选参数必须完整。
- 请求/响应结构完整性：字段、类型、注释和错误结构必须完整。
- 异常场景完整性：空名字、非法分类、超长反馈、重复请求、过期 session、权限不足、Turnstile 失败必须覆盖。
- 错误码完整性：每类异常必须有专属错误码和用户可读文案。
- 业务逻辑完整性：主游戏、男性、每日、分类模式都要闭环到结束、分享、保存、反馈。
- 边界场景完整性：0/30、1/30、29/30、30/30、99/100、100/100、刷新恢复后分享必须覆盖。
- 规范代码一致性：实现必须与 OpenSpec / OpenAPI 文档匹配。
- 兼容性完整性：旧存档、旧 `category` 数据、排行榜和评论功能不得破坏。

## 建议验证命令

```bash
node --test --import tsx src/lib/name100-data.test.ts src/tests/answer-data-integrity.test.ts src/lib/share.test.ts
pnpm data:check
pnpm build
```
