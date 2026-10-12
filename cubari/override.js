// Overrides du lecteur Cubari servi sous teamscanr.fr (injecté par le Worker Cloudflare,
// avec override.css). Cubari ne remet pas le titre de l'onglet à jour en changeant de chapitre.
(() => {
  const SITE_NAME = "ScanR";

  const updateTitle = () => {
    try {
      const series = Reader.current && Reader.current.title;
      const chapter = Reader.SCP && Reader.SCP.chapter;
      if (series && chapter !== undefined) {
        document.title = `${series} | Chapitre ${chapter} | ${SITE_NAME}`;
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
