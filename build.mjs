/**
 * 博客构建脚本（零外部依赖）
 *
 * 用法：在项目根目录运行  node build.mjs
 * 或者直接双击「构建博客.bat」。
 * 想实时预览：运行  node build.mjs --watch（或双击「监听构建.bat」），
 * 修改 md / css / js / 模板后会自动重新构建。
 *
 * 它会把 content/posts/ 里的 Markdown 文章、
 * content/about.md 个人简介、assets/ 样式资源，
 * 一起生成到一个静态网站，输出到 docs/ 文件夹。
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { marked } from './vendor/marked/lib/marked.esm.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
let CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const CONTENT_DIR = path.join(ROOT, 'content');
const POSTS_DIR = path.join(CONTENT_DIR, 'posts');
const ASSETS_DIR = path.join(ROOT, 'assets');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const OUT_DIR = path.join(ROOT, 'docs');

/* 样式和脚本的版本号：内容一变，网址就变，浏览器就不会再用旧缓存。
   自动扫描 assets/css 和 assets/js 里所有文件，新增文件也会被算进去。 */
function assetVersion() {
  const hash = crypto.createHash('sha1');
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(file);
      } else if (/\.(css|js)$/i.test(entry.name)) {
        hash.update(entry.name);
        hash.update(fs.readFileSync(file, 'utf8'));
      }
    }
  };
  walk(path.join(ASSETS_DIR, 'css'));
  walk(path.join(ASSETS_DIR, 'js'));
  return `?v=${hash.digest('hex').slice(0, 8)}`;
}
let ASSET_VERSION = assetVersion();

/* 页面版本号：配置、模板或文章一改动，内部链接就变，
   点任何链接都会拿到最新页面，不会被浏览器缓存骗到。 */
function siteVersion() {
  const hash = crypto.createHash('sha1');
  const addFile = (file) => {
    hash.update(path.relative(ROOT, file));
    hash.update(fs.readFileSync(file, 'utf8'));
  };
  addFile(path.join(ROOT, 'site.config.json'));
  for (const file of fs.readdirSync(TEMPLATES_DIR)) {
    addFile(path.join(TEMPLATES_DIR, file));
  }
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else addFile(file);
    }
  };
  walk(CONTENT_DIR);
  return `?v=${hash.digest('hex').slice(0, 8)}`;
}
let SITE_VERSION = siteVersion();

marked.setOptions({ gfm: true, breaks: true });

/* ---------- 小工具 ---------- */

const escapeHtml = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const stripHtml = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function parseFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else if (/^['"].*['"]$/.test(val)) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return { meta, body: raw.slice(m[0].length) };
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

function readingTime(text) {
  const cjk = (text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length;
  const latin =
    text.replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ' ').match(/[A-Za-z0-9]+/g) || [];
  const minutes = Math.max(1, Math.ceil((cjk + latin.length * 2) / 350));
  return minutes;
}

function makeExcerpt(html, maxLen = 140) {
  const text = stripHtml(html);
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function tagId(tag) {
  return 'tag-' + tag.trim().replace(/\s+/g, '-');
}

/* ---------- 页面组装 ---------- */

let HEADER_TMPL = fs.readFileSync(path.join(TEMPLATES_DIR, 'header.html'), 'utf8');
let FOOTER_TMPL = fs.readFileSync(path.join(TEMPLATES_DIR, 'footer.html'), 'utf8');

function navHtml(prefix, activeKey) {
  return CONFIG.nav
    .map((item) => {
      const active = item.href === activeKey;
      return `<a class="nav-link${active ? ' active' : ''}" href="${prefix}${item.href}${SITE_VERSION}"${active ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
    })
    .join('\n        ');
}

function renderSidebar(prefix, activeKey) {
  const widgets = fill(
    fs.readFileSync(path.join(TEMPLATES_DIR, 'widgets.html'), 'utf8'),
    {
      POST_COUNT: String(posts.length),
      TAG_COUNT: String(tags.length),
    }
  );
  const profileLinks = [];
  if (CONFIG.social?.github) {
    profileLinks.push(`<a href="${escapeHtml(CONFIG.social.github)}" target="_blank" rel="noopener">GitHub</a>`);
  }
  return fill(fs.readFileSync(path.join(TEMPLATES_DIR, 'sidebar.html'), 'utf8'), {
    ROOT: prefix,
    AVATAR: escapeHtml(CONFIG.avatar || 'assets/avatar.svg'),
    SITE_TITLE: escapeHtml(CONFIG.title),
    BIO: escapeHtml(CONFIG.bio || CONFIG.subtitle || ''),
    PROFILE_LINKS: profileLinks.join(' · '),
    NAV: navHtml(prefix, activeKey),
    WIDGETS: widgets,
    SITE_VERSION,
  });
}

function socialHtml() {
  const links = [];
  if (CONFIG.social?.github) {
    links.push(`<a href="${escapeHtml(CONFIG.social.github)}" target="_blank" rel="noopener">GitHub</a>`);
  }
  return links.join(' · ');
}

/* Twikoo 是否已配置：填了 envId 后，评论区换成 Twikoo，阅读量/评论数变成全网统计 */
function twikooEnabled() {
  const t = CONFIG.features?.comments?.twikoo;
  return !!(t && t.envId);
}

/* 注入给前端用的站点配置：basePath 用来把站内相对路径拼成完整路径，
   和 Twikoo 按 location.pathname 统计的 key 保持一致。 */
function siteConfigHtml() {
  let basePath = '/';
  try {
    basePath = new URL(CONFIG.baseUrl || '').pathname.replace(/\/+$/, '') + '/';
  } catch {
    /* baseUrl 没填时按根路径处理 */
  }
  const twikoo = twikooEnabled()
    ? {
        envId: CONFIG.features.comments.twikoo.envId,
        region: CONFIG.features.comments.twikoo.region || '',
      }
    : null;
  const json = JSON.stringify({ basePath, twikoo }).replace(/</g, '\\u003c');
  return `  <script type="application/json" id="siteConfig">${json}</script>`;
}

/* Twikoo 评论脚本（CDN）：只在配置了 envId 时输出，默认用国内访问更快的 npmmirror 镜像；
   想换 CDN 就在 site.config.json 的 features.comments.twikoo.cdn 里填自己的地址。 */
function twikooCdnHtml() {
  if (!twikooEnabled()) return '';
  const custom = CONFIG.features.comments.twikoo.cdn;
  const cdn =
    custom || 'https://registry.npmmirror.com/twikoo/1.7.19/files/dist/twikoo.min.js';
  return `  <script src="${escapeHtml(cdn)}" defer></script>`;
}

function fill(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

function page(opts) {
  const prefix = opts.prefix || '';
  const activeKey = opts.activeKey || 'index.html';
  const title = opts.title ? `${opts.title} · ${CONFIG.title}` : CONFIG.title;
  const description = opts.description || CONFIG.description;
  const header = fill(HEADER_TMPL, {
    TITLE: escapeHtml(title),
    DESCRIPTION: escapeHtml(description),
    ROOT: prefix,
    SITE_TITLE: escapeHtml(CONFIG.title),
    SIDEBAR: renderSidebar(prefix, activeKey),
    ASSET_VERSION,
    SITE_VERSION,
  });
  const footer = fill(FOOTER_TMPL, {
    ROOT: prefix,
    AUTHOR: escapeHtml(CONFIG.author),
    FOOTER_NOTE: escapeHtml(CONFIG.footerNote || ''),
    SOCIAL: socialHtml(),
    ASSET_VERSION,
    SITE_CONFIG: siteConfigHtml(),
    TWIKOO_SCRIPT: twikooCdnHtml(),
  });
  return header + '\n' + opts.body + '\n' + footer + '\n';
}

/* ---------- 读取内容 ---------- */

let posts = [];
let tags = [];
const tagMap = new Map();

function readPosts() {
  const postFiles = fs.readdirSync(POSTS_DIR).filter((f) => f.toLowerCase().endsWith('.md')).sort();
  const list = postFiles.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { meta, body } = parseFrontMatter(raw);
    const slug = file.replace(/\.md$/i, '');
    const title = meta.title || slug;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(meta.date) ? meta.date : '1970-01-01';
    const tags = Array.isArray(meta.tags)
      ? meta.tags
      : typeof meta.tags === 'string' && meta.tags
        ? meta.tags.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const html = marked.parse(body);
    const text = stripHtml(html);
    return {
      slug,
      title,
      date,
      tags,
      description: meta.description || '',
      html,
      text,
      // 支持在信息头里手动写 readingTime: 5，不写就自动估算
      readingMinutes: /^\d+$/.test(String(meta.readingtime ?? ''))
        ? Math.max(1, parseInt(meta.readingtime, 10))
        : readingTime(text),
    };
  });
  list.sort((a, b) => (a.date < b.date ? 1 : -1));
  return list;
}

/* 把文章文件夹里的图片等非 md 文件复制到网站里，
   这样文章里用相对路径（如 ./cpp/buy.png）就能直接显示。 */
function copyPostAssets() {
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const src = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(src, path.join(rel, entry.name));
      } else if (!entry.name.toLowerCase().endsWith('.md')) {
        const dest = path.join(OUT_DIR, 'posts', rel, entry.name);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    }
  };
  walk(POSTS_DIR, '');
}

const tagHtml = (post, prefix) =>
  post.tags
    .map((t) => `<a class="tag" href="${prefix}tags.html${SITE_VERSION}#${tagId(t)}">${escapeHtml(t)}</a>`)
    .join('');

/* ---------- 生成页面 ---------- */

function renderHome() {
  const list = posts
    .map(
      (post) => `
      <article class="post-item">
        <h2 class="post-title"><a href="posts/${post.slug}.html${SITE_VERSION}">${escapeHtml(post.title)}</a></h2>
        <div class="post-meta">
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span class="dot">·</span>
          <span>${post.readingMinutes} 分钟阅读</span>
          ${post.tags.length ? `<span class="dot">·</span> ${tagHtml(post, '')}` : ''}
        </div>
        <p class="post-excerpt">${escapeHtml(post.description || makeExcerpt(post.html))}</p>
        <div class="post-stats">
          ${CONFIG.features?.readingCount === false ? '' : `<span class="stat" title="${twikooEnabled() ? '全网阅读量（最近打开这篇文章时同步）' : '本机阅读次数（这台浏览器打开这篇文章的次数）'}">👁 <span data-reads="${escapeHtml(post.slug)}">0</span></span>`}
          <span class="stat" title="本机点赞状态（1 = 在这台设备上点过赞）">👍 <span data-likes="${escapeHtml(post.slug)}">0</span></span>
          <a class="stat" href="posts/${post.slug}.html${SITE_VERSION}#post-comments" data-comment-url="posts/${post.slug}.html">💬 <span data-comments="${escapeHtml(post.slug)}">0</span></a>
        </div>
      </article>`
    )
    .join('\n');

  const body = `
    <section class="hero">
      <h1>${escapeHtml(CONFIG.title)}</h1>
      <p class="hero-sub">${escapeHtml(CONFIG.subtitle || '')}</p>
    </section>
    <section class="post-list" aria-label="文章列表">
      ${posts.length ? list : '<p class="empty">还没有文章，去 content/posts/ 里写第一篇吧。</p>'}
    </section>`;
  return page({ body, activeKey: 'index.html' });
}

/* 点赞（保存在当前浏览器里；想要所有人共享的真实计数需要接 Twikoo 等后端） */
function renderLikes(slug) {
  if (CONFIG.features?.likes === false) return '';
  return `
      <div class="post-actions">
        <button class="like-btn" id="likeBtn" type="button" data-slug="${escapeHtml(slug)}" aria-pressed="false">🤍 点赞</button>
      </div>`;
}

/* 评论：配置了 Twikoo 就用 Twikoo（支持全网阅读量、首页评论数、网页内删除评论）；
   没配置 Twikoo 时退回 Giscus（基于 GitHub Discussions），再没配置就显示占位提示。 */
function renderComments() {
  const c = CONFIG.features?.comments;
  if (twikooEnabled()) {
    return `
      <section class="post-comments" id="post-comments">
        <h2>评论</h2>
        <div id="tcomment"></div>
        <p class="comments-manage">想管理或删除评论？点击评论区右上角的「小齿轮」图标，输入管理员密码登录后即可在线删除。</p>
      </section>`;
  }
  const configured = c && c.repo && c.repoId && c.categoryId;
  if (!configured) {
    return `
      <section class="post-comments" id="post-comments">
        <h2>评论</h2>
        <p class="comments-placeholder">评论功能已就位，配置后即可使用（步骤见 README「评论功能」一节）。</p>
      </section>`;
  }
  return `
      <section class="post-comments" id="post-comments">
        <h2>评论</h2>
        <script src="https://giscus.app/client.js"
          data-repo="${escapeHtml(c.repo)}"
          data-repo-id="${escapeHtml(c.repoId)}"
          data-category="${escapeHtml(c.category || 'Announcements')}"
          data-category-id="${escapeHtml(c.categoryId)}"
          data-mapping="pathname"
          data-strict="0"
          data-reactions-enabled="1"
          data-emit-metadata="0"
          data-input-position="bottom"
          data-theme="preferred_color_scheme"
          data-lang="zh-CN"
          crossorigin="anonymous"
          async></script>
        <p class="comments-manage"><a href="https://github.com/${escapeHtml(c.repo)}/discussions" target="_blank" rel="noopener">管理 / 删除评论（打开 GitHub Discussions）</a></p>
      </section>`;
}

function renderPost(post, index) {
  const prev = posts[index - 1];
  const next = posts[index + 1];
  const pager = `
      <nav class="post-pager" aria-label="上下篇文章">
        ${prev ? `<a class="pager-prev" href="${prev.slug}.html${SITE_VERSION}"><span>上一篇</span>${escapeHtml(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="pager-next" href="${next.slug}.html${SITE_VERSION}"><span>下一篇</span>${escapeHtml(next.title)}</a>` : '<span></span>'}
      </nav>`;

  const likesHtml = renderLikes(post.slug);
  const commentsHtml = renderComments();

  const body = `
    <article class="post" data-slug="${escapeHtml(post.slug)}">
      <header class="post-header">
        <h1>${escapeHtml(post.title)}</h1>
        <div class="post-meta">
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span class="dot">·</span>
          <span>${post.readingMinutes} 分钟阅读</span>
          ${CONFIG.features?.readingCount === false ? '' : twikooEnabled() ? `<span class="dot">·</span><span title="全网阅读量（Twikoo 统计）">阅读 <span id="twikoo_visitors">0</span></span>` : `<span class="dot">·</span><span title="本机阅读次数（这台浏览器打开这篇文章的次数）">阅读 <span data-reads="${escapeHtml(post.slug)}">0</span></span>`}
          ${post.tags.length ? `<span class="dot">·</span> ${tagHtml(post, '../')}` : ''}
        </div>
      </header>
      <div class="post-content">
        ${post.html}
      </div>
      ${likesHtml}
      ${pager}
      ${commentsHtml}
    </article>`;
  return page({
    body,
    prefix: '../',
    title: post.title,
    description: post.description || makeExcerpt(post.html),
    activeKey: 'index.html',
  });
}

function renderAbout() {
  const aboutFile = path.join(CONTENT_DIR, 'about.md');
  let content = '<p>这里还没有内容，去 content/about.md 写点什么吧。</p>';
  if (fs.existsSync(aboutFile)) {
    const { meta, body } = parseFrontMatter(fs.readFileSync(aboutFile, 'utf8'));
    content = marked.parse(body);
    if (meta.title) {
      content = `<h1>${escapeHtml(meta.title)}</h1>\n${content}`;
    }
  }
  const body = `
    <article class="post">
      <div class="post-content">
        ${content}
      </div>
    </article>`;
  return page({ body, activeKey: 'about.html', title: '关于' });
}

function renderTags() {
  const sections = tags
    .map((tag) => {
      const items = posts
        .filter((p) => p.tags.includes(tag))
        .map(
          (p) =>
            `<li><a href="posts/${p.slug}.html${SITE_VERSION}">${escapeHtml(p.title)}</a><time datetime="${p.date}">${formatDate(p.date)}</time></li>`
        )
        .join('\n');
      return `
      <section class="tag-group" id="${tagId(tag)}">
        <h2>${escapeHtml(tag)} <span class="tag-count">${tagMap.get(tag)}</span></h2>
        <ul class="tag-posts">${items}</ul>
      </section>`;
    })
    .join('\n');
  const body = `
    <article class="post">
      <div class="post-content">
        <h1>标签</h1>
        <p class="tag-cloud">
          ${tags.map((t) => `<a class="tag" href="#${tagId(t)}">${escapeHtml(t)}</a>`).join(' ') || '还没有标签。'}
        </p>
        ${sections}
      </div>
    </article>`;
  return page({ body, activeKey: 'tags.html', title: '标签' });
}

/* 归档页：按月份分组展示所有文章 */
function renderArchive() {
  const groups = new Map();
  for (const post of posts) {
    const monthKey = post.date.slice(0, 7); // 形如 2026-08
    const label = `${Number(post.date.slice(0, 4))}年${Number(post.date.slice(5, 7))}月`;
    if (!groups.has(monthKey)) groups.set(monthKey, { label, items: [] });
    groups.get(monthKey).items.push(post);
  }
  const sections = [...groups.entries()]
    .map(([monthKey, group]) => {
      const items = group.items
        .map(
          (p) =>
            `<li><a href="posts/${p.slug}.html${SITE_VERSION}">${escapeHtml(p.title)}</a><time datetime="${p.date}">${p.date.slice(5)}</time></li>`
        )
        .join('\n');
      return `
      <section class="tag-group">
        <h2>${group.label} <span class="tag-count">${group.items.length}</span></h2>
        <ul class="tag-posts">${items}</ul>
      </section>`;
    })
    .join('\n');
  const body = `
    <article class="post">
      <div class="post-content">
        <h1>归档</h1>
        <p class="archive-summary">共 ${posts.length} 篇文章，按月份归档。</p>
        ${sections || '<p>还没有文章。</p>'}
      </div>
    </article>`;
  return page({ body, activeKey: 'archive.html', title: '归档' });
}

/* 搜索页：把每篇文章的标题、日期、简介以 JSON 形式内嵌到页面里，
   由 main.js 在前端实时过滤，检索标题和简介中的关键字。 */
function renderSearch() {
  const index = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    description: post.description || makeExcerpt(post.html),
  }));
  const json = JSON.stringify(index).replace(/</g, '\\u003c');
  const body = `
    <article class="post">
      <div class="post-content">
        <h1>搜索</h1>
        <p class="search-hint">输入关键字，实时搜索每篇文章的标题和简介。</p>
        <input class="search-input" id="searchInput" type="search" placeholder="输入关键字，如：codex、markdown…" autocomplete="off" aria-label="搜索文章">
        <ul class="search-results" id="searchResults" aria-live="polite">
          <li class="search-empty">输入关键字开始搜索。</li>
        </ul>
      </div>
    </article>
    <script type="application/json" id="searchIndex" data-version="${SITE_VERSION}">${json}</script>`;
  return page({ body, activeKey: 'search.html', title: '搜索' });
}

function render404() {
  const body = `
    <article class="post">
      <div class="post-content">
        <h1>404</h1>
        <p>这里什么都没有，回到<a href="index.html${SITE_VERSION}">首页</a>看看吧。</p>
      </div>
    </article>`;
  return page({ body, title: '页面不存在' });
}

function renderFeed() {
  const base = (CONFIG.baseUrl || '').replace(/\/+$/, '');
  const items = posts
    .map((post) => {
      const pubDate = new Date(post.date + 'T00:00:00Z').toUTCString();
      return `
    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${base}/posts/${post.slug}.html</link>
      <guid isPermaLink="false">${base}/posts/${post.slug}.html</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.html}]]></description>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(CONFIG.title)}</title>
    <link>${base}/</link>
    <description>${escapeHtml(CONFIG.description)}</description>
    <language>zh-cn</language>
    ${items}
  </channel>
</rss>
`;
}

function renderSitemap(pages) {
  const base = (CONFIG.baseUrl || '').replace(/\/+$/, '');
  const urls = pages
    .map((p) => `  <url><loc>${base}/${p}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/* ---------- 执行 ---------- */

function build() {
  CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
  HEADER_TMPL = fs.readFileSync(path.join(TEMPLATES_DIR, 'header.html'), 'utf8');
  FOOTER_TMPL = fs.readFileSync(path.join(TEMPLATES_DIR, 'footer.html'), 'utf8');
  ASSET_VERSION = assetVersion();
  SITE_VERSION = siteVersion();

  posts = readPosts();

  tagMap.clear();
  for (const post of posts) {
    for (const tag of post.tags) {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    }
  }
  tags = [...tagMap.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

  fs.mkdirSync(path.join(OUT_DIR, 'posts'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'assets'), { recursive: true });
  fs.cpSync(ASSETS_DIR, path.join(OUT_DIR, 'assets'), { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderHome(), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'about.html'), renderAbout(), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'tags.html'), renderTags(), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'archive.html'), renderArchive(), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'search.html'), renderSearch(), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, '404.html'), render404(), 'utf8');

  posts.forEach((post, index) => {
    fs.writeFileSync(path.join(OUT_DIR, 'posts', `${post.slug}.html`), renderPost(post, index), 'utf8');
  });
  copyPostAssets();

  fs.writeFileSync(path.join(OUT_DIR, 'feed.xml'), renderFeed(), 'utf8');
  const sitePages = ['index.html', 'about.html', 'tags.html', 'archive.html', 'search.html', ...posts.map((p) => `posts/${p.slug}.html`)];
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), renderSitemap(sitePages), 'utf8');

  console.log(`构建完成：${posts.length} 篇文章，${tags.length} 个标签`);
  console.log(`输出目录：${OUT_DIR}`);
}

function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

build();

/* 监听模式：文件一保存就自动重新构建 */
if (process.argv.includes('--watch')) {
  const rebuild = debounce(() => {
    try {
      build();
    } catch (err) {
      console.error('构建出错：', err.message);
    }
  }, 200);

  for (const dir of [CONTENT_DIR, ASSETS_DIR, TEMPLATES_DIR]) {
    fs.watch(dir, { recursive: true }, rebuild);
  }
  fs.watch(path.join(ROOT, 'site.config.json'), rebuild);

  console.log('监听模式已开启：修改文章/样式/脚本/模板/配置后会自动重新构建，按 Ctrl+C 停止。');
}
