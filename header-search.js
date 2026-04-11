let CONFIG;

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

  const normalizeText = (value = "") =>
    value
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const joinValue = (value) => {
    if (Array.isArray(value)) return value.join(", ");
    return value || "";
  };

  const getStatusLabel = (serie) => {
    if (serie.os) return "One-shot";
    return serie.completed ? "Terminée" : "En cours";
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
    img.src = serie.cover || "img/scanr-black.webp";
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
      joinValue(serie.author) ||
      joinValue(serie.artist) ||
      joinValue(serie.tags) ||
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
        const authors = normalizeText(joinValue(serie.author));
        const artists = normalizeText(joinValue(serie.artist));
        const tags = normalizeText(joinValue(serie.tags));
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

  const loadConfig = async () => {
    if (CONFIG) return CONFIG;

    const dev = await fetch("./config-dev.json");
    if (dev.status === 404) {
      CONFIG = await fetch("./config.json").then((res) => res.json());
    } else {
      CONFIG = await dev.json();
    }

    return CONFIG;
  };

  const waitForSharedSeries = (timeoutMs = 1200) =>
    new Promise((resolve) => {
      if (Array.isArray(window.__SCANR_SERIES__) && window.__SCANR_SERIES__.length) {
        resolve(window.__SCANR_SERIES__);
        return;
      }

      let resolved = false;

      const cleanup = () => {
        window.removeEventListener("scanr:series-ready", onSeriesReady);
        clearTimeout(timeoutId);
      };

      const onSeriesReady = (event) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(event.detail);
      };

      const timeoutId = window.setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(null);
      }, timeoutMs);

      window.addEventListener("scanr:series-ready", onSeriesReady, { once: true });
    });

  const fetchSeries = async () => {
    const config = await loadConfig();
    const allSerie = await fetch(`${config.URL_CDN}index.json`).then((res) => res.json());
    const seriesPromises = Object.entries(allSerie).map(async ([slug, fileName]) => {
      const serie = await fetch(`${config.URL_CDN}${fileName}`).then((res) => res.json());
      serie.slug = serie.slug || slug;
      serie.urlSerie = `/${slug}`;
      return serie;
    });

    return Promise.all(seriesPromises);
  };

  const ensureSeriesLoaded = async () => {
    if (state.allSeries.length) return state.allSeries;
    if (state.loadingPromise) return state.loadingPromise;

    state.loading = true;
    state.loadingPromise = (async () => {
      const sharedSeries = await waitForSharedSeries();
      const allSeries = sharedSeries?.length ? sharedSeries : await fetchSeries();
      state.allSeries = allSeries.map((serie) => ({
        ...serie,
        slug: serie.slug || serie.urlSerie?.replace(/^\//, ""),
        urlSerie: getSeriesHref(serie),
      }));
      window.__SCANR_SERIES__ = state.allSeries;
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
