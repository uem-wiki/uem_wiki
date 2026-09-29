(function () {
  "use strict";

  const pageContent = document.getElementById("page-content");
  const tocList = document.getElementById("tocList");
  const sidebar = document.getElementById("wikiSidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const contentLayout = document.getElementById("contentLayout");
  const status = document.getElementById("routerStatus");
  const progressBar = document.getElementById("pageProgress");
  const progressValue = progressBar ? progressBar.querySelector("span") : null;
  const cache = new Map();
  const loadedScripts = new Set();
  let requestId = 0;
  let tocListener = null;
  let tocHeadings = [];
  let searchIndexPromise = null;
  let navigationPromise = null;
  let twikooPromise = null;
  let commentsActivated = false;
  let progressStartedAt = 0;
  let progressTrickleTimer = null;
  let progressHideTimer = null;

  function normalizePath(pathname) {
    let path = decodeURIComponent(pathname || "/");
    if (path.endsWith("/")) {
      path += "index.html";
    }
    return path.replace(/\.html$/, "");
  }

  function renderTopNavigation() {
    const navigation = document.getElementById("appNav");
    if (!navigation || navigation.childElementCount > 0) {
      return;
    }

    navigation.innerHTML =
      '<a href="/index.html" class="nav-brand">' +
        '<img src="/圆形logo.png" alt="应大Wiki" class="nav-logo">' +
        '<span>应大Wiki</span>' +
      '</a>' +
      '<div class="search-box">' +
        '<input type="text" id="searchInput" class="nav-search" ' +
          'placeholder="搜索页面内容..." autocomplete="off" aria-label="搜索页面内容">' +
        '<div id="searchResults" class="search-results"></div>' +
      '</div>' +
      '<button type="button" class="theme-toggle" id="themeToggle" ' +
        'title="切换深浅色" aria-label="切换深浅色">' +
        '<span class="theme-icon theme-icon-moon">🌙</span>' +
        '<span class="theme-icon theme-icon-sun">☀️</span>' +
      '</button>';
  }

  function loadNavigation() {
    if (!navigationPromise) {
      navigationPromise = fetch("/navigation.json", { cache: "no-cache" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("navigation unavailable");
          }
          return response.json();
        })
        .catch(function () {
          return { sidebar: [] };
        });
    }
    return navigationPromise;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function isSidebarTargetActive(target, currentPage) {
    const targetPath = normalizePath("/docs/" + target);
    if (targetPath === currentPage) {
      return true;
    }

    const targetParts = targetPath.split("/");
    const currentParts = currentPage.split("/");
    return (
      targetParts.at(-1) === "index" &&
      targetParts[1] === "学院与专业" &&
      targetParts.length === currentParts.length &&
      targetParts.slice(0, -1).join("/") === currentParts.slice(0, -1).join("/")
    );
  }

  function renderSidebar(navigation) {
    if (!sidebar) {
      return;
    }

    const currentPage = normalizePath(window.location.pathname);
    const lines = ['<ul class="sidebar-nav">'];

    for (const item of navigation.sidebar || []) {
      const active = isSidebarTargetActive(item.path, currentPage);
      const activeClass = active ? " active" : "";
      const hasChildren = Boolean(item.children?.length);
      const childrenClass = hasChildren ? " has-children" : "";

      lines.push(`<li class="sidebar-item${activeClass}">`);
      lines.push(
        `<a href="/docs/${escapeHtml(item.path)}" ` +
          `class="sidebar-link${childrenClass}${activeClass}">` +
          `${escapeHtml(item.name)}</a>`
      );

      if (hasChildren) {
        lines.push('<ul class="sidebar-children">');
        for (const child of item.children) {
          const childActive = isSidebarTargetActive(child.path, currentPage);
          const childActiveClass = childActive ? " active" : "";
          lines.push(
            `<li><a href="/docs/${escapeHtml(child.path)}" ` +
              `class="sidebar-link${childActiveClass}">` +
              `${escapeHtml(child.name)}</a></li>`
          );
        }
        lines.push("</ul>");
      }

      lines.push("</li>");
    }

    lines.push("</ul>");
    sidebar.innerHTML = lines.join("\n");
  }

  async function initSidebarNavigation() {
    const navigation = await loadNavigation();
    renderSidebar(navigation);
    updateSidebarActive(window.location.pathname);
  }

  async function resolveLocationModel(pathname) {
    const navigation = await loadNavigation();
    const current = normalizePath(pathname);
    const root = { href: "/index.html" };

    if (current === normalizePath("/docs/index.html")) {
      return { parent: root, ancestors: [root] };
    }

    for (const section of navigation.sidebar || []) {
      const sectionHref = "/docs/" + section.path;
      const sectionPath = normalizePath(sectionHref);

      if (current === sectionPath) {
        return {
          parent: root,
          ancestors: [root]
        };
      }

      for (const child of section.children || []) {
        const childHref = "/docs/" + child.path;
        if (current === normalizePath(childHref)) {
          return {
            parent: { href: sectionHref },
            ancestors: [root, { href: sectionHref }]
          };
        }
      }
    }

    if (current.startsWith("/docs/学院与专业/")) {
      const currentParts = current.split("/");
      const section = (navigation.sidebar || []).find(function (item) {
        return item.path === "学院与专业/index.html";
      });
      const college = section && (section.children || []).find(function (child) {
        const childParts = normalizePath("/docs/" + child.path).split("/");
        return childParts.slice(0, -1).join("/") === currentParts.slice(0, -1).join("/");
      });

      if (college) {
        const collegeHref = "/docs/" + college.path;
        if (current === normalizePath("/docs/学院与专业/index.html")) {
          return {
            parent: root,
            ancestors: [root]
          };
        }
        return {
          parent: { href: collegeHref },
          ancestors: [
            root,
            { href: "/docs/学院与专业/index.html" },
            { href: collegeHref }
          ]
        };
      }
    }

    const parentPath = current.replace(/\/[^/]+$/, "/index.html");
    if (parentPath !== current + "/index.html") {
      return {
        parent: { href: parentPath },
        ancestors: [root, { href: parentPath }]
      };
    }
    return { parent: null, ancestors: [] };
  }

  function historyStateFor(url, model) {
    return {
      uemWikiManaged: true,
      url: url,
      parentKey: model.parent ? normalizePath(model.parent.href) : null
    };
  }

  async function initializeHistoryHierarchy() {
    if (history.state && history.state.uemWikiManaged) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    if (!currentUrl.pathname.startsWith("/docs/")) {
      return;
    }

    const model = await resolveLocationModel(currentUrl.pathname);
    const ancestors = model.ancestors || [];
    if (ancestors.length === 0) {
      return;
    }

    history.replaceState(
      historyStateFor(new URL(ancestors[0].href, window.location.origin).href, { parent: null }),
      "",
      ancestors[0].href
    );
    for (let index = 1; index < ancestors.length; index += 1) {
      history.pushState(
        historyStateFor(new URL(ancestors[index].href, window.location.origin).href, { parent: null }),
        "",
        ancestors[index].href
      );
    }
    history.pushState(
      historyStateFor(currentUrl.href, model),
      "",
      currentUrl.href
    );
  }

  function shouldHandleLink(anchor, event) {
    if (!pageContent || !anchor || anchor.dataset.noRouter === "true") {
      return false;
    }
    if (event.defaultPrevented || event.button !== 0) {
      return false;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }
    if (anchor.target || anchor.hasAttribute("download")) {
      return false;
    }

    const href = anchor.getAttribute("href") || "";
    if (!href || href.startsWith("#")) {
      return false;
    }

    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (error) {
      return false;
    }

    if (url.origin !== window.location.origin) {
      return false;
    }
    if (!url.pathname.startsWith("/docs/") || !url.pathname.endsWith(".html")) {
      return false;
    }
    if (/\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z|png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) {
      return false;
    }
    return true;
  }

  function showLoading(message) {
    if (!status) {
      return;
    }
    status.textContent = message || "正在加载...";
    status.hidden = false;
  }

  function hideLoading() {
    if (status) {
      status.hidden = true;
    }
  }

  function renderProgress(value) {
    if (!progressValue) {
      return;
    }
    const normalized = Math.max(0, Math.min(1, value));
    progressValue.style.transform = "scaleX(" + normalized + ")";
  }

  function startProgress() {
    if (!progressBar) {
      return;
    }
    progressStartedAt = Date.now();
    clearTimeout(progressHideTimer);
    clearInterval(progressTrickleTimer);
    progressBar.classList.add("active");
    renderProgress(0.08);

    let value = 0.08;
    progressTrickleTimer = setInterval(function () {
      const remaining = 0.82 - value;
      if (remaining <= 0.005) {
        clearInterval(progressTrickleTimer);
        return;
      }
      value += remaining * 0.18;
      renderProgress(value);
    }, 180);
  }

  function finishProgress() {
    if (!progressBar) {
      return;
    }
    clearInterval(progressTrickleTimer);
    const visibleLongEnough = Date.now() - progressStartedAt >= 140;
    renderProgress(1);
    if (!visibleLongEnough) {
      progressBar.classList.remove("active");
      setTimeout(function () { renderProgress(0); }, 180);
      return;
    }
    progressHideTimer = setTimeout(function () {
      progressBar.classList.remove("active");
      setTimeout(function () { renderProgress(0); }, 180);
    }, 180);
  }

  function setArrow(fold, collapsed) {
    fold.textContent = collapsed ? "\u25B8" : "\u25BE";
    fold.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function initSidebarFolds() {
    document.querySelectorAll(".sidebar-item").forEach(function (item) {
      const link = item.querySelector(":scope > .sidebar-link.has-children");
      const children = item.querySelector(":scope > .sidebar-children");
      if (!link || !children || !children.querySelector("li")) {
        return;
      }

      item.querySelectorAll(":scope > .sidebar-fold").forEach(function (node) {
        node.remove();
      });

      const collapsed = !item.classList.contains("active") &&
        !children.querySelector(".sidebar-link.active");
      item.classList.toggle("collapsed", collapsed);

      const fold = document.createElement("span");
      fold.className = "sidebar-fold";
      fold.title = "展开/收起";
      fold.setAttribute("role", "button");
      fold.tabIndex = 0;
      setArrow(fold, collapsed);

      function toggle(event) {
        event.preventDefault();
        event.stopPropagation();
        const nextCollapsed = !item.classList.contains("collapsed");
        item.classList.toggle("collapsed", nextCollapsed);
        setArrow(fold, nextCollapsed);
      }

      fold.addEventListener("click", toggle);
      fold.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          toggle(event);
        }
      });
      link.insertAdjacentElement("afterend", fold);
    });
  }

  function updateSidebarActive(pathname) {
    if (!sidebar) {
      return;
    }

    const currentPath = normalizePath(pathname || window.location.pathname);
    sidebar.querySelectorAll(".sidebar-link.active").forEach(function (link) {
      link.classList.remove("active");
      const item = link.closest(".sidebar-item");
      if (item) {
        item.classList.remove("active");
      }
    });

    let matched = false;
    sidebar.querySelectorAll(".sidebar-link").forEach(function (link) {
      let target;
      try {
        target = normalizePath(new URL(link.href, window.location.href).pathname);
      } catch (error) {
        return;
      }

      if (target !== currentPath) {
        return;
      }

      matched = true;
      link.classList.add("active");
      const item = link.closest(".sidebar-item");
      if (item && link.classList.contains("has-children")) {
        item.classList.add("active");
      }
      expandActiveSection(link);
    });

    if (!matched && currentPath.startsWith("/docs/学院与专业/")) {
      const pageParts = currentPath.split("/");
      sidebar.querySelectorAll(".sidebar-children .sidebar-link").forEach(function (link) {
        const target = normalizePath(new URL(link.href, window.location.href).pathname);
        const targetParts = target.split("/");
        if (
          targetParts.length === pageParts.length &&
          targetParts.slice(0, -1).join("/") === pageParts.slice(0, -1).join("/")
        ) {
          link.classList.add("active");
          expandActiveSection(link);
        }
      });
    }

    initSidebarFolds();
  }

  function expandActiveSection(link) {
    const item = link.closest(".sidebar-item");
    if (!item) {
      return;
    }
    item.classList.remove("collapsed");
    const fold = item.querySelector(":scope > .sidebar-fold");
    if (fold) {
      setArrow(fold, false);
    }
  }

  function initSidebarToggle() {
    if (!sidebar || !sidebarToggle || !contentLayout) {
      return;
    }

    if (window.innerWidth < 900) {
      sidebarToggle.textContent = "☰";
    }

    sidebarToggle.addEventListener("click", function () {
      if (window.innerWidth < 900) {
        const open = sidebar.classList.toggle("open");
        sidebarToggle.classList.toggle("on", open);
        sidebarToggle.textContent = open ? "✕" : "☰";
        return;
      }

      sidebar.classList.toggle("collapsed");
      sidebarToggle.classList.toggle("collapsed");
      contentLayout.classList.toggle("sidebar-collapsed");
      sidebarToggle.textContent = sidebar.classList.contains("collapsed") ? "▸" : "◂";
    });

    document.addEventListener("click", function (event) {
      if (window.innerWidth >= 900 || !sidebar.classList.contains("open")) {
        return;
      }
      if (sidebar.contains(event.target) || sidebarToggle.contains(event.target)) {
        return;
      }
      sidebar.classList.remove("open");
      sidebarToggle.classList.remove("on");
      sidebarToggle.textContent = "☰";
    });
  }

  function initTheme() {
    const root = document.documentElement;
    const button = document.getElementById("themeToggle");

    function isDark() {
      return root.getAttribute("data-theme") === "dark";
    }

    function apply(theme, save) {
      if (theme === "dark") {
        root.setAttribute("data-theme", "dark");
      } else {
        root.removeAttribute("data-theme");
      }
      if (save) {
        try {
          localStorage.setItem("uem-theme", theme);
        } catch (error) {}
      }
    }

    apply(isDark() ? "dark" : "light", false);
    if (button) {
      button.addEventListener("click", function () {
        apply(isDark() ? "light" : "dark", true);
      });
    }
  }

  function initToc() {
    const section = pageContent && pageContent.querySelector(".markdown-section");
    if (!section || !tocList) {
      return;
    }

    tocList.innerHTML = "";
    tocHeadings = Array.prototype.slice.call(section.querySelectorAll("h2, h3"));
    if (tocHeadings.length === 0) {
      return;
    }

    tocHeadings.forEach(function (heading, index) {
      if (!heading.id) {
        heading.id = "toc-" + index;
      }
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent.replace(/^§\s*/, "");
      link.className = heading.tagName === "H3" ? "toc-h3" : "";
      item.appendChild(link);
      tocList.appendChild(item);
    });

    if (tocListener) {
      window.removeEventListener("scroll", tocListener);
    }
    const links = Array.prototype.slice.call(tocList.querySelectorAll("a"));
    tocListener = function () {
      const scrollY = window.scrollY + 80;
      let current = null;
      tocHeadings.forEach(function (heading) {
        if (heading.offsetTop <= scrollY) {
          current = heading;
        }
      });
      links.forEach(function (link) {
        link.classList.toggle(
          "active",
          Boolean(current) && link.getAttribute("href") === "#" + current.id
        );
      });
    };
    window.addEventListener("scroll", tocListener, { passive: true });
    tocListener();
  }

  function initTocToggle() {
    const toc = document.getElementById("toc");
    const overlay = document.getElementById("tocOverlay");
    const button = document.getElementById("tocToggle");
    if (!toc || !overlay || !button) {
      return;
    }

    button.addEventListener("click", function () {
      toc.classList.toggle("open");
      overlay.classList.toggle("open");
    });
    overlay.addEventListener("click", function () {
      toc.classList.remove("open");
      overlay.classList.remove("open");
    });
  }

  function initBackToTop() {
    const button = document.getElementById("backToTop");
    if (!button) {
      return;
    }
    window.addEventListener("scroll", function () {
      button.classList.toggle("visible", window.scrollY > 300);
    }, { passive: true });
    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function loadSearchIndex() {
    if (!searchIndexPromise) {
      searchIndexPromise = fetch("/assets/search-index.json")
        .then(function (response) {
          if (!response.ok) {
            throw new Error("search index unavailable");
          }
          return response.json();
        })
        .catch(function () {
          return [];
        });
    }
    return searchIndexPromise;
  }

  function initSearch() {
    const input = document.getElementById("searchInput");
    const results = document.getElementById("searchResults");
    if (!input || !results) {
      return;
    }

    async function findPages(query) {
      const pages = await loadSearchIndex();
      const normalized = query.toLowerCase().trim();
      if (!normalized) {
        return [];
      }
      return pages.filter(function (page) {
        return page.title.toLowerCase().includes(normalized) ||
          page.desc.toLowerCase().includes(normalized);
      });
    }

    input.addEventListener("input", async function () {
      const query = input.value.trim();
      if (!query) {
        results.classList.remove("active");
        return;
      }

      const matches = await findPages(query);
      if (matches.length === 0) {
        results.innerHTML = '<div class="search-no-result">没有找到相关结果</div>';
      } else {
        results.innerHTML = matches.map(function (page) {
          return '<a href="' + page.url + '" class="search-result-item">' +
            '<div class="search-result-title">' + page.title + '</div>' +
            '<div class="search-result-desc">' + page.desc + '</div></a>';
        }).join("");
      }
      results.classList.add("active");
    });

    input.addEventListener("keydown", async function (event) {
      if (event.key !== "Enter") {
        return;
      }
      const matches = await findPages(input.value);
      if (matches[0]) {
        navigate(matches[0].url);
      }
    });

    document.addEventListener("click", function (event) {
      if (!event.target.closest(".search-box")) {
        results.classList.remove("active");
      }
    });
  }

  function ensureTwikoo() {
    if (!twikooPromise) {
      twikooPromise = new Promise(function (resolve, reject) {
        if (window.twikoo && typeof window.twikoo.init === "function") {
          resolve();
          return;
        }

        if (!document.querySelector('link[data-twikoo-css]')) {
          const stylesheet = document.createElement("link");
          stylesheet.rel = "stylesheet";
          stylesheet.href = "/assets/vendor/twikoo.css";
          stylesheet.dataset.twikooCss = "true";
          document.head.appendChild(stylesheet);
        }

        const script = document.createElement("script");
        script.src = "/assets/vendor/twikoo.min.js";
        script.onload = function () {
          if (window.twikoo && typeof window.twikoo.init === "function") {
            resolve();
          } else {
            reject(new Error("twikoo unavailable"));
          }
        };
        script.onerror = function () {
          reject(new Error("twikoo load failed"));
        };
        document.head.appendChild(script);
      });
    }
    return twikooPromise;
  }

  function activateComments() {
    if (commentsActivated) {
      return;
    }
    commentsActivated = true;
    initComments();
  }

  function initCommentLazyLoad() {
    const section = document.querySelector(".comments-section");
    if (!section) {
      return;
    }
    if (!("IntersectionObserver" in window)) {
      activateComments();
      return;
    }
    const observer = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          observer.disconnect();
          activateComments();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(section);
  }

  function resolveCommentContainer() {
    const section = document.querySelector(".comments-section");
    if (!section) {
      return null;
    }
    let container = document.getElementById("twikoo");
    if (!container) {
      container = document.createElement("div");
      container.id = "twikoo";
    }
    if (!section.contains(container)) {
      section.appendChild(container);
    }
    return container;
  }

  async function initComments() {
    const container = resolveCommentContainer();
    if (!container) {
      return;
    }

    try {
      await ensureTwikoo();
    } catch (error) {
      container.innerHTML =
        '<div class="comment-fallback">评论区加载失败，请刷新页面后重试。</div>';
      return;
    }

    try {
      if (typeof window.twikoo.destroy === "function") {
        window.twikoo.destroy(container);
      }
    } catch (error) {}
    container.innerHTML = "";
    const attempt = String(Date.now()) + Math.random();
    container.dataset.commentAttempt = attempt;
    const commentPath = window.location.pathname.endsWith("/index.html")
      ? window.location.pathname.slice(0, -"index.html".length)
      : window.location.pathname;
    try {
      const initialized = window.twikoo.init({
        envId: "https://taupe-zuccutto-aa14a0.netlify.app/.netlify/functions/twikoo",
        el: "#twikoo",
        path: commentPath,
        requiredMetaField: [],
        anonymousNickName: "匿名",
        commentPermission: "anyone"
      });
      if (initialized && typeof initialized.catch === "function") {
        initialized.catch(function () {
          container.innerHTML =
            '<div class="comment-fallback">评论区暂时不可用，请稍后重试。</div>';
        });
      }
      // Twikoo 用 Element UI 动态注入 CSS，优先级压过外部样式表，
      // 这里用内联 !important style 强制覆盖关键元素样式
      applyTwikooStyle(container);
    } catch (error) {
      container.innerHTML =
        '<div class="comment-fallback">评论区暂时不可用，请稍后重试。</div>';
    }
    window.setTimeout(function () {
      if (
        container.dataset.commentAttempt === attempt &&
        !container.innerHTML.trim()
      ) {
        container.innerHTML =
          '<div class="comment-fallback">评论区暂时不可用，请稍后重试。</div>';
      }
    }, 5000);
  }

  function applyTwikooStyle(container) {
    function set(el, prop, val) {
      if (el) el.style.setProperty(prop, val, "important");
    }
    function all(sel, fn) {
      container.querySelectorAll(sel).forEach(function (el) { fn(el); });
    }

    // 延迟执行，等 Twikoo 完成 DOM 渲染
    function run() {
      var root = document.getElementById("twikoo");
      if (!root) return;

      // 发送按钮：朱红色背景
      all(".el-button.tk-send", function (el) {
        set(el, "background", "var(--vermilion)");
        set(el, "border-color", "var(--vermilion)");
        set(el, "color", "#fff");
        set(el, "border-radius", "4px");
        set(el, "font-family", "var(--font-serif)");
        set(el, "font-size", "14px");
      });
      // 预览按钮
      all(".el-button.tk-preview", function (el) {
        set(el, "border-color", "var(--border)");
        set(el, "color", "var(--ink-light)");
        set(el, "border-radius", "4px");
        set(el, "font-family", "var(--font-serif)");
        set(el, "font-size", "14px");
      });
      // 输入框
      all(".tk-meta-input .el-input__inner", function (el) {
        set(el, "border-color", "var(--border)");
        set(el, "border-radius", "4px");
        set(el, "font-family", "var(--font-serif)");
        set(el, "font-size", "14px");
        set(el, "color", "var(--ink)");
        set(el, "background", "var(--paper)");
      });
      // 评论框
      all(".el-textarea__inner", function (el) {
        set(el, "border-color", "var(--border)");
        set(el, "border-radius", "4px");
        set(el, "font-family", "var(--font-serif)");
        set(el, "font-size", "14px");
        set(el, "color", "var(--ink)");
        set(el, "background", "var(--paper)");
        set(el, "line-height", "1.8");
      });
      // 前缀标签（昵称/邮箱/网址）
      all(".tk-meta-input .el-input-group__prepend", function (el) {
        set(el, "background", "var(--paper-dark)");
        set(el, "border-color", "var(--border)");
        set(el, "color", "var(--ink-light)");
        set(el, "font-family", "var(--font-serif)");
        set(el, "font-size", "13px");
      });
    }

    setTimeout(run, 50);
    setTimeout(run, 300);
  }

  function absolutizeCssUrls(css, sourceUrl) {
    return String(css).replace(
      /url\(\s*(["']?)(.*?)\1\s*\)/gi,
      function (match, quote, value) {
        const url = value.trim();
        if (
          !url ||
          url.startsWith("#") ||
          url.startsWith("/") ||
          url.startsWith("?") ||
          url.startsWith("data:") ||
          url.startsWith("var(") ||
          /^(?:https?:)?\/\//i.test(url)
        ) {
          return match;
        }
        try {
          return "url(" + quote + new URL(url, sourceUrl).href + quote + ")";
        } catch (error) {
          return match;
        }
      }
    );
  }

  function syncPageStyles(sourceDocument, sourceUrl) {
    document.querySelectorAll("style[data-page-style], link[data-page-style]").forEach(function (node) {
      node.remove();
    });
    sourceDocument.querySelectorAll("style[data-page-style], link[data-page-style]").forEach(function (node) {
      const clone = node.cloneNode(true);
      if (node.tagName === "STYLE") {
        clone.textContent = absolutizeCssUrls(node.textContent, sourceUrl);
      } else if (node.tagName === "LINK" && node.getAttribute("href")) {
        clone.href = new URL(node.getAttribute("href"), sourceUrl).href;
      }
      document.head.appendChild(clone);
    });
  }

  async function executePageScripts(sourceDocument, sourceUrl) {
    document.querySelectorAll("[data-page-script-runtime]").forEach(function (node) {
      node.remove();
    });

    for (const original of sourceDocument.querySelectorAll("[data-page-script]")) {
      if (original.src) {
        const source = new URL(original.getAttribute("src"), sourceUrl).href;
        if (loadedScripts.has(source)) {
          continue;
        }
        loadedScripts.add(source);
        await new Promise(function (resolve, reject) {
          const script = document.createElement("script");
          script.src = source;
          script.dataset.pageScriptRuntime = "true";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
        continue;
      }

      const script = document.createElement("script");
      script.dataset.pageScriptRuntime = "true";
      script.textContent = original.textContent;
      document.body.appendChild(script);
    }
  }

  async function fetchDocument(url) {
    const key = url.href;
    if (!cache.has(key)) {
      cache.set(key, fetch(url.href, {
        credentials: "same-origin",
        headers: { "X-Requested-With": "UEMWikiRouter" }
      }).then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.text();
      }));
    }
    const html = await cache.get(key);
    return new DOMParser().parseFromString(html, "text/html");
  }

  function scrollToHash(hash) {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) {
      target.scrollIntoView();
    }
  }

  async function navigate(target, options) {
    const settings = options || {};
    const url = target instanceof URL ? target : new URL(target, window.location.href);
    const current = new URL(window.location.href);

    if (!settings.force && url.pathname === current.pathname && url.search === current.search) {
      if (url.hash) {
        history.pushState({ url: url.href }, "", url.href);
        scrollToHash(url.hash);
      }
      return;
    }

    startProgress();
    const currentRequest = ++requestId;
    showLoading();
    if (pageContent) {
      pageContent.classList.add("is-loading");
      pageContent.setAttribute("aria-busy", "true");
    }

    try {
      const sourceDocument = await fetchDocument(url);
      const nextContent = sourceDocument.getElementById("page-content");
      if (!nextContent) {
        window.location.assign(url.href);
        return;
      }
      if (currentRequest !== requestId) {
        return;
      }

      syncPageStyles(sourceDocument, url);
      pageContent.innerHTML = nextContent.innerHTML;
      document.title = sourceDocument.title;
      if (settings.push !== false) {
        const targetModel = await resolveLocationModel(url.pathname);
        const currentState = history.state;
        const targetParentKey = targetModel.parent
          ? normalizePath(targetModel.parent.href)
          : null;
        const sameParent = Boolean(
          currentState &&
          currentState.uemWikiManaged &&
          currentState.parentKey &&
          targetParentKey &&
          currentState.parentKey === targetParentKey
        );
        history[sameParent ? "replaceState" : "pushState"](
          historyStateFor(url.href, targetModel),
          "",
          url.href
        );
      }
      updateSidebarActive(url.pathname);
      initToc();
      if (commentsActivated) {
        initComments();
      }
      await executePageScripts(sourceDocument, url);
      scrollToHash(url.hash);
    } catch (error) {
      window.location.assign(url.href);
    } finally {
      if (currentRequest === requestId) {
        pageContent.classList.remove("is-loading");
        pageContent.removeAttribute("aria-busy");
        hideLoading();
        finishProgress();
      }
    }
  }

  function initRouter() {
    document.addEventListener("click", function (event) {
      const anchor = event.target.closest("a[href]");
      if (!shouldHandleLink(anchor, event)) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      event.preventDefault();
      navigate(url);
    });

    document.addEventListener("mouseover", function (event) {
      const anchor = event.target.closest("a[href]");
      if (!shouldHandleLink(anchor, { button: 0, defaultPrevented: false })) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (!cache.has(url.href)) {
        fetchDocument(url).catch(function () {});
      }
    });

    window.addEventListener("popstate", function () {
      navigate(window.location.href, { push: false, force: true });
    });
  }

  async function init() {
    renderTopNavigation();
    initSidebarToggle();
    initTheme();
    initBackToTop();
    initTocToggle();
    initSearch();
    initRouter();
    await initSidebarNavigation();
    await initializeHistoryHierarchy();
    initToc();
    initCommentLazyLoad();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
