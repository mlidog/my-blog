# 我的博客（静态博客项目）

一个属于自己的个人博客：用 Markdown 写文章，双击一下就能生成网页，再免费发布到 GitHub Pages。不需要数据库，不需要服务器，也基本不需要碰命令行。

## 特点

- 文章用 Markdown 写，简单得像写纯文本；
- 构建零依赖：项目自带 Markdown 渲染器，不需要联网安装任何东西；
- 生成的是纯静态网页，速度快、免费托管；
- 自带左侧边栏（个人资料 + 导航 + 小部件区）、首页、文章页、关于页、标签页、RSS 订阅和 404 页面；
- 代码整洁、带深色模式切换和回到顶部按钮，也是学习前端的好素材。

## 项目结构

```
web1/
├── site.config.json      ← 博客基本信息（名字、作者、链接），改这里
├── build.mjs             ← 构建脚本（一般不用动）
├── 构建博客.bat          ← Windows 双击它就能生成网页
├── content/
│   ├── about.md          ← 关于页的内容
│   └── posts/            ← 你的文章都放这里（.md 文件）
├── templates/
│   ├── header.html       ← 网页头部结构（引入侧边栏）
│   ├── footer.html       ← 网页底部结构
│   ├── sidebar.html      ← 左侧边栏骨架（头像、导航、小部件区）
│   └── widgets.html      ← 侧边栏小部件，想加部件改这里
├── assets/
│   ├── css/style.css     ← 全部样式，改颜色和字体都在这里
│   ├── js/main.js        ← 侧边栏抽屉、复制按钮等小交互
│   ├── avatar.svg        ← 默认头像（想换成自己的照片：把图片放进 assets 并改 site.config.json 的 avatar）
│   └── favicon.svg       ← 网站小图标
├── vendor/               ← 内置的 Markdown 渲染器（不用管）
└── docs/                 ← 构建出来的网站（发布时用这个文件夹）
```

## 三步开始使用

### 1. 改成你的信息

用记事本（或 VS Code）打开 `site.config.json`，把这几项换成你自己的：

| 字段 | 填什么 |
| ---- | ------ |
| `title` | 博客名字 |
| `subtitle` | 一句话简介 |
| `author` | 你的名字 |
| `description` | 给搜索引擎看的博客介绍 |
| `baseUrl` | 发布后的网址（发布完再改，先留着也行） |
| `social.github` | 你的 GitHub 主页 |

### 2. 写文章

在 `content/posts/` 文件夹里新建一个 `.md` 文件，开头按这个格式写：

```markdown
---
title: 我的第一篇文章
date: 2026-08-14
tags: [生活, 随笔]
description: 这篇文章写的是什么。
---

这里是正文，用 Markdown 写就行。
```

- `title` 和 `date` 必填，`date` 的格式是 `年-月-日`；
- `tags` 可以写多个，用逗号隔开；
- `description` 不写也没关系，会自动截取正文开头；
- 文件名建议用英文或拼音（比如 `my-first-post.md`），避免空格。

不会 Markdown？项目里已经有一篇《[Markdown 写作小抄](docs/posts/markdown-cheatsheet.html)》，照着抄就行。

### 3. 构建 + 本地预览

1. 双击 **构建博客.bat**（或者打开终端运行 `node build.mjs`），看到“构建完成”就说明成功了；
2. 双击 `docs/index.html` 就能在浏览器里看到你的博客。

以后每次改完文章或样式，都重复第 3 步。

## 发布到 GitHub Pages（免费）

### 方法一：GitHub Desktop（推荐新手，全程鼠标操作）

1. 去 [desktop.github.com](https://desktop.github.com/) 下载并安装 GitHub Desktop，登录你的 GitHub 账号；
2. 打开 GitHub Desktop，点 **File → Add Local Repository…**，选择 `web1` 这个文件夹；
3. **先提交，再发布**，顺序很重要：
   - 左侧会列出项目里的所有文件，在左下角“Summary”框输入说明（比如 `初始化博客`），点 **Commit to master**（第一次会显示 **Create first commit**）；
   - 点右上角 **Publish repository** 发布到你的账号下（仓库名随意，比如 `my-blog`）；
4. 打开这个仓库的网页，进入 **Settings → Pages**；
5. 在 **Build and deployment → Source** 里选择 **Deploy from a branch**，分支选 **master**（你的本地仓库默认就是 master，不要选 main），文件夹选 **/docs**，点 **Save**；
6. 等一两分钟，你的博客就会出现在 `https://你的用户名.github.io/仓库名/`。

> 注意：如果第 5 步找不到 “Deploy from a branch”，说明第 3 步的提交或推送还没完成——GitHub 上的仓库还是空的，Pages 里不会出现分支选项。回到 GitHub Desktop 完成首次提交并推送后再刷新页面即可。

> 如果 Pages 页面提示 “Upgrade or make this repository public to enable Pages”：说明仓库是私有的。免费版 GitHub Pages 只支持公开仓库，把仓库设为公开即可（个人博客本来就是公开内容，代码公开也很正常）。方法：仓库网页 → **Settings → General**，拉到最底部 **Danger Zone → Change repository visibility → Change to public**，确认后回到 **Settings → Pages** 继续操作。

发布成功后，把 `site.config.json` 里的 `baseUrl` 改成你的真实网址，重新构建并提交一次，RSS 订阅链接就正确了。

以后发新文章：写文章 → 双击构建 → 回到 GitHub Desktop 提交并推送，就完成了。

### 方法二：命令行（想顺便练一下 git 可以试试）

```bash
git add -A
git commit -m "更新博客"
git push
```

## 想学前端？从这些地方开始

这个博客就是很好的练习素材，按难度排列：

1. **改颜色和字体**：打开 `assets/css/style.css`，改最上面 `:root` 里的几个颜色值，刷新页面就能看到变化；
2. **改页面的头和脚**：`templates/header.html` 是顶部导航，`templates/footer.html` 是底部版权信息；
3. **改首页布局**：首页的结构在 `build.mjs` 里的 `renderHome()` 函数；
4. **加一个小功能**：项目里已经有几个现成例子可以照着学——左侧边栏（骨架在 `templates/sidebar.html`，资料在 `site.config.json` 的 `bio`/`avatar`）和侧边栏小部件（想加新部件，在 `templates/widgets.html` 里照示例加一个 `.widget` 块即可）。按钮和交互逻辑分别改 `templates/` 和 `assets/js/main.js`。

每次改完记得重新构建一次。

### 按钮位置速查

想挪按钮，先分清两种定位方式：**浮动按钮**（回到顶部）靠 CSS 的 `position: fixed` 加 `top/right/bottom/left` 四个值定位；**页面里的普通按钮**（深色模式、菜单）靠 HTML 里的先后顺序和父容器的排列方式决定，想挪就把那行 HTML 搬走。

| 按钮 | 现在的位置 | 控制位置的代码 |
| ---- | ---------- | -------------- |
| 回到顶部 ↑ | 右下角浮动 | `assets/css/style.css` 的 `.side-buttons`（改 `right`/`bottom`） |
| 深色模式 🌙 | 顶部右侧 | `templates/header.html` 第 32 行（搬走这行就能换位置），按钮间距看 `.header-actions` |
| 菜单 ☰ | 顶部右侧（手机才显示） | `templates/header.html` 第 33 行 |
| 侧边栏整体 | 左侧固定 | `assets/css/style.css` 的 `.sidebar`（改 `left`/`top`/`bottom`/`width`） |
| 代码块的“复制”按钮 | 每个代码块右上角 | `assets/css/style.css` 的 `.post-content .code-copy`（改 `top`/`right`） |

两个最常用的例子：

- **把“回到顶部”挪到左下角**：`.side-buttons` 里把 `right: 24px` 改成 `left: 24px`；
- **把“深色模式”按钮挪进侧边栏**：剪切 `header.html` 第 32 行，粘贴到 `templates/widgets.html` 的任意位置（功能不受影响，因为按钮的 `id` 没变）。

## 缓存和版本号（不用手动管）

**版本号是什么？** 就是网址后面那一小段 `?v=xxxxxx`，比如 `main.js?v=e95a19a6`。浏览器会用这段尾巴来判断文件变没变：尾巴变了就重新下载，没变就用缓存。这样既能加快访问速度，又能保证更新后大家看到的一定是新版本。

**你需要手动加版本号吗？不需要。** 这个项目已经全自动了：每次双击「构建博客.bat」时，构建脚本会扫描 `assets/css` 和 `assets/js` 里所有文件的内容，算出新的版本号并自动拼到链接上。

- 改了 `style.css` 或 `main.js` → 版本号自动变；
- 在 `assets/css` 或 `assets/js` 里**新增**了文件 → 也会被算进去，版本号自动变；
- 什么都没改，重复构建 → 版本号不变，浏览器可以放心用缓存。

所以你以后更新功能只需要记住这条流程：

> 改文件 → 双击构建 → 在 GitHub Desktop 提交并推送 → 完事。用户那边正常刷新就能看到新版。

如果哪天你想在模板里**手动**加版本号（一般用不上）：在 `templates/header.html` 或 `templates/footer.html` 的链接后面拼上 `{{ASSET_VERSION}}` 即可，构建时它会自动替换成当前版本号。想彻底手动控制，也可以写死 `?v=2`、`?v=3`，但记得每次更新都要改，容易忘，不推荐。

## 常见问题

**改了内容页面没变化？** 内容都在 `docs/` 里，改完源文件后一定要重新运行构建脚本。

**双击 bat 闪了一下就没了？** 在文件夹地址栏输入 `cmd` 回车，然后运行 `node build.mjs`，看具体报错。

**文章日期不对？** 检查 `date` 是不是 `2026-08-14` 这样的格式。

**Pages 里找不到 “Deploy from a branch”？** 先确认 GitHub 仓库里已经有内容（仓库首页能看到文件和提交记录）。没有的话，在 GitHub Desktop 里完成第一次提交并推送，再回到 Pages 刷新。

**Pages 提示 “Upgrade or make this repository public”？** 说明仓库是私有的，免费版不支持私有仓库的 Pages。把仓库设为公开，或者改用 Vercel / Cloudflare Pages 等免费托管（它们支持私有仓库）。

**我改了 `docs/` 里的网页，重新构建后又变回去了？** 这是正常的：`docs/` 是构建脚本自动生成的结果，每次构建都会用源文件重新生成一遍，手动改的内容会被覆盖。改文章内容请编辑 `content/posts/` 里的 `.md` 文件；改样式编辑 `assets/css/style.css`；改页面头和尾编辑 `templates/` 里的两个文件，然后重新构建。

**上线后按钮点击没反应？** 多半是浏览器还在用旧缓存的脚本。先按 `Ctrl + F5`（手机浏览器则清除网站数据或开无痕模式）强制刷新一次。项目已经给样式和脚本自动加了版本号，以后每次构建更新，浏览器都会自动加载新文件，不会再出现这种问题。

**想在手机上预览？** 把 `docs` 文件夹放到任意静态托管（比如 GitHub Pages、Vercel）后，手机访问网址即可。

祝你写博客愉快！
