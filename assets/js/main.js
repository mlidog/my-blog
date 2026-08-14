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
})();
