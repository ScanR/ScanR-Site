import { loadAllSeries, getStatusLabel, thumbUrl, normalizeText, joinVal } from "./common.js?v=3";

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("header-search-toggle");
  const panel = document.getElementById("header-search-panel");
  const form = panel?.querySelector(".search-form");
  const input = document.getElementById("header-search-input");
  const meta = panel?.querySelector(".search-results-meta");
  const results = panel?.querySelector(".search-results");

  if (!toggle || !panel || !form || !input || !meta || !results) return;

  const state = {
    allSeries: [],
    loading: false,
    loadingPromise: null,
    lastMatches: [],
  };

  const getSeriesHref = (serie) =>
    serie.urlSerie || (serie.slug ? `/${serie.slug}` : "#");

  const updateMeta = (message) => {
    meta.textContent = message;
  };

  const clearResults = () => {
    results.innerHTML = "";
  };

  const createEmptyState = (message) => {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.textContent = message;
    results.appendChild(empty);
  };

  const createResultItem = (serie) => {
    const link = document.createElement("a");
    link.className = "search-result-item";
    link.href = getSeriesHref(serie);

    const cover = document.createElement("div");
    cover.className = "search-result-cover";

    const img = document.createElement("img");
    if (serie.cover) {
      img.src = thumbUrl(serie.cover, 120);
      img.addEventListener("error", () => { img.src = serie.cover; }, { once: true });
    } else {
      img.src = "img/scanr-black.webp";
    }
    img.alt = `Couverture de ${serie.title}`;
    img.loading = "lazy";
    cover.appendChild(img);

    const body = document.createElement("div");
    body.className = "search-result-body";

    const title = document.createElement("div");
    title.className = "search-result-title";
    title.textContent = serie.title;

    const subtitle = document.createElement("div");
    subtitle.className = "search-result-subtitle";
    subtitle.textContent =
      joinVal(serie.author) ||
      joinVal(serie.artist) ||
      joinVal(serie.tags) ||
      "Série ScanR";

    const status = document.createElement("span");
    status.className = "search-result-status";
    status.textContent = getStatusLabel(serie);

    body.append(title, subtitle, status);
    link.append(cover, body);

    return link;
  };

  const renderMatches = (query = input.value) => {
    const trimmedQuery = query.trim();
    clearResults();

    if (!trimmedQuery) {
      state.lastMatches = [];
      updateMeta("Commencez à taper pour rechercher une série.");
      return;
    }

    if (state.loading) {
      updateMeta("Chargement des séries...");
      createEmptyState("Les séries sont en cours de chargement.");
      return;
    }

    const normalizedQuery = normalizeText(trimmedQuery);
    const matches = state.allSeries
      .map((serie) => {
        const title = normalizeText(serie.title);
        const authors = normalizeText(joinVal(serie.author));
        const artists = normalizeText(joinVal(serie.artist));
        const tags = normalizeText(joinVal(serie.tags));
        const haystack = `${title} ${authors} ${artists} ${tags}`;

        if (!haystack.includes(normalizedQuery)) return null;

        let score = 0;
        if (title === normalizedQuery) score += 100;
        if (title.startsWith(normalizedQuery)) score += 60;
        if (title.includes(normalizedQuery)) score += 30;
        if (authors.includes(normalizedQuery) || artists.includes(normalizedQuery)) {
          score += 12;
        }
        if (tags.includes(normalizedQuery)) score += 8;
        score -= title.length / 1000;

        return { score, serie };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.serie.title.localeCompare(b.serie.title))
      .slice(0, 8)
      .map(({ serie }) => serie);

    state.lastMatches = matches;

    if (!matches.length) {
      updateMeta(`Aucun résultat pour "${trimmedQuery}".`);
      createEmptyState("Essayez avec un autre titre, auteur ou tag.");
      return;
    }

    updateMeta(
      `${matches.length} résultat${matches.length > 1 ? "s" : ""} pour "${trimmedQuery}".`
    );
    matches.forEach((serie) => {
      results.appendChild(createResultItem(serie));
    });
  };

  const openPanel = async () => {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    updateMeta("Chargement des séries...");
    if (!state.allSeries.length && !state.loading) {
      await ensureSeriesLoaded();
    }
    renderMatches();
    requestAnimationFrame(() => input.focus());
  };

  const closePanel = () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  const togglePanel = async () => {
    if (panel.hidden) {
      await openPanel();
      return;
    }
    closePanel();
  };

  const ensureSeriesLoaded = async () => {
    if (state.allSeries.length) return state.allSeries;
    if (state.loadingPromise) return state.loadingPromise;

    state.loading = true;
    state.loadingPromise = (async () => {
      // Les séries cachées (Konami code) ne doivent pas apparaître dans la recherche
      state.allSeries = (await loadAllSeries()).filter((serie) => !serie.konami);
      return state.allSeries;
    })()
      .catch((error) => {
        console.error("Erreur de chargement de la recherche :", error);
        updateMeta("Impossible de charger les séries.");
        clearResults();
        createEmptyState("La recherche est indisponible pour le moment.");
        return [];
      })
      .finally(() => {
        state.loading = false;
        state.loadingPromise = null;
      });

    return state.loadingPromise;
  };

  toggle.addEventListener("click", () => {
    togglePanel();
  });

  input.addEventListener("focus", () => {
    if (!state.allSeries.length && !state.loading) {
      ensureSeriesLoaded().then(() => renderMatches());
    }
  });

  input.addEventListener("input", () => {
    renderMatches();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await ensureSeriesLoaded();
    renderMatches();
    if (state.lastMatches[0]) {
      window.location.href = getSeriesHref(state.lastMatches[0]);
    }
  });

  document.addEventListener("click", (event) => {
    if (!panel.hidden && !event.target.closest(".header-search")) {
      closePanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      closePanel();
      toggle.focus();
    }
  });
});
