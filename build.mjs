/**
 * 博客构建脚本（零外部依赖）
 *
 * 用法：在项目根目录运行  node build.mjs
 * 或者直接双击「构建博客.bat」。
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
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
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
const ASSET_VERSION = assetVersion();

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
const SITE_VERSION = siteVersion();

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

const HEADER_TMPL = fs.readFileSync(path.join(TEMPLATES_DIR, 'header.html'), 'utf8');
const FOOTER_TMPL = fs.readFileSync(path.join(TEMPLATES_DIR, 'footer.html'), 'utf8');

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
  });
  return header + '\n' + opts.body + '\n' + footer + '\n';
}

/* ---------- 读取内容 ---------- */

const postFiles = fs.readdirSync(POSTS_DIR).filter((f) => f.toLowerCase().endsWith('.md')).sort();

const posts = postFiles.map((file) => {
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
    readingMinutes: readingTime(text),
  };
});

posts.sort((a, b) => (a.date < b.date ? 1 : -1));

const tagMap = new Map();
for (const post of posts) {
  for (const tag of post.tags) {
    tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
  }
}
const tags = [...tagMap.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

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

function renderPost(post, index) {
  const prev = posts[index - 1];
  const next = posts[index + 1];
  const pager = `
      <nav class="post-pager" aria-label="上下篇文章">
        ${prev ? `<a class="pager-prev" href="${prev.slug}.html${SITE_VERSION}"><span>上一篇</span>${escapeHtml(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="pager-next" href="${next.slug}.html${SITE_VERSION}"><span>下一篇</span>${escapeHtml(next.title)}</a>` : '<span></span>'}
      </nav>`;

  const body = `
    <article class="post">
      <header class="post-header">
        <h1>${escapeHtml(post.title)}</h1>
        <div class="post-meta">
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span class="dot">·</span>
          <span>${post.readingMinutes} 分钟阅读</span>
          ${post.tags.length ? `<span class="dot">·</span> ${tagHtml(post, '../')}` : ''}
        </div>
      </header>
      <div class="post-content">
        ${post.html}
      </div>
      ${pager}
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
  const base = CONFIG.baseUrl.replace(/\/+$/, '');
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
  const base = CONFIG.baseUrl.replace(/\/+$/, '');
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

fs.mkdirSync(path.join(OUT_DIR, 'posts'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'assets'), { recursive: true });
fs.cpSync(ASSETS_DIR, path.join(OUT_DIR, 'assets'), { recursive: true });

fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderHome(), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'about.html'), renderAbout(), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'tags.html'), renderTags(), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, '404.html'), render404(), 'utf8');

posts.forEach((post, index) => {
  fs.writeFileSync(path.join(OUT_DIR, 'posts', `${post.slug}.html`), renderPost(post, index), 'utf8');
});

fs.writeFileSync(path.join(OUT_DIR, 'feed.xml'), renderFeed(), 'utf8');
const sitePages = ['index.html', 'about.html', 'tags.html', ...posts.map((p) => `posts/${p.slug}.html`)];
fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), renderSitemap(sitePages), 'utf8');

console.log(`构建完成：${posts.length} 篇文章，${tags.length} 个标签`);
console.log(`输出目录：${OUT_DIR}`);
