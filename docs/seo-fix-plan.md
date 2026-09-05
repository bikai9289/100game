# name100challenge.com 修复文档

体检时间：2026-09-05
体检方式：线上 HTTP 实测（curl 抓 SSR HTML）+ 本地源码核对
线上版本：sitemap 19 条 URL，游戏页全部 200

---

## 0. 先纠正一个前提

外部 SEO 分析给出的 P0/P1 是「/men 还没上线、正文只有 488 词、/answers 还没做」。
**这三条都已经过时了。** 线上实测：

| URL | 线上状态 | 说明 |
| --- | --- | --- |
| `/` | 200 | Name 100 Women Challenge |
| `/men` | 200 | 已上线，独立答案库 533 条 |
| `/answers` | 200 | 已上线，SSR 输出约 5950 词 |
| `/categories` + 9 个子页 | 200 | 已上线 |
| `/challenge` | 200 | Daily Challenge |
| `/timer` | 200 | 计时器工具 |

而且 `MoreChallenges` 组件已经在每个游戏页做了子页互链——这正是竞品 `name100challenge.me`
缺失的架构优势，**已经领先了，不要动它**。

所以真正的问题不在「页面没做」，而在下面这些线上实测出来的缺口。

---

## P0 — 必须本周修

### P0-1｜`/blog` 正在对外输出 TanStarter 模板文章（软 404，HTTP 200 可索引）

**实测证据**

```
GET https://name100challenge.com/blog  ->  200
<title>Blog | Name100Challenge</title>
<meta name="description" content="Insights, updates and stories from our team" />
<link rel="canonical" href="https://name100challenge.com/blog" />
<script type="application/ld+json">{"@type":"Blog",...}</script>
```

SSR payload 里完整序列化了三篇模板文：
`Deploy to Production` / `Getting Started`（讲 pnpm、Cloudflare Workers、content-collections）/ `Hello World`。

**根因**

`websiteConfig.blog.enable = false`，但 `notFound()` 是在**组件里**抛的，而 `loader` 和 `head`
已经先跑完了：

```82:86:src/routes/blog/index.tsx
function BlogListPage() {
  const { posts, totalPages, currentPage } = Route.useLoaderData();
  if (!websiteConfig.blog?.enable) {
    throw notFound();
  }
```

结果是：状态码 200 + 正常 title/canonical/Blog schema + 模板内容进 HTML。这是标准软 404。
对一个刚上线、正在被谷歌评估内容质量的新站，「站上有一篇教你部署 Cloudflare Workers 的文章」
是很脏的质量信号，且和项目规则 1（移除所有 TanStarter/SaaS 痕迹）直接冲突。

**修复（三选一，推荐 A）**

- **A. 直接删掉 blog 路由**：删除 `src/routes/blog/`、`content/blog/`、`src/components/blog/`，
  一起清掉 `src/lib/blog.ts`。一期不做博客就别留半个。
- B. 保留路由但把开关判断上提到 `beforeLoad`，让服务端真的返回 404：

  ```ts
  export const Route = createFileRoute('/blog/')({
    beforeLoad: () => {
      if (!websiteConfig.blog?.enable) throw notFound();
    },
    // loader / head 不变
  ```

- C. 最低限度：`head` 里加 `{ name: 'robots', content: 'noindex, nofollow' }`。

**顺带**：`/pricing` 目前 307 跳 `/`（行为正确），但路由文件还在，建议和 blog 一起清。

**验收**：`curl -o /dev/null -w "%{http_code}" https://name100challenge.com/blog` 返回 404，
且 HTML 里搜不到 `TanStarter`。

---

### P0-2｜robots.txt 里有 Cloudflare 托管规则，正在屏蔽全部 AI 抓取

**实测证据**（线上 robots.txt 前半段，不是你 `robots[.]txt.ts` 生成的）

```
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference

User-agent: GPTBot          Disallow: /
User-agent: ClaudeBot       Disallow: /
User-agent: Google-Extended Disallow: /
User-agent: CCBot           Disallow: /
User-agent: Bytespider      Disallow: /
User-agent: Amazonbot       Disallow: /
User-agent: Applebot-Extended Disallow: /
User-agent: meta-externalagent Disallow: /
```

这是 Cloudflare 的「AI Crawl Control / Managed robots.txt」默认注入的，**不是你写的**。
你自己的规则被拼在它后面，导致文件里出现了两段 `User-agent: *`。

**为什么必须改**：这个站是娱乐游戏站，靠曝光和分享吃饭，没有需要保护的专有内容。
屏蔽 GPTBot / ClaudeBot / Google-Extended 等于主动放弃 ChatGPT、Claude、Gemini、
Google AI Overviews 里被引用的机会——而「name 100 women 该说哪些人」恰恰是
AI 问答里高频出现的问题类型。这是纯亏。

**修复**

1. Cloudflare Dashboard → 域名 → **AI Crawl Control**（旧名 Bot Management → AI Scrapers &
   Crawlers）→ 关闭 "Managed robots.txt" / 允许 AI 爬虫。
2. 顺手把 `robots[.]txt.ts` 加上明确 allow，避免以后又被托管规则盖掉语义：

   ```ts
   const robots = `User-agent: *
   Allow: /
   ${getDisallowRules()}

   User-agent: GPTBot
   Allow: /

   User-agent: ClaudeBot
   Allow: /

   User-agent: PerplexityBot
   Allow: /

   User-agent: Google-Extended
   Allow: /

   Sitemap: ${base}/sitemap.xml`;
   ```

**验收**：`curl https://name100challenge.com/robots.txt` 里不再有 `Disallow: /` 的 AI bot 段，
且只剩一段 `User-agent: *`。

---

### P0-3｜线上零分析统计，等于在黑盒里做 SEO

**实测证据**：首页 HTML 里搜不到 `gtag` / `googletagmanager` / `clarity` /
`cloudflareinsights` 任何一个。

代码层面 `src/components/analytics/analytics.tsx` 已经写好了 GA4 / Clarity / Plausible /
Umami / Cloudflare 五个 provider，只在 production 渲染，且**没有 env 就返回 null**。
说明是环境变量没配。

**修复**：至少配两个（都免费）

- `VITE_GOOGLE_ANALYTICS_ID` → GA4，看流量来源、着陆页、会话时长
- `VITE_CLARITY_ID` → Microsoft Clarity，看热图和录屏，直接验证「12 分钟游戏玩家在哪一步走掉」

配好后 `pnpm deploy`，再确认 HTML 里出现 `gtag`。

**另外**：GSC 那边显示「用户还没有上传任何 GSC 数据」。请确认
Google Search Console **本身**已经验证了 `name100challenge.com`（不只是没导出数据）。
没接 GSC = 收录、出词、CTR 全靠猜。这是所有 SEO 动作的前提，优先级等同 P0。

---

## P1 — 两周内

### P1-1｜四个游戏页 JSON-LD 完全为空

**实测**（`"@type"` 出现的类型）

| 页面 | 现有 schema |
| --- | --- |
| `/` | WebSite, FAQPage |
| `/challenge` | FAQPage |
| `/men` | **无** |
| `/answers` | **无** |
| `/categories` | **无** |
| `/timer` | **无** |

竞品 `.me` 每个游戏页挂 4 块（WebApplication + Game + FAQPage + BreadcrumbList）。
你在这一项上是净落后。

**修复思路**：不要每个页面手写，抽一个共用 helper。新建 `src/lib/game-schema.ts`：

```ts
import { getCanonicalUrl } from '@/lib/urls';

type GameSchemaInput = {
  path: string;
  name: string;
  description: string;
  breadcrumb: string;
  faqs?: { question: string; answer: string }[];
};

export function gameJsonLd({
  path,
  name,
  description,
  breadcrumb,
  faqs,
}: GameSchemaInput) {
  const url = getCanonicalUrl(path);
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebApplication',
      name,
      url,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      inLanguage: 'en',
    },
    {
      '@type': 'Game',
      name,
      url,
      description,
      playMode: 'SinglePlayer',
      gamePlatform: 'Web',
      audience: { '@type': 'PeopleAudience', suggestedMinAge: 10 },
      inLanguage: 'en',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: getCanonicalUrl('/'),
        },
        { '@type': 'ListItem', position: 2, name: breadcrumb, item: url },
      ],
    },
  ];

  if (faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }

  return {
    type: 'application/ld+json',
    children: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
  };
}
```

然后每个游戏页 `head` 里两行接上（以 `/men` 为例，改 `src/routes/(pages)/men.tsx`）：

```ts
head: () => ({
  ...seo('/men', { title, description }),
  scripts: [
    gameJsonLd({
      path: '/men',
      name: 'Name 100 Men Challenge',
      description,
      breadcrumb: 'Name 100 Men Challenge',
      faqs: menFaqs,
    }),
  ],
}),
```

同样接到 `/challenge`（补 Game + Breadcrumb，FAQ 已有）、`/categories`、
`/categories/$slug`、`/timer`。首页也补上 WebApplication + Game。

**注意**：FAQ 的 schema 必须和页面**可见正文**里的问答一一对应，否则算作弊。
`/men` 现在页面上根本没有 FAQ 区块，得先加正文（见 P1-3）再挂 schema。

---

### P1-2｜`/answers` 全站最强资产被折叠隐藏了

`/answers` 是全站唯一一个 SSR 输出约 5950 词的页面，目标词
`100 famous women list`（KD 22.6）是整个词群矩阵里最好打的。但现在 563 条答案
**全部塞在一个 `<details>` 里**：

```65:68:src/routes/(pages)/answers.tsx
          <details className="mx-auto max-w-5xl rounded-xl border bg-background p-4 sm:p-6">
            <summary className="cursor-pointer text-lg font-bold">
              Click to show the full answer list
            </summary>
```

内容确实在 HTML 里（谷歌能抓到），但默认折叠的大段内容谷歌会降权处理。
你为了「防剧透」牺牲了这个页面最大的排名价值。

**修复（两全其美）**

- 顶部保留 Spoiler warning 徽章即可，**默认展开**：`<details open>` 或干脆去掉 `<details>`。
- 剧透保护改成软性做法：页面顶部一句「Play first, then come back」+ 一个「Play now」按钮，
  而不是靠折叠。
- 每个分类段落加一段 60–100 词导语（为什么这些人常被忘、怎么记），把纯列表页变成有内容的清单页。
- 补 `ItemList` schema：

  ```ts
  {
    '@type': 'ItemList',
    name: 'Full list of accepted answers for Name 100 Women',
    numberOfItems: answers.length,
    itemListElement: answers.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: a.name,
    })),
  }
  ```

- 建一个对位页 `/men/answers`（或 `/answers/men`），用 533 条男性库打
  `100 famous men list`。数据已经有了，成本极低。

---

### P1-3｜正文字量：去掉游戏 UI 后其实只有 350–400 词

线上 868 词是**含游戏界面文本**的数字。真正的 SEO 正文：

| 页面 | 正文区块 | 实际正文词数 |
| --- | --- | --- |
| `/` | How to Play(3步) + Tips(6条) + FAQ(5问) | ~350–400 |
| `/men` | How it Works(2段) + Tips(6条) | ~250，**且完全没有 FAQ** |
| `/categories` | 3 段 | ~230 |

对标：冠军 `name100men.com` 游戏下方约 1500 词，竞品 `.me` 约 800–1000 词。

**修复：首页和 `/men` 各补到 1200–1500 词**，区块顺序照冠军站骨架：

1. **About**（3 段）— 这个挑战是什么、为什么在 TikTok/Reddit 上火、12 分钟规则的由来
2. **How to Play**（6 步，现在只有 3 步）— 补：什么算有效答案、别名怎么算、
   重复名怎么处理、计时从第一个被接受的答案开始、进度存在本地、达成 100 会提前结束
3. **Tips & Strategies**（按 9 个分类各给一段策略）— 现在只有 6 条单句。
   每个分类段落天然是 `famous female scientists` 这类长尾词的素材，
   而且能自然内链到 `/categories/{slug}`
4. **FAQ**（`/men` 从 0 补到 5 问，和 schema 对齐）

`/men` 的 FAQ 建议 5 问：什么算有效答案 / 分数怎么算 / 手机能玩吗 / 免费吗 /
和女版有什么区别（这一问顺便内链回 `/`）。

**写文案时注意**：你的判定逻辑是**本地 curated 答案库**（`src/data/answers-*.json`，
女 563 条 / 男 533 条）+ `gameEngine.ts` 的模糊匹配（Levenshtein ≤ 1），
**不是** Wikidata 实时校验。别照抄竞品的 Wikidata 说法，会写错。
反过来说，「精选答案库 + 容错拼写」是你可以拿来讲的差异化卖点。

---

### P1-4｜`/men` 的 OG 图 404

`https://name100challenge.com/og-image-men.png` → **404**。
`/men` 现在复用首页的 `og-image.png`，分享出去时男版女版是同一张图。

**修复**：生成 1200×630 的 `og-image-men.png`（和首页同族视觉，配色区分：
女版粉 / 男版蓝），放 `public/`，然后 `/men` 的 seo 调用加 image 参数：

```ts
head: () => seo('/men', { title, description, image: getImageUrl('/og-image-men.png') }),
```

`/answers`、`/categories`、`/challenge` 同理，长期都该有各自的图。
`public/og.png`（424 KB，config 未引用）是遗留文件，一并删掉。

---

## P2 — 有余力再做

### P2-1｜清理残留的 SaaS 模板组件

以下文件仍含 `TanStarter` / `SaaS` / `Ship Faster` 字样，虽然首页没引用，但还在仓库里
（部分可能进了 bundle）：

```
src/components/blocks/hero.tsx
src/components/blocks/features.tsx
src/components/blocks/features2.tsx
src/components/blocks/logo-cloud.tsx
src/components/shared/built-with-button.tsx
src/mail/components/email-layout.tsx
```

跑 `pnpm knip` 找出未引用的，直接删。另外 `src/lib/routes.ts` 里
`Routes.Features = '/#features'` 指向一个首页并未渲染的锚点，属于死链，一并清掉。

### P2-2｜补 rules 承接页

竞品每个游戏配了 `/challenges/name-100-xxx/rules` 长文页。你现在 `/men/rules` 是 404。
建议 `/rules` 和 `/men/rules` 各做一个 800 词规则详解页，承接
「name 100 women rules」「how does the name 100 challenge work」这类长尾。
新增后**记得更新 `src/routes/sitemap[.]xml.ts`**（项目规则 7）。

### P2-3｜结算页的传播闭环

结算卡片现在有 Play again + Share score。可以再加：
分数达标时展示「你打败了 X% 的玩家」（数据已经有排行榜 API）、
以及「试试 Name 100 Men」的直接入口。12 分钟的会话时长是你天然的行为优势，
别让玩家玩完即走。

### P2-4｜AdSense

线上无广告代码。等 GSC 有稳定日流量（建议日均 200+ UV）后再申请，
过早挂低流量站容易被拒。位置参考冠军站：游戏下方 1 个 + 正文中 2 个 + 结算弹窗内 1 个。

### P2-5｜首页 FAQ 第 5 问口吻已过时

```75:78:src/components/blocks/homepage.tsx
    question: 'Will there be new categories?',
    answer:
      "Yes. Category pages, daily challenge mode, a timer tool, and a men's version are separate pages so each mode can have focused rules and useful practice content.",
```

这些页面**都已经上线了**，措辞还是「将会有」。改成已上线口吻，
并在答案里放真实内链（`/categories`、`/challenge`、`/timer`、`/men`），
给子页一个来自首页的锚文本入口。注意 `src/routes/index.tsx` 里的 `faqItems`
是同一份文案的副本，两处要一起改（建议抽成共用常量避免以后漂移）。

---

## 执行清单

| # | 事项 | 优先级 | 预估 | 验收 |
| --- | --- | --- | --- | --- |
| 1 | 删除 blog/pricing 路由与模板内容 | P0 | 30min | `/blog` 返回 404 |
| 2 | Cloudflare 关闭 AI 爬虫屏蔽 + 改写 robots | P0 | 20min | robots 无 AI bot Disallow |
| 3 | 配 GA4 + Clarity env 并部署 | P0 | 20min | HTML 出现 gtag |
| 4 | 确认 GSC 已验证域名并提交 sitemap | P0 | 10min | GSC 显示已收录页数 |
| 5 | `game-schema.ts` + 六个页面接 JSON-LD | P1 | 2h | Rich Results 测试通过 |
| 6 | `/answers` 展开 + ItemList + 分类导语 | P1 | 2h | 列表默认可见 |
| 7 | 首页 & `/men` 正文补到 1200–1500 词 | P1 | 4h | 正文词数达标 |
| 8 | `/men` 加 FAQ 区块（与 schema 对齐） | P1 | 1h | 页面可见 5 问 |
| 9 | 生成 `og-image-men.png` 等分页 OG 图 | P1 | 1h | 分享预览正确 |
| 10 | `/men/answers` 男版答案清单页 | P1 | 1.5h | 进 sitemap |
| 11 | knip 清理残留 SaaS 组件 | P2 | 1h | 全库无 TanStarter |
| 12 | `/rules`、`/men/rules` 规则长文页 | P2 | 3h | 进 sitemap |
| 13 | 首页 FAQ 第 5 问改写 + 内链 | P2 | 20min | 两处文案同步 |

---

## 每次 UI 改动后的固定检查（项目规则 4 & 6）

- 375px 宽度下首屏可玩，输入框不被遮挡
- 输入框获得焦点、软键盘弹出时，计时器和分数仍在可视区
- 改动页面 SSR HTML 里能搜到新增正文（不是只在客户端渲染）
- 新增路由后更新 `src/routes/sitemap[.]xml.ts`
