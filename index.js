// ---- Email helpers ----

/**
 * Builds the public contact address without storing the full email verbatim in the HTML.
 * This mirrors the anti-scraping pattern already used on the other public sites.
 */
function getFullEmail() {
  var user = "joel";
  var domain = "aisovereignlabs";
  var tld = "ai";
  return user + "@" + domain + "." + tld;
}

/**
 * Reveals every contact entry point on first click so the page never ends up with mixed states.
 * After the first reveal, the browser can handle the mailto link normally.
 */
function handleContactClick(event) {
  var fullAddress = getFullEmail();
  var el = event.currentTarget;

  if (el.dataset.revealed === "1") {
    return;
  }

  if (event) {
    event.preventDefault();
  }

  var anchors = ["#nav-contact", "#service-contact", "#footer-contact"];

  anchors.forEach(function (sel) {
    // Each selector is optional so the helper stays resilient if the markup evolves later.
    var target = document.querySelector(sel);
    if (!target) {
      return;
    }

    // The revealed state must update both the destination and the visible label.
    target.href = "mailto:" + fullAddress;
    target.textContent = fullAddress;
    target.dataset.revealed = "1";
  });
}

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
 * Switches between the root English page and the generated `/fr/` page.
 * The suffix after the language prefix is preserved so the logic stays reusable.
 */
function switchLang(select) {
  localStorage.setItem("lang-override", select.value);

  const parts = window.location.pathname.split("/").filter(Boolean);
  const hasLang = parts.length > 0 && SUPPORTED_LANGS.includes(parts[0]);
  const pathWithoutLang = hasLang ? parts.slice(1) : parts;
  const suffix =
    pathWithoutLang.length > 0 ? "/" + pathWithoutLang.join("/") : "/";
  const newPath =
    select.value === DEFAULT_LANG ? suffix : "/" + select.value + suffix;

  window.location.href = newPath;
}

// ---- Auto lang redirect ----

(function () {
  // A language prefix already present in the URL always wins.
  if (getLangFromPath() !== null) {
    return;
  }

  // An explicit English override must keep the user on the root page.
  if (localStorage.getItem("lang-override") === DEFAULT_LANG) {
    return;
  }

  const browserLang = (navigator.language || "").slice(0, 2).toLowerCase();

  // Only supported non-default languages should redirect away from the canonical root path.
  if (browserLang === DEFAULT_LANG || !SUPPORTED_LANGS.includes(browserLang)) {
    return;
  }

  window.location.replace("/" + browserLang + "/");
})();

// ---- Lang switcher init ----

document.addEventListener("DOMContentLoaded", function () {
  // The select is synchronized after the redirect logic so the UI always reflects the effective page language.
  const sel = document.querySelector(".lang-switcher select");
  if (sel) {
    sel.value = getLangFromPath() || DEFAULT_LANG;
  }
});
