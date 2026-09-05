# 新增一个游戏主题（Theme）开发文档

本文档描述如何在 Name 100 Challenge 站点上新增一个游戏主题，例如从现有的
`women`（`/`）和 `men`（`/men`）扩展出 `countries`（`/countries`）。

产出是三个可索引的落地页：

| 页面 | 路径 | 作用 |
| --- | --- | --- |
| 挑战页 | `/<theme>` | 可玩游戏 + 正文 + FAQ |
| 规则页 | `/<theme>/rules` | 规则长文，承载 "how to play" 类查询 |
| 答案清单页 | `/<theme>/answers` | 全量答案 SSR 输出，承载 "list of ..." 类查询 |

> 关于工作量的实话：单个主题需要**新建 6 个文件、修改 14 处注册点**。
> "加一份数据加三个路由" 是低估了——路由是 4 个文件（多一个 layout），
> 而且答案数据的清洗规则和 category 分类体系往往是真正的时间开销所在。

全文以 `countries` 作为示例主题名，实际替换为你的主题 slug（小写、kebab-case，
需匹配 `gameIdPattern` 里你新增的分支）。

---

## 第 0 步：先做两个设计决策

这两个决策会决定后面 80% 的工作量，务必在动手前定下来。

### 决策一：category 分类体系能否复用

现有 9 个 category slug 定义在 `src/lib/name100-data.ts` 的 `categoryOrder`：

```4:14:src/lib/name100-data.ts
export const categoryOrder = [
  'actresses',
  'musicians',
  'athletes',
  'scientists',
  'politicians',
  'historical',
  'business',
  'activists',
  'other',
] as const;
```

这是一套**名人分类**。`men` 主题能完全复用它，所以只需要在
`answers-list-page.tsx` 里做词汇替换（`women`→`men`、`actresses`→`actors`）。

如果新主题是非人物类（国家按大洲分、宝可梦按世代分），你**不能**复用。
此时需要新建一个平行的 data 模块（例如 `src/lib/countries-data.ts`），
导出自己的 `categoryOrder` / `categoryMeta` / `CategorySlug`，
并且必须同步扩展游戏组件里的配色表：

```39:49:src/components/game/name100-game.tsx
const categoryStyles: Record<string, string> = {
  actresses: 'border-transparent bg-[#e11d78] text-white',
  musicians: 'border-transparent bg-[#7c3aed] text-white',
  // ...
  other: 'border-transparent bg-[#64748b] text-white',
};
```

用法是 `categoryStyles[answer.category] ?? categoryStyles.other`，
所以未登记的 category 不会报错，但会**全部渲染成灰色**，答案标签失去视觉区分。

### 决策二：单词别名是否必需

这是非人物主题最容易踩的坑。别名安全检查要求归一化后**必须含空格**：

```187:189:scripts/answer-data-policy.mjs
export function isSafeAnswerAlias(value) {
  return normalizeAnswerText(value).includes(' ');
}
```

对人名这条规则是对的——它防止 "Taylor" 这种单姓氏造成跨条目歧义。
但对 `countries` 主题，`USA`、`UK`、`UAE`、`DRC` 这类单词缩写恰恰是**最常见的用户输入**。
`repair-answer-data.mjs` 会把它们静默删掉，`check-answer-data.mjs` 会报错。

如果你需要单词别名，必须把该规则改成 per-theme 的，例如：

```js
export function isSafeAnswerAlias(value, { allowSingleWord = false } = {}) {
  const normalized = normalizeAnswerText(value);
  return allowSingleWord ? normalized.length > 0 : normalized.includes(' ');
}
```

同时注意模糊匹配对短名称不生效——`fuzzyMatch` 要求两侧长度都 ≥ 5：

```39:44:src/lib/gameEngine.ts
  if (
    Math.min(normalizedInput.length, normalizedTarget.length) < 5 ||
    Math.abs(normalizedInput.length - normalizedTarget.length) > 1
  ) {
    return false;
  }
```

所以 `Chad`、`Cuba`、`Iran`（4 字符）只能精确匹配，拼错一个字母就不算。
这不是 bug（对短词放开容错会造成大量误判），但要在规则页里跟用户讲清楚。

---

## 第 1 步：答案数据

新建 `src/data/answers-countries.json`。每条记录 5 个字段：

```json
[
  {
    "id": "united-states",
    "name": "United States",
    "aliases": ["united states of america"],
    "category": "other",
    "hint": "North American country"
  }
]
```

| 字段 | 必填 | 约束 |
| --- | --- | --- |
| `id` | 是 | kebab-case，文件内唯一 |
| `name` | 是 | 规范显示名，也是主匹配键 |
| `aliases` | 是 | 数组，可为 `[]`；受上述单词规则约束 |
| `category` | 是 | 必须在 `check-answer-data.mjs` 的 `allowedCategories` 内 |
| `hint` | 否 | 游戏内提示文案 |

数量参考：`answers-women.json` 563 条，`answers-men.json` 533 条。
目标分数默认 100，答案库应显著大于 100 才有重玩价值。

### 接入两个数据脚本

`scripts/check-answer-data.mjs` 第 20 行，加入新文件：

```js
const files = ['answers-women.json', 'answers-men.json', 'answers-countries.json'];
```

`scripts/repair-answer-data.mjs` 第 10 行同理。**注意必须追加到数组末尾**，
因为脚本用位置索引判断是否套用 women 专属修正：

```121:123:scripts/repair-answer-data.mjs
for (const [index, file] of dataFiles.entries()) {
  const input = JSON.parse(await readFile(file, 'utf8'));
  const corrected = index === 0 ? applyWomenCorrections(input) : input;
```

如果新主题引入了新 category，还要扩展该文件顶部的 `allowedCategories`。

最后把新 JSON 加入 `package.json` 的 `data:repair` 脚本的 biome format 路径。

校验通过后再往下走：

```bash
pnpm data:repair   # 去重、清洗别名、格式化
pnpm data:check    # 断言唯一性与无跨条目冲突
```

`check` 强制的规则：`id` 唯一、`category` 合法、同条目内归一化后无重复、
一个归一化输入只能归属一个条目（跨条目冲突会报错）。

---

## 第 2 步：服务端注册 gameId

主题在服务端由一个字符串 `gameId` 标识，用于排行榜分区和分数校验。
**漏掉这一步的表现是：游戏能玩，但提交分数和评论返回 400。**

### 2.1 `src/lib/game-definition.ts`

加一个分支，并在顶部 import 新数据：

```ts
if (gameId === 'countries') {
  return { answers: countriesAnswers, durationSeconds: 720, targetScore: 100 };
}
```

这里的 `durationSeconds` / `targetScore` 必须与前端传给 `Name100Game` 的一致，
否则服务端会认为分数不合法。

### 2.2 `src/lib/game-community.ts`

正则白名单，不改则所有写入被 Zod 拒绝：

```4:4:src/lib/game-community.ts
const gameIdPattern = /^(women|men|daily:\d{4}-\d{2}-\d{2}|category:[a-z-]+)$/;
```

改为 `/^(women|men|countries|daily:...|category:...)$/`。

### 2.3 数据库

**不需要 migration。** `game_scores.gameId` 和 `game_comments.gameId`
都是自由文本列（见 `src/db/app.schema.ts`），写入新字符串即可自动分区。
`game_blocks` 是全局封禁表，与主题无关。

---

## 第 3 步：路由（4 个文件）

### 3.1 `src/routes/(pages)/countries/route.tsx` — layout

这个文件是必需的，而且**绝对不能调用 `seo()`**。

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/countries')({
  component: CountriesLayout,
});

function CountriesLayout() {
  return <Outlet />;
}
```

背景：早期 `/men` 写成 `men.tsx` 与 `men/` 目录并存，TanStack 会把它当成子路由的
layout，而它没有 `<Outlet />`，导致 `/men/answers` 和 `/men/rules` 渲染的是
`/men` 的页面主体，canonical 也全部指向 `/men`——两个新页面等于主动交给 Google 去重删除。
`src/tests/route-layout-conflict.test.ts` 现在会拦住这个模式。

正确结构是 layout（无 `seo()`）+ `index.tsx`（有 `seo()`）分离。

### 3.2 `src/routes/(pages)/countries/index.tsx` — 挑战页

以 `src/routes/(pages)/men/index.tsx` 为模板。骨架：

```tsx
export const Route = createFileRoute('/(pages)/countries/')({
  head: () => ({
    ...seo('/countries', {
      title,
      description,
      image: getImageUrl('/og-image-countries.png'),
    }),
    scripts: [
      gameJsonLd({
        path: '/countries',
        name: 'Name 100 Countries Challenge',
        description,
        breadcrumb: 'Name 100 Countries Challenge',
        faqs: countriesFaqs,
      }),
    ],
  }),
  component: CountriesPage,
});
```

游戏组件必须传全隔离三元组（`gameId` / `storageKey` / `storageCookie`），
否则会和其它主题共用本地进度：

```tsx
<Name100Game
  answers={countriesAnswers}
  gameId="countries"
  storageKey="name100:countries:v1"
  storageCookie="name100_countries_v1"
  ariaLabel="Name 100 Countries game"
  placeholder="Type a country name..."
  missText="Not in the countries answer list yet. Try another country."
/>
```

`Name100Game` 的完整 props 见 `src/components/game/name100-game.tsx:96-109`。
其中 `emptyTagsText` 目前**声明了但组件内未使用**，传了不起作用，别依赖它。

页面正文按 `men/index.tsx` 的分区组织：`<h1>` + 游戏（首屏）、About、How to Play、
Tips and Strategies、FAQ、`<MoreChallenges />`。参照现状字数，挑战页正文应在 1300 词以上。

### 3.3 `src/routes/(pages)/countries/rules.tsx`

模板 `men/rules.tsx`。用 `seo('/countries/rules', ...)` + `gameJsonLd`（不带 `faqs`，
避免和挑战页的 FAQPage 重复）。

### 3.4 `src/routes/(pages)/countries/answers.tsx`

模板 `men/answers.tsx`。除 `seo` 和 `gameJsonLd` 外，必须加 `itemListJsonLd`：

```tsx
itemListJsonLd({
  name: 'Full list of accepted answers for Name 100 Countries',
  items: answers.map((answer) => answer.name),
}),
```

页面体是共享组件 `<AnswersListPage answers={answers} variant="countries" />`。

> `src/routeTree.gen.ts` 由 TanStack 自动生成，**不要手改**。
> 如果它出现引用了未定义变量（例如 `pagesCountriesRoute`）的情况，
> 说明缺了 `route.tsx`，补上后删掉该文件重新 `pnpm build` 即可。

---

## 第 4 步：扩展共享组件

### `src/components/blocks/answers-list-page.tsx`

`variant` 目前是 `'women' | 'men'` 联合类型。需要：

1. 加入 `'countries'`；
2. 补 `playTo` / `playLabel` 分支（现在是 `isWomen` 二元判断，要改成 switch 或映射表）；
3. 提供 category 导语。`men` 复用了 women 的 `listIntro` 做词汇替换：

```185:193:src/components/blocks/answers-list-page.tsx
function menListIntro(slug: CategorySlug, womenIntro: string) {
  if (slug === 'actresses') {
    return 'Actors are the first burst for most players and still hide names you already know. ...';
  }
  return womenIntro
    .replaceAll('women', 'men')
    .replaceAll('female', 'male')
    .replaceAll('actresses', 'actors');
}
```

非人物主题不能这样替换，需要写独立的 `listIntro` 文案。

### `src/components/blocks/more-challenges.tsx`

`ChallengePage` 联合类型加 `'countries'` 和 `'countries-answers'`，
并在 `challengeLinks` 数组补两条卡片（挑战页 + 答案清单页）。

注意一个现存问题：`'rules'` 在联合类型里但 `challengeLinks` 中**没有对应条目**，
所以 `/rules` 和 `/men/rules` 都不出现在 More Challenges 网格中，
只有页脚链接它们。新主题的规则页如果也用 `currentPage="rules"`，会继承同样的缺失。
建议顺手补上 rules 卡片。

### `src/components/blocks/game-faq.tsx`

**无需修改。** 直接传新主题的 `FaqItem[]` 即可。

### `src/lib/name100-copy.ts`

新增 `countriesFaqs: FaqItem[]`（参照 `menFaqs`，5 条起）。
How-To 步骤：`men` 复用 `homeHowToSteps` 并在渲染时 `.replace("woman's", "man's")`；
非人物主题应新建 `countriesHowToSteps`，不要靠字符串替换。

---

## 第 5 步：站点注册点

| 文件 | 改动 |
| --- | --- |
| `src/lib/routes.ts` | 加 `Countries: '/countries'`、`CountriesAnswers`、`CountriesRules` |
| `src/config/navbar-config.ts` | 加导航项（当前 6 项，注意移动端宽度） |
| `src/config/footer-config.ts` | 在 Practice 分组加答案页与规则页链接 |
| `src/routes/sitemap[.]xml.ts` | 在 `staticUrls` 加 3 条 |

sitemap 三条按现有优先级惯例：

```ts
{ path: '/countries', changefreq: 'weekly', priority: '0.8' },
{ path: '/countries/answers', changefreq: 'weekly', priority: '0.7' },
{ path: '/countries/rules', changefreq: 'monthly', priority: '0.7' },
```

这一步是项目硬规则（`CLAUDE.md` 第 7 条：新增路由后必须更新 sitemap）。

### 不需要改的

- `src/lib/seo.ts` — `seo(path, opts)` 接受任意 path，canonical 由 `getCanonicalUrl` 推导。
- `src/lib/urls.ts` — 直接 `getImageUrl('/og-image-countries.png')`。
- `src/routes/robots[.]txt.ts` — 全站 `Allow: /`。
- `src/lib/locale.ts` — `LOCALIZED_PATHS` 只含 `/` 和法务页；游戏路由本来就不出 hreflang，
  与 `men` 保持一致即可。
- `src/config/website.ts` — 全局默认 OG 仍是 women，各路由自行 override。

---

## 第 6 步：OG 图

在 `scripts/generate-launch-assets.py` 末尾追加一次 `make_og` 调用，
参数签名见该文件第 59-64 行：

```python
make_og(
    title_line="Name 100 Countries",
    subtitle="Can you name 100 countries in 12 minutes?",
    accent="#34d399",
    warm="#a3e635",
).save(PUBLIC / "og-image-countries.png", optimize=True)
```

产出尺寸固定 1200×630，落在 `public/`。

---

## 第 7 步：测试

### 需要扩展的

- `src/tests/step5-pages.test.ts` — 把新路由加入 `mainRoutes` 数组，
  并在 sitemap 断言的 path 列表里加上 `/countries`。
- `src/tests/answer-data-integrity.test.ts` — 当前只覆盖 women。
  新建一份针对新数据集的完整性测试，或把断言参数化到所有数据文件。
- `src/lib/game-community.test.ts` — 补一条 `gameId: 'countries'` 通过校验的用例，
  以及一条非法 gameId 被拒的用例。
- `src/routes/api/game/-session.test.ts` / `-community.test.ts` —
  `getGameDefinition` 的 mock 目前只返回 women，需要覆盖新主题。

### 不需要改的

`seo-keyword-map.test.ts`、`homepage-game.test.ts`、`analytics.test.ts`
都只断言 women 首页与全局接线。

### `route-layout-conflict.test.ts`

不用改，但它是你的安全网——只要你按第 3.1 步用 `route.tsx` + `index.tsx`，
它会自动通过；如果偷懒写成 `countries.tsx` 加目录，它会失败并提示改名。

---

## 第 8 步：本地验收

```bash
pnpm data:check                                  # 数据合法
pnpm check                                       # biome lint + format
pnpm build                                       # 同时重新生成 routeTree.gen.ts
pnpm exec wrangler dev --port 8788               # 起本地 worker
```

对三个新页面逐项确认（这些正是 `/men/answers` 出过问题的项）：

| 检查项 | 期望 |
| --- | --- |
| HTTP 状态 | 200 |
| `<title>` | 各页不同，含主关键词 |
| `rel="canonical"` | **指向自身路径**，不是 `/countries` |
| `<h1>` | 各页不同，答案页应是 "100 ... List" 而非挑战页标题 |
| 答案页条目数 | 等于 JSON 条数（SSR 输出，不能靠客户端渲染） |
| `numberOfItems` | 与上一行一致 |
| JSON-LD | 挑战页含 WebApplication / Game / BreadcrumbList / FAQPage；答案页含 ItemList |
| sitemap.xml | 新增 3 条 `<loc>` |
| 375px 视口 | 首屏可直接输入，键盘不遮挡（`CLAUDE.md` 第 4、6 条）|

canonical 和 h1 可以这样批量核对：

```powershell
foreach ($p in @('/countries','/countries/answers','/countries/rules')) {
  $h = curl.exe -s "http://127.0.0.1:8788$p"
  Write-Host $p
  Write-Host ("  canonical=" + [regex]::Match($h,'rel="canonical" href="([^"]*)"').Groups[1].Value)
  Write-Host ("  h1=" + ([regex]::Match($h,'<h1[^>]*>(.*?)</h1>').Groups[1].Value -replace '<[^>]+>',''))
  Write-Host ("  items=" + [regex]::Matches($h,'<h3').Count)
}
```

上线后把三个新 URL 提交到 Google Search Console。

---

## 附：完整文件清单

### 新建（6）

```
src/data/answers-countries.json
src/routes/(pages)/countries/route.tsx
src/routes/(pages)/countries/index.tsx
src/routes/(pages)/countries/rules.tsx
src/routes/(pages)/countries/answers.tsx
public/og-image-countries.png
```

若 category 体系不同，再加 `src/lib/countries-data.ts`。

### 修改（14）

```
scripts/check-answer-data.mjs             files 数组（+ allowedCategories）
scripts/repair-answer-data.mjs            dataFiles 数组（追加到末尾）
scripts/generate-launch-assets.py         make_og 调用
package.json                              data:repair 的 format 路径
src/lib/game-definition.ts                gameId 分支
src/lib/game-community.ts                 gameIdPattern
src/lib/name100-copy.ts                   countriesFaqs（+ HowToSteps）
src/lib/routes.ts                         Routes 常量
src/config/navbar-config.ts               导航
src/config/footer-config.ts               页脚
src/routes/sitemap[.]xml.ts               staticUrls 3 条
src/components/blocks/more-challenges.tsx ChallengePage + challengeLinks
src/components/blocks/answers-list-page.tsx  variant 联合 + 导语
src/components/game/name100-game.tsx      categoryStyles（仅新 category 体系时）
```

### 测试（4）

```
src/tests/step5-pages.test.ts
src/tests/answer-data-integrity.test.ts
src/lib/game-community.test.ts
src/routes/api/game/-session.test.ts / -community.test.ts
```

---

## 附：不可复用的部分

`/challenge`（每日挑战）和 `/categories/*`（按分类练习）这两个模式
**只服务 women**，它们直接绑定 `answers-women.json`：

```120:162:src/lib/name100-data.ts
export const womenAnswerList = womenAnswersData as Answer[];

export function getAnswersByCategory(slug: CategorySlug) { ... }
export function getDailyCategories(date: string) { ... }
export function getDailyAnswers(date: string) { ... }
```

对应的 `gameId` 形式是 `daily:YYYY-MM-DD` 和 `category:<slug>`，
时长 300 秒、目标 30 分（见 `game-definition.ts:29-48`）。

新主题如果也要每日模式或分类练习，必须新写一套等价函数并扩展 `gameIdPattern`，
不能复用上面这些 women 专属函数。**建议第一个新主题先不做这两个模式**，
先把挑战页 / 规则页 / 答案清单页三个落地页跑通再说。
