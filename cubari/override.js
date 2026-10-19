// Overrides du lecteur Cubari servi sous teamscanr.fr (injecté par le Worker Cloudflare,
// avec override.css). Cubari ne remet pas le titre de l'onglet à jour en changeant de chapitre.
// On y enregistre aussi la progression de lecture, lue par le bouton « Continuer » de la fiche série.
(() => {
  const SITE_NAME = "ScanR";
  // Même clé que common.js : { [slug]: { chapter, page, read: [chapitres ouverts], at } }
  const PROGRESS_KEY = "scanr-progress";

  const saveProgress = (slug, chapter) => {
    try {
      const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      const entry = all[slug] || { read: [] };
      entry.chapter = String(chapter);
      entry.page = (Number(Reader.SCP.page) || 0) + 1;
      entry.at = Date.now();
      if (!entry.read.includes(entry.chapter)) entry.read.push(entry.chapter);
      all[slug] = entry;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    } catch {
      // localStorage indisponible (navigation privée, quota…)
    }
  };

  const updateTitle = () => {
    try {
      const series = Reader.current && Reader.current.title;
      const chapter = Reader.SCP && Reader.SCP.chapter;
      if (series && chapter !== undefined) {
        document.title = `${series} | Chapitre ${chapter} | ${SITE_NAME}`;
        if (Reader.current.slug) saveProgress(Reader.current.slug, chapter);
      }
    } catch {
      // Reader pas encore prêt
    }
  };

  // Cubari change l'URL via pushState/replaceState puis écrit son propre titre : on repasse après.
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      setTimeout(updateTitle, 0);
      return result;
    };
  }
  window.addEventListener("popstate", () => setTimeout(updateTitle, 0));
  updateTitle();

  // Couleurs du site (style.css) à la place des thèmes « Cubari » (par défaut) et « Light ».
  // Cubari applique ses thèmes en JS (styles inline sur <html>) : on intercepte ThemeManager.setTheme.
  // Arguments : (interface, fond du lecteur, accent, texte), comme les thèmes de Cubari.
  const THEMES = {
    "#28292B": ["#1e2024", "#15171a", "#8f9aff", "#eceff4"], // Cubari → ScanR sombre
    "#F1F4FF": ["#ffffff", "#f7f8fc", "#745cf7", "#222831"], // Light → ScanR clair
  };
  try {
    const setTheme = ThemeManager.setTheme;
    ThemeManager.setTheme = (sidebar, ...rest) => {
      const theme = Settings.get("thm.theme") === "Custom" ? null : THEMES[sidebar];
      setTheme(...(theme || [sidebar, ...rest]));
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.content = theme ? theme[0] : sidebar;
      });
    };
    ThemeManager.themeUpdated();
  } catch {
    // Lecteur Cubari modifié : on garde ses couleurs
  }
})();
