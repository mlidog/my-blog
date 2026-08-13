# 我的博客（静态博客项目）

一个属于自己的个人博客：用 Markdown 写文章，双击一下就能生成网页，再免费发布到 GitHub Pages。不需要数据库，不需要服务器，也基本不需要碰命令行。

## 特点

- 文章用 Markdown 写，简单得像写纯文本；
- 构建零依赖：项目自带 Markdown 渲染器，不需要联网安装任何东西；
- 生成的是纯静态网页，速度快、免费托管；
- 自带首页、文章页、关于页、标签页、RSS 订阅和 404 页面；
- 代码整洁、带深色模式，也是学习前端的好素材。

## 项目结构

```
web1/
├── site.config.json      ← 博客基本信息（名字、作者、链接），改这里
├── build.mjs             ← 构建脚本（一般不用动）
├── 构建博客.bat          ← Windows 双击它就能生成网页
├── content/
│   ├── about.md          ← 关于页的内容
│   └── posts/            ← 你的文章都放这里（.md 文件）
├── templates/            ← 网页的头部和底部模板（可自学修改）
├── assets/
│   ├── css/style.css     ← 全部样式，改颜色和字体都在这里
│   ├── js/main.js        ← 菜单、复制按钮等小交互
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
4. **加一个小功能**：比如在 `assets/js/main.js` 里加个“回到顶部”按钮。

每次改完记得重新构建一次。

## 常见问题

**改了内容页面没变化？** 内容都在 `docs/` 里，改完源文件后一定要重新运行构建脚本。

**双击 bat 闪了一下就没了？** 在文件夹地址栏输入 `cmd` 回车，然后运行 `node build.mjs`，看具体报错。

**文章日期不对？** 检查 `date` 是不是 `2026-08-14` 这样的格式。

**Pages 里找不到 “Deploy from a branch”？** 先确认 GitHub 仓库里已经有内容（仓库首页能看到文件和提交记录）。没有的话，在 GitHub Desktop 里完成第一次提交并推送，再回到 Pages 刷新。

**想在手机上预览？** 把 `docs` 文件夹放到任意静态托管（比如 GitHub Pages、Vercel）后，手机访问网址即可。

祝你写博客愉快！
