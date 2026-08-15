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

  // 阅读量 / 评论数：构建脚本会把站点配置注入到 #siteConfig。
  // features.comments.twikoo 填了 envId 后，评论区换成 Twikoo，
  // 阅读量和首页评论数都变成全网统计；没配置时退回本机计数 + Giscus 评论。
  var siteConfig = null;
  var siteConfigEl = document.getElementById("siteConfig");
  if (siteConfigEl) {
    try {
      siteConfig = JSON.parse(siteConfigEl.textContent || "null");
    } catch (e) {
      siteConfig = null;
    }
  }
  var twikooConfig = (siteConfig && siteConfig.twikoo) || null;
  var twikooEnabled = !!(twikooConfig && twikooConfig.envId);
  var basePath = (siteConfig && siteConfig.basePath) || "/";
  // 把站内相对路径（如 posts/xxx.html）拼成和 location.pathname 一致的完整路径，
  // Twikoo 就是按这个路径统计阅读量和评论数的
  var fullPath = function (rel) {
    return basePath.replace(/\/?$/, "/") + String(rel).replace(/^\/+/, "");
  };
  var twikooOptions = function () {
    var opt = { envId: twikooConfig.envId };
    if (twikooConfig.region) opt.region = twikooConfig.region;
    return opt;
  };
  // Twikoo 脚本是延迟加载的（footer 里 <script defer>），可能比 main.js 晚一点到，
  // 所以轮询等它加载完再执行；8 秒内没加载成功就静默放弃，不影响其他功能
  var runWithTwikoo = function (cb) {
    if (!twikooEnabled) return;
    if (window.twikoo) {
      cb();
      return;
    }
    var waited = 0;
    var timer = setInterval(function () {
      waited += 100;
      if (window.twikoo) {
        clearInterval(timer);
        cb();
      } else if (waited >= 8000) {
        clearInterval(timer);
      }
    }, 100);
  };

  // 首页：批量查询每篇文章的全网评论数（getCommentsCount 不需要先 init）
  var commentLinks = document.querySelectorAll("[data-comment-url]");
  var fillCommentCounts = function () {
    if (!commentLinks.length) return;
    var urls = [];
    var seen = {};
    Array.prototype.forEach.call(commentLinks, function (a) {
      var u = fullPath(a.getAttribute("data-comment-url"));
      if (!seen[u]) {
        seen[u] = true;
        urls.push(u);
      }
    });
    twikoo
      .getCommentsCount(Object.assign({ urls: urls }, twikooOptions()))
      .then(function (res) {
        var map = {};
        (res || []).forEach(function (o) {
          if (o && o.url != null) map[o.url] = o.count || 0;
        });
        commentLinks.forEach(function (a) {
          var span = a.querySelector("[data-comments]");
          if (!span) return;
          var v = map[fullPath(a.getAttribute("data-comment-url"))];
          if (v != null) span.textContent = String(v);
        });
      })
      .catch(function () {
        /* 网络或配置问题：静默失败 */
      });
  };

  // 阅读数显示：Twikoo 模式下，打开文章页时 Twikoo 会记录全网阅读数并填充
  // #twikoo_visitors，我们把那个真实数字存进浏览器；首页显示本地保存的最近值。
  // 这样首页和文章页数字一致，又不会因为“打开首页”而给文章虚加阅读数
  // （Twikoo 的 COUNTER_GET 每次调用都会 +1，不能拿来当只读查询用）。
  var readSpans = document.querySelectorAll("[data-reads]");
  var readLocalCounts = function () {
    var reads = {};
    try {
      reads = JSON.parse(localStorage.getItem("blogReads") || "{}") || {};
    } catch (e) {
      reads = {};
    }
    readSpans.forEach(function (el) {
      var v = parseInt(reads[el.getAttribute("data-reads")], 10);
      el.textContent = String(v > 0 ? v : 0);
    });
  };

  // 文章页：打开一次记一次。
  // Twikoo 模式：初始化评论区，Twikoo 自动记录本页访问量并填充 #twikoo_visitors，
  // 然后把真实阅读数同步到本地给首页用；
  // 本机模式：在这台设备的浏览器里 +1
  var postArticle = document.querySelector(".post[data-slug]");
  if (postArticle) {
    var readSlug = postArticle.getAttribute("data-slug");
    if (twikooEnabled) {
      runWithTwikoo(function () {
        // 首次访问自动分配一个默认昵称：存进 Twikoo 自己用的 localStorage（key: twikoo），
        // 它会自动预填到评论框并记住；访客想改随时可以改成自己的名字
        var guestMeta = {};
        try {
          guestMeta = JSON.parse(localStorage.getItem("twikoo") || "{}") || {};
        } catch (e) {
          guestMeta = {};
        }
        if (!guestMeta.nick) {
          guestMeta.nick = "访客-" + Math.random().toString(36).slice(2, 6);
          try {
            localStorage.setItem("twikoo", JSON.stringify(guestMeta));
          } catch (e) {
            /* 存储不可用时忽略 */
          }
        }
        twikoo
          .init(Object.assign({ el: "#tcomment" }, twikooOptions()))
          .then(function () {
            var visitorsEl = document.getElementById("twikoo_visitors");
            if (!visitorsEl) return;
            var n = parseInt(visitorsEl.textContent, 10);
            if (isNaN(n)) return;
            var reads = {};
            try {
              reads = JSON.parse(localStorage.getItem("blogReads") || "{}") || {};
            } catch (e) {
              reads = {};
            }
            reads[readSlug] = n;
            try {
              localStorage.setItem("blogReads", JSON.stringify(reads));
            } catch (e) {
              /* 存储不可用时忽略 */
            }
          })
          .catch(function () {
            /* 评论区加载失败：静默，不影响页面其他功能 */
          });
      });
    } else {
      var READ_KEY = "blogReads";
      var reads = {};
      try {
        reads = JSON.parse(localStorage.getItem(READ_KEY) || "{}") || {};
      } catch (e) {
        reads = {};
      }
      reads[readSlug] = (parseInt(reads[readSlug], 10) || 0) + 1;
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(reads));
      } catch (e) {
        /* 存储不可用时忽略 */
      }
    }
  }

  // 首页/文章页：刷新阅读数显示（都读浏览器里保存的数字，两边一致）
  if (readSpans.length) readLocalCounts();

  // 首页：刷新全网评论数
  if (!postArticle) runWithTwikoo(fillCommentCounts);

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

  // 浏览器“返回缓存”恢复页面时（比如从文章页点返回键回到首页），
  // 重新刷新一遍阅读数、评论数和点赞显示，避免看到过时的数字；只刷新，不重复计数
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    if (readSpans.length) readLocalCounts();
    if (twikooEnabled) {
      runWithTwikoo(fillCommentCounts);
    }
    var likeSpansRestore = document.querySelectorAll("[data-likes]");
    if (likeSpansRestore.length) {
      var likesRestore = {};
      try {
        likesRestore = JSON.parse(localStorage.getItem("blogLikes") || "{}") || {};
      } catch (e2) {
        likesRestore = {};
      }
      likeSpansRestore.forEach(function (el) {
        el.textContent = likesRestore[el.getAttribute("data-likes")] ? "1" : "0";
      });
    }
  });
})();
