import { animate, inView, stagger } from "https://cdn.jsdelivr.net/npm/motion@12.23.24/+esm";

const themeKey = "clientpad.theme";

function resolveTheme() {
  const stored = localStorage.getItem(themeKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
}

function ensureBrandMark() {
  const brand = document.querySelector(".brand");
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
    label.textContent = brand.textContent?.trim() || "ClientPad";
    brand.textContent = "";
    brand.append(label);
  }
}

function ensureFooterBrand() {
  const footerInner = document.querySelector(".footer-inner");
  if (!footerInner) return;
  const first = footerInner.querySelector("span");
  if (!first || footerInner.querySelector(".footer-brand")) return;
  const wrapper = document.createElement("span");
  wrapper.className = "footer-brand";
  wrapper.innerHTML = '<span class="brand-mark" aria-hidden="true"></span><span>ClientPad</span>';
  first.prepend(wrapper);
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
      <a href="/clientpad/">Home</a>
      <a href="/clientpad/cloud">ClientPad Cloud</a>
      <a href="/clientpad/pricing">Pricing</a>
      <a href="/clientpad/open-source">Open source</a>
    </div>
    <div class="menu-group">
      <span class="menu-label">Documentation</span>
      <a href="/clientpad/docs">Docs Home</a>
      <a href="/clientpad/docs/quickstart">Quickstart</a>
      <a href="/clientpad/docs/public-api">Public API</a>
      <a href="/clientpad/docs/whatsapp-magic">WhatsApp Magic</a>
    </div>
    <div class="menu-group">
      <span class="menu-label">Links</span>
      <a href="https://app.clientpad.xyz">Dashboard</a>
      <a href="https://github.com/clientpadhq/clientpad">GitHub</a>
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
    toggle.textContent = dark ? "Light" : "Dark";
    toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  };

  toggle.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme === "dark";
    setTheme(dark ? "light" : "dark");
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
ensureBrandMark();
ensureFooterBrand();
buildDropdown();
setupThemeToggle();
setupMobileNavToggle();
runMotion();
