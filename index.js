// ---- Scroll reveal ----

(function () {
  var els = document.querySelectorAll(".reveal");

  // Older browsers simply show the content immediately when IntersectionObserver is unavailable.
  if (!window.IntersectionObserver) {
    els.forEach(function (el) {
      el.classList.add("visible");
    });
    return;
  }

  // The observer only exists to trigger a subtle entrance animation once per element.
  var obs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
  );

  els.forEach(function (el) {
    obs.observe(el);
  });
})();

// ---- Sticky nav background on scroll ----

(function () {
  var nav = document.querySelector(".site-nav");

  // The guard keeps the script harmless if the markup is loaded partially during future refactors.
  if (!nav) {
    return;
  }

  window.addEventListener(
    "scroll",
    function () {
      // The darker state improves contrast once content starts scrolling under the fixed bar.
      nav.style.background =
        window.scrollY > 40 ? "rgba(11,11,11,0.97)" : "rgba(11,11,11,0.88)";
    },
    { passive: true },
  );
})();

// ---- Lang utils ----

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
 * Invalid values are ignored so the public-site router stays deterministic.
 */
function getStoredLangOverride() {
  const storedLang = localStorage.getItem("lang-override");

  return SUPPORTED_LANGS.includes(storedLang) ? storedLang : null;
}

/**
 * Preserves the raw served suffix so later redirects stay on the exact same
 * URL shape (`/`, `/fr/`, `/services/`, `/index.html`, etc.).
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
 * Rebuilds the target URL for a given language while preserving the current
 * path suffix, query string, and anchor fragment.
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
 * Switches between the root English page and the generated `/fr/` page.
 * The suffix after the language prefix is preserved so the logic stays reusable.
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

  // A manual selection must stay pinned across every later visit, including
  // plain home links that route back through the canonical English root.
  if (storedLang !== null) {
    const desiredStoredPath = buildLocalizedPath(
      storedLang,
      pathWithoutLangSuffix,
    );
    const currentFullPath =
      window.location.pathname + window.location.search + window.location.hash;

    // The English locale stays on the canonical root path without a prefix, so the
    // pinned-language guard must compare full URLs rather than the raw prefix marker.
    if (desiredStoredPath === currentFullPath) {
      return;
    }

    window.location.replace(desiredStoredPath);
    return;
  }

  // Without an explicit preference, only prefix-less URLs may be redirected
  // according to browser language detection.
  if (currentLang !== null) {
    return;
  }

  const browserLang = (navigator.language || "").slice(0, 2).toLowerCase();

  // Only supported non-default languages should redirect away from the canonical root path.
  if (browserLang === DEFAULT_LANG || !SUPPORTED_LANGS.includes(browserLang)) {
    return;
  }

  window.location.replace(
    buildLocalizedPath(browserLang, pathWithoutLangSuffix),
  );
})();

// ---- Lang switcher init ----

document.addEventListener("DOMContentLoaded", function () {
  // The select is synchronized after the redirect logic so the UI always reflects the effective page language.
  const sel = document.querySelector(".lang-switcher select");
  if (sel) {
    sel.value = getStoredLangOverride() || getLangFromPath() || DEFAULT_LANG;
  }
});
