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
})();
