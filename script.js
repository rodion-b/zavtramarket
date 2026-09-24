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

  // Renders a string, replacing each {logo} with the :З brand face in the
  // logo's gradient. The colon is hidden from screen readers so the word
  // is still announced normally.
  function renderText(node, text) {
    const parts = text.split("{logo}");
    node.textContent = parts[0];
    parts.slice(1).forEach((part) => {
      const colon = document.createElement("span");
      colon.setAttribute("aria-hidden", "true");
      colon.textContent = ":";
      const mark = document.createElement("span");
      mark.className = "logo-text";
      mark.append(colon, "З");
      // Keep the mark glued to the rest of its word so it never wraps alone.
      const [rest, ...after] = part.split(" ");
      const word = document.createElement("span");
      word.className = "nowrap";
      word.append(mark, rest);
      node.append(word, after.length ? " " + after.join(" ") : "");
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
