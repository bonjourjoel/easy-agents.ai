// ---- Scroll reveal ----

(function () {
  var elements = document.querySelectorAll(".reveal");

  // Older browsers still need the content to appear immediately even when the
  // progressive entrance animation cannot be observed.
  if (!window.IntersectionObserver) {
    elements.forEach(function (element) {
      element.classList.add("visible");
    });
    return;
  }

  // The observer only exists to trigger a subtle entrance animation once per element.
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
  );

  elements.forEach(function (element) {
    observer.observe(element);
  });
})();

// ---- Shared header runtime contract ----

const SITE_NAV_MOBILE_QUERY = "(max-width: 600px)";
const DEFAULT_SITE_NAV_BACKGROUND = "rgba(11,11,11,0.88)";
const SCROLLED_SITE_NAV_BACKGROUND = "rgba(11,11,11,0.97)";
const OPEN_SITE_NAV_BACKGROUND = "rgba(11,11,11,0.98)";

/**
 * Returns whether the mirrored AICode header should switch to its mobile fullscreen sheet.
 */
function isSiteNavMobile() {
  return window.matchMedia(SITE_NAV_MOBILE_QUERY).matches;
}

/**
 * Computes the correct shared-header background for the current scroll and mobile-menu state.
 */
function computeSiteNavBackground(nav) {
  if (!nav) {
    return DEFAULT_SITE_NAV_BACKGROUND;
  }

  // The mobile fullscreen sheet needs an opaque header cap so the burger stays
  // readable while the open sheet animates underneath it.
  if (nav.classList.contains("is-mobile-nav-open")) {
    return OPEN_SITE_NAV_BACKGROUND;
  }

  return window.scrollY > 40
    ? SCROLLED_SITE_NAV_BACKGROUND
    : DEFAULT_SITE_NAV_BACKGROUND;
}

/**
 * Reapplies the shared-header background after scroll or mobile-menu state changes.
 */
function syncSiteNavBackground() {
  var nav =
    document.querySelector(".site-nav") || document.querySelector("nav");

  if (!nav) {
    return;
  }

  nav.style.background = computeSiteNavBackground(nav);
}

(function () {
  syncSiteNavBackground();
  window.addEventListener("scroll", syncSiteNavBackground, { passive: true });
})();

// ---- Lang utils ----
// The shared shell links are already rewritten at build time. Runtime language
// logic must therefore stay local to the EasyAgents domain only.

const SUPPORTED_LANGS = ["en", "fr"];
const DEFAULT_LANG = "en";

/**
 * Reads the language prefix from the current URL.
 * The public-site contract uses `/fr/` for French and the root path for English.
 */
function getLangFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);

  return parts.length > 0 && SUPPORTED_LANGS.includes(parts[0])
    ? parts[0]
    : null;
}

/**
 * Returns the last language explicitly selected by the visitor, if any.
 * Invalid values are ignored so the local router stays deterministic.
 */
function getStoredLangOverride() {
  const storedLang = localStorage.getItem("lang-override");

  return SUPPORTED_LANGS.includes(storedLang) ? storedLang : null;
}

/**
 * Preserves the raw served suffix so redirects stay on the exact same URL shape.
 */
function getPathWithoutLangSuffix() {
  const pathname = window.location.pathname || "/";
  const currentLang = getLangFromPath();

  if (currentLang === null) {
    return pathname;
  }

  const prefix = "/" + currentLang;
  const suffix = pathname.slice(prefix.length);

  return suffix.length > 0 ? suffix : "/";
}

/**
 * Rebuilds the target URL for a given language while preserving the current path suffix.
 */
function buildLocalizedPath(lang, pathWithoutLangSuffix) {
  const suffix = pathWithoutLangSuffix || "/";
  const localizedPath =
    lang === DEFAULT_LANG
      ? suffix
      : "/" + lang + (suffix === "/" ? "/" : suffix);

  return localizedPath + window.location.search + window.location.hash;
}

/**
 * Switches between the root English page and the generated `/fr/` page on the current domain.
 */
function switchLang(select) {
  localStorage.setItem("lang-override", select.value);

  const pathWithoutLangSuffix = getPathWithoutLangSuffix();
  const newPath = buildLocalizedPath(select.value, pathWithoutLangSuffix);

  window.location.href = newPath;
}

// ---- Auto lang redirect ----

(function () {
  const currentLang = getLangFromPath();
  const pathWithoutLangSuffix = getPathWithoutLangSuffix();
  const storedLang = getStoredLangOverride();

  // An explicit language segment in the destination URL must win over stale
  // domain-local storage. This keeps translated inter-domain links stable.
  if (currentLang !== null) {
    if (storedLang !== currentLang) {
      localStorage.setItem("lang-override", currentLang);
    }
    return;
  }

  // A manual selection must stay pinned across every later visit, including
  // plain home links that route back through the canonical English root.
  if (storedLang !== null) {
    const desiredStoredPath = buildLocalizedPath(
      storedLang,
      pathWithoutLangSuffix,
    );
    const currentFullPath =
      window.location.pathname + window.location.search + window.location.hash;

    if (desiredStoredPath === currentFullPath) {
      return;
    }

    window.location.replace(desiredStoredPath);
    return;
  }

  const browserLang = (navigator.language || "").slice(0, 2).toLowerCase();

  if (browserLang === DEFAULT_LANG || !SUPPORTED_LANGS.includes(browserLang)) {
    return;
  }

  window.location.replace(
    buildLocalizedPath(browserLang, pathWithoutLangSuffix),
  );
})();

// ---- Lang switcher init ----

/**
 * Keeps the shared language selector synchronized with the effective EasyAgents locale.
 */
function initLangSelect() {
  const select = document.querySelector(".lang-switcher select");

  if (!select) {
    return;
  }

  select.value = getStoredLangOverride() || getLangFromPath() || DEFAULT_LANG;
}

// ---- Mobile nav fullscreen sheet ----

/**
 * Wires the shared mobile burger to the fullscreen header sheet without duplicating
 * the language selector or the nav links in the DOM.
 */
function initMobileNav() {
  var nav =
    document.querySelector(".site-nav") || document.querySelector("nav");

  if (!nav) {
    return;
  }

  var toggle = nav.querySelector("[data-nav-toggle]");
  var panel = nav.querySelector("[data-nav-panel]");

  if (!toggle || !panel) {
    return;
  }

  /**
   * Keeps ARIA state, body scroll locking, and header background aligned with the
   * actual mobile-sheet state after every interaction and resize.
   */
  function syncMobileNavState() {
    var isMobile = isSiteNavMobile();

    // Resizing back to desktop must always tear the mobile state down because the
    // desktop header reuses the same DOM nodes inline.
    if (!isMobile && nav.classList.contains("is-mobile-nav-open")) {
      nav.classList.remove("is-mobile-nav-open");
    }

    var isOpen = isMobile && nav.classList.contains("is-mobile-nav-open");
    var openLabel =
      toggle.getAttribute("data-label-open") || "Open mobile menu";
    var closeLabel =
      toggle.getAttribute("data-label-close") || "Close mobile menu";

    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.setAttribute("aria-label", isOpen ? closeLabel : openLabel);
    panel.setAttribute("aria-hidden", isMobile ? String(!isOpen) : "false");
    document.body.classList.toggle("has-mobile-nav-open", isOpen);
    syncSiteNavBackground();
  }

  toggle.addEventListener("click", function () {
    if (!isSiteNavMobile()) {
      return;
    }

    nav.classList.toggle("is-mobile-nav-open");
    syncMobileNavState();
  });

  panel.addEventListener("click", function (event) {
    var navLink = event.target.closest(".nav-links a");

    if (!navLink || !isSiteNavMobile()) {
      return;
    }

    // Same-page anchors do not reload the document, so the mobile sheet must close
    // immediately after the tap to reveal the destination section.
    nav.classList.remove("is-mobile-nav-open");
    syncMobileNavState();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
      return;
    }

    if (!nav.classList.contains("is-mobile-nav-open")) {
      return;
    }

    nav.classList.remove("is-mobile-nav-open");
    syncMobileNavState();
  });

  window.addEventListener("resize", syncMobileNavState);
  syncMobileNavState();
}

document.addEventListener("DOMContentLoaded", function () {
  initLangSelect();
  initMobileNav();
});
