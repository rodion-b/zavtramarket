(() => {
  const STORAGE_KEY = "zavtramarket-lang";
  const toggle = document.getElementById("lang-toggle");
  const langNodes = document.querySelectorAll("[data-en]");
  const placeholderNodes = document.querySelectorAll("[data-en-placeholder]");

  function applyLang(lang) {
    document.documentElement.lang = lang;
    langNodes.forEach((node) => {
      node.textContent = node.dataset[lang === "ru" ? "ru" : "en"];
    });
    placeholderNodes.forEach((node) => {
      node.setAttribute(
        "placeholder",
        node.dataset[lang === "ru" ? "ruPlaceholder" : "enPlaceholder"]
      );
    });
    toggle.textContent = lang === "ru" ? "EN" : "RU";
    toggle.setAttribute("aria-label", lang === "ru" ? "Switch to English" : "Переключить на русский");
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* private mode or storage blocked — non-fatal */
    }
  }

  let currentLang = "en";
  try {
    currentLang = localStorage.getItem(STORAGE_KEY) || "en";
  } catch (e) {
    /* private mode or storage blocked — non-fatal */
  }
  applyLang(currentLang);

  toggle.addEventListener("click", () => {
    currentLang = currentLang === "ru" ? "en" : "ru";
    applyLang(currentLang);
  });

  const form = document.getElementById("waitlist-form");
  const emailInput = document.getElementById("email");
  const message = document.getElementById("form-message");

  const MESSAGES = {
    success: { en: "You're on the list. See you soon.", ru: "Вы в списке. До скорой встречи." },
    invalid: { en: "Enter a valid email address.", ru: "Введите корректный адрес почты." },
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValid) {
      message.textContent = MESSAGES.invalid[currentLang];
      message.className = "form-message error";
      return;
    }

    // TODO: wire this up to a real waitlist backend (e.g. Formspree,
    // Mailchimp, ConvertKit, or a Supabase table) before launch.
    // For now this only confirms locally — no email is actually stored.
    message.textContent = MESSAGES.success[currentLang];
    message.className = "form-message success";
    form.reset();
  });
})();
