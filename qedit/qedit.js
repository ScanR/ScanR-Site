const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const select = (selector) => document.querySelector(selector);

const initHome = () => {
  const form = select("#qedit-form");
  if (!form) return;

  const input = select("#qedit-id-input");
  const button = select("#qedit-open");

  const goTo = () => {
    const value = (input?.value || "").trim();
    if (/^[0-9]{8}$/.test(value)) {
      window.location.href = `/qedit/${value}/`;
    } else {
      input?.focus();
      input?.classList.add("shake");
      setTimeout(() => input?.classList.remove("shake"), 450);
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    goTo();
  });
  button?.addEventListener("click", goTo);
};

const initViewer = async () => {
  const root = document.body;
  if (!root || root.dataset.page !== "viewer") return;

  const rail = select("#page-rail");
  const canvas = select("#viewer-canvas");
  const baseImg = canvas?.querySelector("[data-img='original']");
  const qeditImg = canvas?.querySelector("[data-img='qedit']");
  const pageLabel = select("#page-label");
  const viewerStatus = select("#viewer-status");
  const badgeSide = select("#badge-side");
  const albumOriginal = select("#badge-original");
  const albumQedit = select("#badge-qedit");
  const badgePages = select("#badge-pages");
  const badgeCreated = select("#badge-created");
  const titleNode = select("#qedit-title");
  const descriptionNode = select("#qedit-description");
  const idNode = select("#qedit-id");
  const copyBtn = select("#copy-link");
  const nextBtn = select("[data-action='next']");
  const prevBtn = select("[data-action='prev']");
  const fullscreenBtn = select("#fullscreen-toggle");
  const zoomOutBtn = select("#zoom-out");
  const zoomInBtn = select("#zoom-in");
  const zoomResetBtn = select("#zoom-reset");

  const state = {
    pages: [],
    index: 0,
    showing: "qedit",
    zoom: 1,
  };

  const applyZoom = () => {
    const clamped = Math.min(2.5, Math.max(0.6, state.zoom));
    state.zoom = clamped;
    canvas?.style.setProperty("--zoom", clamped.toFixed(2));
    if (zoomResetBtn) {
      zoomResetBtn.textContent = `${Math.round(clamped * 100)}%`;
    }
  };

  const renderImages = () => {
    const page = state.pages[state.index];
    if (!page) return;

    const { original, qedit, label, index } = page;
    if (baseImg) baseImg.src = original;
    if (qeditImg) qeditImg.src = qedit;

    const showQedit = state.showing === "qedit";
    baseImg?.classList.toggle("hidden", showQedit);
    qeditImg?.classList.toggle("hidden", !showQedit);

    if (pageLabel) pageLabel.textContent = `Page ${index}`;
    if (viewerStatus) {
      viewerStatus.textContent = `Page ${index}/${state.pages.length}${label ? ` • ${label}` : ""}`;
    }
    if (badgeSide) {
      badgeSide.textContent = state.showing === "qedit" ? "Vue : QEdit" : "Vue : Original";
    }

    if (rail) {
      rail.querySelectorAll(".page-chip").forEach((chip, chipIndex) => {
        chip.classList.toggle("active", chipIndex === state.index);
      });
    }
  };

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(index, state.pages.length - 1));
    state.index = clamped;
    renderImages();
  };

  const toggleImage = () => {
    state.showing = state.showing === "qedit" ? "original" : "qedit";
    renderImages();
  };

  const next = () => goTo(state.index + 1);
  const prev = () => goTo(state.index - 1);

  try {
    const response = await fetch("./data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Impossible de charger les données du comparateur.");
    const data = await response.json();
    state.pages = Array.isArray(data.pages) ? data.pages : [];
    state.showing = "qedit";

    document.title = data.title ? `${data.title} • QEdit` : "Comparateur QEdit";
    titleNode && (titleNode.textContent = data.title || "Comparateur QEdit");
    descriptionNode &&
      (descriptionNode.textContent =
        data.description || "Compare rapidement les pages QEdit et la version d'origine. Clique pour permuter entre les deux.");
    idNode && (idNode.textContent = data.id || "—");
    badgePages && (badgePages.textContent = `${state.pages.length} pages`);
    badgeCreated && data.createdAt && (badgeCreated.textContent = formatDate(data.createdAt));

    if (albumOriginal && data.albums?.original?.url) {
      albumOriginal.href = data.albums.original.url;
    }
    if (albumQedit && data.albums?.qedit?.url) {
      albumQedit.href = data.albums.qedit.url;
    }

    if (!state.pages.length) {
      const viewerWrapper = select("#viewer-wrapper");
      if (viewerWrapper) {
        viewerWrapper.innerHTML = `<div class="empty">Aucune page à afficher pour ce comparateur.</div>`;
      }
      return;
    }

    if (rail) {
      rail.innerHTML = "";
      state.pages.forEach((page, idx) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "page-chip";
        button.innerHTML = `
          <div>
            <div>Page ${page.index}</div>
            ${page.label ? `<div class="label">${page.label}</div>` : ""}
          </div>
          <div class="label">Switch</div>
        `;
        button.addEventListener("click", () => goTo(idx));
        rail.appendChild(button);
      });
    }

    applyZoom();
    goTo(0);
  } catch (error) {
    const viewerWrapper = select("#viewer-wrapper");
    if (viewerWrapper) {
      viewerWrapper.innerHTML = `<div class="empty">⚠️ ${error.message}</div>`;
    }
    return;
  }

  canvas?.addEventListener("click", toggleImage);

  nextBtn?.addEventListener("click", next);
  prevBtn?.addEventListener("click", prev);

  fullscreenBtn?.addEventListener("click", () => {
    document.body.classList.toggle("qedit-full");
    fullscreenBtn.textContent = document.body.classList.contains("qedit-full") ? "Quitter plein écran" : "Plein écran";
  });

  zoomOutBtn?.addEventListener("click", () => {
    state.zoom -= 0.1;
    applyZoom();
  });
  zoomInBtn?.addEventListener("click", () => {
    state.zoom += 0.1;
    applyZoom();
  });
  zoomResetBtn?.addEventListener("click", () => {
    state.zoom = 1;
    applyZoom();
  });

  document.addEventListener("keydown", (event) => {
    const tagName = ((event.target && event.target.tagName) || "").toLowerCase();
    if (tagName === "input" || tagName === "textarea") return;
    if (event.key === "ArrowRight") {
      next();
    } else if (event.key === "ArrowLeft") {
      prev();
    } else if (event.key === " " || event.key.toLowerCase() === "s") {
      event.preventDefault();
      toggleImage();
    }
  });

  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyBtn.textContent = "Lien copié !";
      setTimeout(() => (copyBtn.textContent = "Copier le lien"), 1500);
    } catch (err) {
      console.error("Clipboard error", err);
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "home") {
    initHome();
  } else {
    initViewer();
  }
});
