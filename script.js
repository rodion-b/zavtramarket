(() => {
  const form = document.getElementById("waitlist-form");
  const emailInput = document.getElementById("email");
  const message = document.getElementById("form-message");

  const STORAGE_KEY = "zavtramarket-lang";
  const { languages, defaultLang, strings } = window.I18N;
  const codes = languages.map((l) => l.code);
  const switcher = document.getElementById("lang-switcher");
  const textNodes = document.querySelectorAll("[data-i18n]");
  const ariaNodes = document.querySelectorAll("[data-i18n-aria]");

  const buttons = languages.map(({ code, label, name }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lang-option";
    button.lang = code;
    button.textContent = label;
    button.title = name;
    button.setAttribute("aria-label", name);
    button.addEventListener("click", () => applyLang(code));
    switcher.appendChild(button);
    return button;
  });

  function t(key) {
    return strings[key][currentLang];
  }

  // Renders a string, wrapping {hl}…{/hl} in the brand gradient.
  function renderText(node, text) {
    node.textContent = "";
    text.split(/\{hl\}(.*?)\{\/hl\}/).forEach((part, i) => {
      if (i % 2) {
        const hl = document.createElement("span");
        hl.className = "logo-text";
        hl.textContent = part;
        node.append(hl);
      } else {
        node.append(part);
      }
    });
  }

  function applyLang(lang) {
    currentLang = codes.includes(lang) ? lang : defaultLang;
    document.documentElement.lang = currentLang;
    document.title = t("title");
    textNodes.forEach((node) => {
      renderText(node, t(node.dataset.i18n));
    });
    ariaNodes.forEach((node) => {
      node.setAttribute("aria-label", t(node.dataset.i18nAria));
    });
    switcher.setAttribute("aria-label", t("langSwitcher"));
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.lang === currentLang));
    });
    message.textContent = "";
    try {
      localStorage.setItem(STORAGE_KEY, currentLang);
    } catch (e) {
      /* private mode or storage blocked — non-fatal */
    }
  }

  let currentLang = defaultLang;
  try {
    currentLang = localStorage.getItem(STORAGE_KEY) || defaultLang;
  } catch (e) {
    /* private mode or storage blocked — non-fatal */
  }
  applyLang(currentLang);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValid) {
      message.textContent = t("formInvalid");
      message.className = "form-message error";
      return;
    }

    // TODO: wire this up to a real waitlist backend (e.g. Formspree,
    // Mailchimp, ConvertKit, or a Supabase table) before launch.
    // For now this only confirms locally — no email is actually stored.
    message.textContent = t("formSuccess");
    message.className = "form-message success";
    form.reset();
  });
})();
