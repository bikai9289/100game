# 服务端游戏局与 Turnstile 设计

## 目标

在不影响匿名用户正常游戏的前提下，提高榜单和留言提交的可信度：

- 由服务端签发并校验游戏局，拒绝伪造时长、篡改游戏模式和游戏局重放。
- 服务端继续依据答案表重新计算成绩，不信任客户端分数。
- 分数和留言提交均通过 Cloudflare Turnstile 服务端校验。
- 生产环境缺少安全密钥时保持游戏可玩，但关闭榜单和留言写入。
- 不把密钥、D1 ID 或其他部署凭据提交到 Git。

## 非目标

- 不把每次答案判断迁移到服务端。
- 不新增 D1 游戏局表，不为每次开局写数据库。
- 不做设备指纹、账号体系、复杂风控评分或 Durable Object。
- 不在本阶段实现 Top 100、审核后台、缓存或全局并发控制。

答案表仍会进入浏览器包，技术用户能够查看。本阶段降低自动化、伪造时长和重复上榜风险，但不承诺阻止所有人工作弊。

## 现有能力

`/api/game/community` 已具备：

- Zod 请求校验。
- 服务端答案匹配和去重计分。
- IP 哈希限流、提交指纹和重复提交检测。
- 留言长度、链接和基础危险字符过滤。
- 封禁 IP、昵称和关键词的能力。

当前缺口是客户端可自行提供开始与结束时间、没有一次性游戏局、没有 Turnstile，并且 IP 哈希盐存在公开回退值。

## 方案选择

采用“无状态 HMAC 游戏局 + D1 唯一游戏局 ID + Turnstile”。

与 D1 游戏局表相比，该方案不产生开局写入和过期数据清理；与只接 Turnstile 相比，它还能校验游戏模式、时长和游戏局是否已使用。现有榜单写入仍是唯一需要的 D1 写操作。

## 配置

新增四个环境变量：

| 变量 | 可见性 | 用途 |
| --- | --- | --- |
| `VITE_TURNSTILE_SITE_KEY` | 客户端公开值 | 渲染 Turnstile 控件 |
| `TURNSTILE_SECRET_KEY` | Worker secret | 调用 Siteverify |
| `GAME_SESSION_SECRET` | Worker secret | HMAC-SHA-256 签发游戏局 |
| `GAME_IP_HASH_SALT` | Worker secret | 生成不可反查的 IP 哈希 |

`.env.example` 只增加空变量名和说明。本地 `.env` 使用 Cloudflare 官方测试 sitekey/secret，游戏局密钥与 IP 盐使用本地随机值。生产值通过 Cloudflare Worker secrets 和部署环境变量提供，不写入 `wrangler.jsonc`。

`GAME_SESSION_SECRET` 和 `GAME_IP_HASH_SALT` 至少 32 个字符。任何环境中任一服务端密钥缺失或过短时，安全相关写接口都返回 `503 CONFIGURATION_ERROR`，不得使用默认值或开发模式绕过。排行榜 GET 和本地游戏不依赖这些密钥；本地提交测试必须显式配置官方测试密钥。

## 游戏局接口

新增 `POST /api/game/session`。

请求：

```json
{
  "gameId": "women",
  "durationSeconds": 720,
  "startedAt": 1784736000000
}
```

规则：

- 请求体必须为 JSON 且不超过 4 KB。
- `gameId` 必须能由 `getGameDefinition()` 解析。
- `durationSeconds` 必须与服务端游戏定义完全相同。
- `startedAt` 必须是整数，不得晚于服务器时间 1 秒，也不得早于服务器时间 5 秒。
- 服务端将接受后的 `startedAt` 限制为不晚于当前服务器时间。

成功响应 `201`：

```json
{
  "ok": true,
  "data": {
    "sessionId": "uuid",
    "sessionToken": "base64url-payload.base64url-signature",
    "startedAt": 1784736000000,
    "expiresAt": 1784737020000
  }
}
```

签名载荷包含：版本 `v`、`sessionId`、`gameId`、`durationSeconds`、`startedAt` 和 `expiresAt`。`expiresAt` 等于游戏时长加 5 分钟提交宽限期。签名使用 Web Crypto HMAC-SHA-256；验证时由 Web Crypto 完成签名比对，不自行编写字符串比较。

客户端第一次有效输入时立即开始本地计时和判题，同时异步请求游戏局。成功后将 token 与当前进度一起持久化，刷新页面可以继续；失败不打断游戏，但提交区显示该局无法上榜。重置游戏会清除旧 token，并在下一次有效输入时签发新游戏局。

## 分数提交

分数请求调整为：

```json
{
  "action": "score",
  "gameId": "women",
  "playerName": "Player One",
  "guessedNames": ["Taylor Swift"],
  "durationSeconds": 720,
  "sessionToken": "...",
  "turnstileToken": "..."
}
```

不再接收或信任客户端 `startedAt`、`finishedAt` 和分数。处理顺序：

1. 校验请求结构和生产安全配置。
2. 校验 HMAC、载荷版本、过期时间、游戏模式和时长。
3. 调用 Turnstile Siteverify，传入 `secret`、`response`、客户端 IP 和新的 UUID `idempotency_key`。
4. 要求 Siteverify 成功且响应 `action` 为 `score`。
5. 执行现有封禁和 IP 频率限制。
6. 按服务端答案表重新计算接受答案和分数。
7. 用服务器接收时间减去签名的 `startedAt` 计算 `durationMs`，上限为游戏时长加宽限期。
8. 原子插入分数；唯一索引冲突映射为重复提交。

`game_scores` 新增可空 `session_id` 列和唯一索引。历史数据保持 `NULL`，新提交必须写入签名载荷中的 `sessionId`。SQLite 唯一索引允许多个历史 `NULL`，但保证每个新游戏局只能成功插入一次。现有 fingerprint 唯一索引继续保留，形成第二层重复提交保护。

## 留言提交

留言请求新增 `turnstileToken`，其他字段保持不变。Turnstile 响应 `action` 必须为 `comment`。验证成功后继续执行现有留言过滤、封禁检查和频率限制。

分数与留言使用各自的 Turnstile 控件和 token。Turnstile token 只有 5 分钟有效且只能验证一次，成功、失败或过期后客户端都重置对应控件，不能在分数与留言之间复用。

## 客户端集成

新增轻量 Turnstile React 组件，使用官方脚本的显式渲染 API：

- 页面只加载一次脚本，两个表单分别以 `score` 和 `comment` action 渲染。
- callback 保存 token；expired-callback 和 error-callback 清空 token。
- 提交按钮在控件尚未产生 token 时不可提交。
- API 返回后重置对应控件，取得新 token 才能再次提交。
- sitekey 缺失时隐藏控件并明确禁用社区写入，不影响游戏输入、计时、分享和排行榜读取。

不引入第三方 React Turnstile 依赖，避免增加包体和维护面。

## 错误响应

所有错误保持现有结构：

```json
{
  "ok": false,
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "This game session has expired. Start a new game."
  }
}
```

新增或明确使用以下错误码：

| HTTP | 错误码 | 场景 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | 非 JSON、缺字段、字段类型或长度错误、请求过大 |
| 400 | `INVALID_GAME` | 未知游戏模式或时长与定义不一致 |
| 400 | `SESSION_REQUIRED` | 分数提交未携带游戏局 token |
| 403 | `SESSION_INVALID` | 签名、版本、模式、时长或载荷非法 |
| 410 | `SESSION_EXPIRED` | 游戏局超过游戏时长与宽限期 |
| 400 | `TURNSTILE_REQUIRED` | 未携带 Turnstile token |
| 403 | `TURNSTILE_FAILED` | Siteverify 拒绝、action 不匹配、token 重复或过期 |
| 409 | `DUPLICATE_SUBMISSION` | session ID 或 fingerprint 唯一索引冲突 |
| 429 | `RATE_LIMITED` | 现有分数或留言频率限制触发 |
| 503 | `CONFIGURATION_ERROR` | 安全配置缺失或不合法 |
| 503 | `TURNSTILE_UNAVAILABLE` | Siteverify 网络错误、超时或响应不可解析 |
| 503 | `SERVER_ERROR` | D1 或其他未分类服务端错误 |

错误消息不返回密钥值、IP、签名载荷或 Cloudflare 原始响应。服务端日志可记录错误码和 Turnstile error-codes，但不得记录 token 或 secret。

## 测试

使用现有 Node test runner，按 TDD 增加：

- 游戏局签发后可以验证。
- 篡改 payload、签名、游戏模式或时长会失败。
- 未来开始时间、过旧开始时间、过期游戏局和 malformed token 会失败。
- Turnstile 成功、拒绝、action 不匹配、重复/过期以及上游不可用映射到正确结果。
- 分数 schema 要求 session/Turnstile token，留言 schema 要求 Turnstile token。
- 服务端仍会对重复答案、别名冲突和未知答案重新计分。
- game score migration 包含可空 `session_id` 和唯一索引。
- 客户端源码测试覆盖首次有效输入签发游戏局、提交携带两个 token、重置时清除 token。

完整验证包括全量测试、Biome、locale check、生产构建，以及本地 D1 上的接口 smoke test。手工验证游戏在缺少生产密钥时仍可玩，但榜单和留言写入返回配置错误。

## 部署顺序

1. 在 Cloudflare 创建 Turnstile widget，限制到正式域名。
2. 在 Worker 配置 `TURNSTILE_SECRET_KEY`、`GAME_SESSION_SECRET` 和 `GAME_IP_HASH_SALT`。
3. 在本地/CI 构建环境配置公开的 `VITE_TURNSTILE_SITE_KEY`。
4. 先执行远程 D1 migration，再部署使用 `session_id` 的 Worker。
5. 实测普通游戏、一次分数提交、重复提交、留言、Turnstile 失败和排行榜读取。

若步骤 2 或 3 未完成，部署后的降级行为必须是只读社区加正常本地游戏，不允许绕过验证写入。

## 参考

- Cloudflare Turnstile 服务端校验：<https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>
- Cloudflare Turnstile 测试密钥：<https://developers.cloudflare.com/turnstile/troubleshooting/testing/>
