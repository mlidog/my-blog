/* 博客的小交互：年份、移动端菜单、代码复制、深色模式、回到顶部 */
(function () {
  "use strict";

  // 页脚年份
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // 移动端侧边栏抽屉：点 ☰ 打开，点遮罩或 Esc 关闭，点链接自动关闭
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("siteNav");
  var overlay = document.getElementById("sidebarOverlay");
  if (toggle && nav) {
    var closeNav = function () {
      nav.classList.remove("open");
      if (overlay) overlay.classList.remove("show");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "打开菜单");
    };
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      if (overlay) overlay.classList.toggle("show", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    });
    if (overlay) overlay.addEventListener("click", closeNav);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });
  }

  // 代码块复制按钮
  document.querySelectorAll("pre > code").forEach(function (codeEl) {
    var pre = codeEl.parentElement;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.textContent = "复制";
    btn.addEventListener("click", function () {
      var text = codeEl.innerText;
      navigator.clipboard
        .writeText(text)
        .then(function () {
          btn.textContent = "已复制";
          setTimeout(function () {
            btn.textContent = "复制";
          }, 1600);
        })
        .catch(function () {
          btn.textContent = "复制失败";
        });
    });
    pre.appendChild(btn);
  });

  // 深色模式切换（选择会记住，刷新后仍然有效）
  var themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    var updateThemeIcon = function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      themeToggle.textContent = dark ? "☀️" : "🌙";
      themeToggle.setAttribute("aria-label", dark ? "切换到浅色模式" : "切换到深色模式");
    };
    themeToggle.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      var next = dark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* 隐私模式下可能无法写入，忽略即可 */
      }
      updateThemeIcon();
    });
    updateThemeIcon();
  }

  // 回到顶部：滚动超过一定距离后显示按钮
  var backToTop = document.getElementById("backToTop");
  if (backToTop) {
    var onScroll = function () {
      backToTop.classList.toggle("visible", window.scrollY > 350);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // 返回上一页：用浏览栈记录本站访问路径，可以一直返回到首页；
  // 首页没有可返回的站内页面，所以按钮不显示
  var backButton = document.getElementById("backButton");
  if (backButton) {
    var STACK_KEY = "blogStack";
    var current = location.href.split("?")[0].split("#")[0];
    var currentFile = current.split("/").pop().toLowerCase();
    var isHome = currentFile === "index.html";
    var stack = [];
    try {
      stack = JSON.parse(sessionStorage.getItem(STACK_KEY) || "[]");
      if (!Array.isArray(stack)) stack = [];
    } catch (e) {
      stack = [];
    }

    // 当前页如果已经在栈里（刷新或返回回来的），先截掉它后面的记录
    var idx = stack.indexOf(current);
    if (idx !== -1) {
      stack = stack.slice(0, idx + 1);
    }
    // 当前页不在栈顶才压入，避免重复记录
    if (stack[stack.length - 1] !== current) {
      stack.push(current);
    }
    try {
      sessionStorage.setItem(STACK_KEY, JSON.stringify(stack));
    } catch (e) {
      /* 存储不可用时按钮隐藏，功能降级为不可用，不影响其他功能 */
    }

    // 首页不显示返回按钮
    backButton.hidden = isHome;

    backButton.addEventListener("click", function () {
      var i = stack.indexOf(current);
      if (i > 0) {
        // 有站内上一页：退一步，并把当前页和后面的记录丢掉，避免循环
        var target = stack[i - 1];
        stack = stack.slice(0, i);
        try {
          sessionStorage.setItem(STACK_KEY, JSON.stringify(stack));
        } catch (e) {
          /* 忽略 */
        }
        window.location.href = target;
      } else {
        // 没有站内上一页（比如直接打开的文章页），直接回首页
        var home = backButton.getAttribute("data-home") || "index.html";
        try {
          sessionStorage.setItem(STACK_KEY, JSON.stringify([home.replace(/[?#].*$/, "")]));
        } catch (e) {
          /* 忽略 */
        }
        window.location.href = home;
      }
    });
  }

  // 点赞：记录在当前浏览器里（每台设备独立），刷新后保留
  var likeBtn = document.getElementById("likeBtn");
  if (likeBtn) {
    var slug = likeBtn.getAttribute("data-slug") || "";
    var LIKES_KEY = "blogLikes";
    var liked = {};
    try {
      liked = JSON.parse(localStorage.getItem(LIKES_KEY) || "{}") || {};
    } catch (e) {
      liked = {};
    }
    var setLikeState = function (on) {
      likeBtn.classList.toggle("liked", on);
      likeBtn.setAttribute("aria-pressed", on ? "true" : "false");
      likeBtn.textContent = on ? "❤️ 已赞" : "🤍 点赞";
    };
    setLikeState(!!liked[slug]);
    likeBtn.addEventListener("click", function () {
      if (liked[slug]) {
        delete liked[slug];
      } else {
        liked[slug] = true;
      }
      try {
        localStorage.setItem(LIKES_KEY, JSON.stringify(liked));
      } catch (e) {
        /* 隐私模式下可能无法写入，忽略 */
      }
      setLikeState(!!liked[slug]);
    });
  }

  // 本机阅读量：每打开一次文章页，在这台设备的浏览器里记一次
  var postArticle = document.querySelector(".post[data-slug]");
  if (postArticle) {
    var READ_KEY = "blogReads";
    var reads = {};
    try {
      reads = JSON.parse(localStorage.getItem(READ_KEY) || "{}") || {};
    } catch (e) {
      reads = {};
    }
    var readSlug = postArticle.getAttribute("data-slug");
    reads[readSlug] = (parseInt(reads[readSlug], 10) || 0) + 1;
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(reads));
    } catch (e) {
      /* 存储不可用时忽略 */
    }
  }

  // 首页文章卡片：显示本机阅读量、点赞状态和评论入口
  var readSpans = document.querySelectorAll("[data-reads]");
  if (readSpans.length) {
    var readsHome = {};
    try {
      readsHome = JSON.parse(localStorage.getItem("blogReads") || "{}") || {};
    } catch (e) {
      readsHome = {};
    }
    readSpans.forEach(function (el) {
      el.textContent = String(parseInt(readsHome[el.getAttribute("data-reads")], 10) || 0);
    });
  }

  var likeSpans = document.querySelectorAll("[data-likes]");
  if (likeSpans.length) {
    var likesHome = {};
    try {
      likesHome = JSON.parse(localStorage.getItem("blogLikes") || "{}") || {};
    } catch (e) {
      likesHome = {};
    }
    likeSpans.forEach(function (el) {
      el.textContent = likesHome[el.getAttribute("data-likes")] ? "1" : "0";
    });
  }

  // 搜索页：按标题和简介实时过滤文章
  var searchInput = document.getElementById("searchInput");
  var searchResults = document.getElementById("searchResults");
  var searchIndexEl = document.getElementById("searchIndex");
  if (searchInput && searchResults && searchIndexEl) {
    var searchIndex = [];
    try {
      searchIndex = JSON.parse(searchIndexEl.textContent || "[]") || [];
    } catch (e) {
      searchIndex = [];
    }
    var searchVersion = searchIndexEl.getAttribute("data-version") || "";
    var escSearch = function (s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    };
    searchInput.addEventListener("input", function () {
      var q = searchInput.value.trim().toLowerCase();
      if (!q) {
        searchResults.innerHTML = '<li class="search-empty">输入关键字开始搜索。</li>';
        return;
      }
      var hits = searchIndex.filter(function (post) {
        return (post.title + " " + post.description).toLowerCase().indexOf(q) !== -1;
      });
      if (!hits.length) {
        searchResults.innerHTML = '<li class="search-empty">没有找到包含「' + escSearch(q) + '」的文章。</li>';
        return;
      }
      searchResults.innerHTML = hits
        .map(function (post) {
          return (
            '<li class="search-item">' +
            '<a class="search-title" href="posts/' +
            encodeURIComponent(post.slug) +
            ".html" +
            searchVersion +
            '">' +
            escSearch(post.title) +
            "</a>" +
            '<div class="search-meta"><time datetime="' +
            escSearch(post.date) +
            '">' +
            escSearch(post.date) +
            "</time></div>" +
            '<p class="search-desc">' +
            escSearch(post.description) +
            "</p>" +
            "</li>"
          );
        })
        .join("");
    });
  }
})();
