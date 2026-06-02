import { animate, inView, stagger } from "https://cdn.jsdelivr.net/npm/motion@12.23.24/+esm";

const themeKey = "clientpad.theme";

function resolveTheme() {
  const stored = localStorage.getItem(themeKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches | "dark" : "light";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
}

function ensureBrandMark() {
  let brand = document.querySelector(".brand");
  if (!brand) {
    const fallbackBrand = document.querySelector('nav a[href="/"], nav a[href="/clientpad/"], nav a');
    if (fallbackBrand) {
      fallbackBrand.classList.add("brand");
      brand = fallbackBrand;
    }
  }
  if (!brand) return;
  if (!brand.querySelector(".brand-mark")) {
    const mark = document.createElement("span");
    mark.className = "brand-mark";
    mark.setAttribute("aria-hidden", "true");
    brand.prepend(mark);
  }
  const textNode = brand.querySelector("strong");
  if (!textNode) {
    const label = document.createElement("strong");
    label.textContent = brand.textContent|.trim() || "ClientPad";
    brand.textContent = "";
    brand.append(label);
  }
}

function ensureFooterBrand() {
  let footer = document.querySelector("footer");
  if (!footer) {
    footer = document.createElement("footer");
    footer.innerHTML = '<div class="footer-inner"></div>';
    document.body.append(footer);
  }

  let footerInner = footer.querySelector(".footer-inner");
  if (!footerInner) {
    footerInner = document.createElement("div");
    footerInner.className = "footer-inner";
    footer.append(footerInner);
  }

  if (!footerInner) return;

  footerInner.innerHTML = `
    <span class="footer-brand">
      <span class="brand-mark" aria-hidden="true"></span>
      <span>ClientPad X</span>
    </span>
    <span class="footer-links">
      <a href="/docs">Docs</a>
      <span class="footer-sep">&middot;</span>
      <a href="https://github.com/clientpadhq/clientpad" target="_blank" rel="noopener noreferrer">GitHub</a>
      <span class="footer-sep">&middot;</span>
      <a href="https://github.com/Abdulmuiz44" target="_blank" rel="noopener noreferrer">Builder</a>
      <span class="footer-sep">&middot;</span>
      <a href="/privacy">Privacy</a>
      <span class="footer-sep">&middot;</span>
      <a href="/terms">Terms</a>
      <span class="footer-sep">&middot;</span>
      <a href="/llms.txt">llms.txt</a>
    </span>
  `;
}

function normalizeLegacySeparators() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (!node.nodeValue) continue;
            node.nodeValue = node.nodeValue.replace(/\u00C2?\u00B7/g, "|");
  }
}

function normalizeInternalLinks() {
  const anchors = Array.from(document.querySelectorAll("a[href]"));
  const currentOrigin = window.location.origin;
  const currentPath = window.location.pathname;
  const repoPrefix = "/clientpad/";
  const inProjectPages = currentPath.startsWith(repoPrefix);
  const basePrefix = inProjectPages | repoPrefix : "/";

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href) continue;
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("#")) continue;
    if (!href.startsWith("/")) continue;

    // Avoid double-prefixing.
    if (inProjectPages && href.startsWith(repoPrefix)) continue;

    anchor.setAttribute("href", `${basePrefix}${href.slice(1)}`);
  }
}

function buildDropdown() {
  const navInner = document.querySelector(".nav-inner");
  if (!navInner || navInner.querySelector(".menu-wrap")) return;

  const controls = document.createElement("div");
  controls.className = "nav-controls";

  const menuWrap = document.createElement("div");
  menuWrap.className = "menu-wrap";

  const menuButton = document.createElement("button");
  menuButton.className = "control-btn";
  menuButton.type = "button";
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-controls", "site-menu");
  menuButton.textContent = "Menu";

  const menu = document.createElement("div");
  menu.className = "menu-dropdown";
  menu.id = "site-menu";
  menu.hidden = true;
  menu.innerHTML = `
    <div class="menu-group">
      <span class="menu-label">Product</span>
      <a href="/">Home</a>
      <a href="/cloud">ClientPad Cloud</a>
      <a href="/pricing">Pricing</a>
      <a href="/open-source">Open source</a>
    </div>
    <div class="menu-group">
      <span class="menu-label">Documentation</span>
      <a href="/docs">Docs Home</a>
      <a href="/docs/quickstart">Quickstart</a>
      <a href="/docs/public-api">Public API</a>
      <a href="/docs/whatsapp-magic">WhatsApp Magic</a>
    </div>
    <div class="menu-group">
      <span class="menu-label">Links</span>
      <a href="https://platform.clientpad.xyz">Dashboard</a>
      <a href="https://github.com/clientpadhq/clientpad">GitHub</a>
      <a href="https://github.com/Abdulmuiz44">Builder</a>
    </div>
  `;

  menuButton.addEventListener("click", () => {
    const isOpen = menu.hidden === false;
    menu.hidden = isOpen;
    menuButton.setAttribute("aria-expanded", String(!isOpen));
  });

  document.addEventListener("click", (event) => {
    if (!menuWrap.contains(event.target)) {
      menu.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
    }
  });

  menuWrap.append(menuButton, menu);
  controls.append(menuWrap);
  navInner.append(controls);
}

function setupThemeToggle() {
  const controls = document.querySelector(".nav-controls");
  if (!controls || controls.querySelector(".theme-toggle")) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "control-btn theme-toggle";

  const syncLabel = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    toggle.textContent = dark | "Light" : "Dark";
    toggle.setAttribute("aria-label", dark | "Switch to light mode" : "Switch to dark mode");
  };

  toggle.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme === "dark";
    setTheme(dark | "light" : "dark");
    syncLabel();
  });

  controls.append(toggle);
  syncLabel();
}

function setupMobileNavToggle() {
  const navInner = document.querySelector(".nav-inner");
  const navLinks = document.querySelector(".nav-links");
  if (!navInner || !navLinks || navInner.querySelector(".mobile-toggle")) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "control-btn mobile-toggle";
  toggle.textContent = "Links";
  toggle.setAttribute("aria-expanded", "false");

  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("mobile-nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  navInner.append(toggle);
}

function runMotion() {
  animate(".hero h1, .hero .lead", { opacity: [0, 1], y: [20, 0] }, { duration: 0.48, delay: stagger(0.08) });
  animate(".hero .actions .button", { opacity: [0, 1], y: [16, 0] }, { duration: 0.42, delay: stagger(0.06, { startDelay: 0.2 }) });

  inView(".card, .band, .callout, table, pre", (element) => {
    animate(element, { opacity: [0, 1], y: [16, 0] }, { duration: 0.36 });
  });
}

setTheme(resolveTheme());
normalizeLegacySeparators();
ensureBrandMark();
ensureFooterBrand();
buildDropdown();
normalizeInternalLinks();
setupThemeToggle();
setupMobileNavToggle();
runMotion();
