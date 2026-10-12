// serie.js – affiche la fiche d’une série à partir du slug de l’URL
// Exemple : https://teamscanr.fr/kaguya-sama
import { loadSerie, getStatusLabel, coverImg, readProgress } from "./common.js";

// Groupes partenaires (collabs) : nom affiché dans le JSON → site du groupe
const GROUP_LINKS = {
  "Manga-Corporation": "https://manga-corporation.com/",
};

const renderGroups = groups => Object.keys(groups || {})
  .flatMap(key => key.split(","))
  .map(name => name.trim())
  .filter(Boolean)
  .map(name => GROUP_LINKS[name]
    ? `<span class="c-group-link" role="link" tabindex="0" data-href="${GROUP_LINKS[name]}">${name}</span>`
    : name)
  .join(", ");

document.addEventListener("DOMContentLoaded", async () => {
  /* ---------------------------------------------------------------- 
   * 1. Gestion light/dark + logo (copié de votre index.js)
   * ---------------------------------------------------------------- */
  const toggleBtn = document.getElementById("theme-toggle");
  const logoImg   = document.querySelector(".logo img");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("mv-theme");

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark");
  }

  const updateIcon = () => {
    const icon = toggleBtn.querySelector("i");
    icon.className = document.body.classList.contains("dark") ? "fas fa-sun" : "fas fa-moon";
  };
  const updateLogo = () => {
    logoImg.src = document.body.classList.contains("dark") ? "img/scanr.webp" : "img/scanr-black.webp";
  };
  updateIcon();
  updateLogo();
  toggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("mv-theme", isDark ? "dark" : "light");
    updateIcon();
    updateLogo();
  });

  /* ---------------------------------------------------------------- 
   * 2. Récupération des données de la série
   * ---------------------------------------------------------------- */
  const getSlug = url => new URL(url).pathname.match(/[^\/]+/g)
  const slugs = getSlug(window.location);
  const slug = slugs[0];
  if (!slug) return showError("Paramètre « slug » manquant dans l’URL.");

  let serie;
  try {
    serie = await loadSerie(slug);
  } catch (err) {
    console.error("Erreur de chargement :", err);
    return showError("Impossible de charger la série pour le moment.");
  }
  if (!serie) return showError("Cette série n’existe pas.");

  /* ---------------------------------------------------------------- 
   * 3. Affichage
   * ---------------------------------------------------------------- */
  updateSeo(serie);
  buildPage(serie);
});

/* ===== Fonctions utilitaires ===================================== */
function showError(msg) {
  document.getElementById("serie-page").innerHTML = `<p style="padding:2rem;color:var(--clr-accent)">${msg}</p>`;
}

/* Calcule “il y a …” */
function timeAgo(ms) {
  const diff = Date.now() - ms,
        min  = 60e3, h = 60*min, d = 24*h, w = 7*d;
  if (diff < min) return "à l’instant";
  if (diff < h)   return `${Math.floor(diff/min)} min`;
  if (diff < d)   return `${Math.floor(diff/h)} h`;
  if (diff < w)   return `${Math.floor(diff/d)} j`;
  return new Date(ms).toLocaleDateString("fr-FR");
}

const isMultiple = (val) =>
  Array.isArray(val)
    ? val.length > 1
    : typeof val === "string" && /,|&| et | and |\/|\//i.test(val);

const joinVal = (val) => (Array.isArray(val) ? val.join(", ") : val);

const formatCredit = (val, sing, plur) =>
  val
    ? `<span><strong>${isMultiple(val) ? plur : sing} :</strong> ${joinVal(val)}</span>`
    : "";

const setMeta = (selector, create, value) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(el.tagName === "LINK" ? "href" : "content", value);
};

// Titre, description, canonique et données structurées propres à la série
function updateSeo(serie) {
  const url = `https://teamscanr.fr/${serie.slug}`;
  const description = (serie.description || `Lisez ${serie.title} en français sur ScanR.`)
    .replace(/\s+/g, " ")
    .trim();
  const shortDescription = description.length > 160
    ? `${description.slice(0, 157).trimEnd()}…`
    : description;

  document.title = `${serie.title} – Lire en français | ScanR`;
  setMeta('meta[name="description"]', () => {
    const meta = document.createElement("meta");
    meta.name = "description";
    return meta;
  }, shortDescription);
  setMeta('link[rel="canonical"]', () => {
    const link = document.createElement("link");
    link.rel = "canonical";
    return link;
  }, url);

  const people = (val) => (Array.isArray(val) ? val : String(val || "").split(/,|&| et /))
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ "@type": "Person", name }));

  const jsonLd = document.createElement("script");
  jsonLd.type = "application/ld+json";
  jsonLd.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": serie.os ? "Book" : "ComicSeries",
    name: serie.title,
    url,
    image: serie.cover,
    description,
    inLanguage: "fr",
    author: people(serie.author),
    ...(serie.artist && serie.artist !== serie.author ? { illustrator: people(serie.artist) } : {}),
    translator: { "@type": "Organization", name: "ScanR", url: "https://teamscanr.fr/" },
  });
  document.head.appendChild(jsonLd);
}

function buildPage(serie) {
  const main = document.getElementById("serie-page");
  main.innerHTML = ""; // vide l’ancien contenu

  // 1) Conteneur global
  const container = document.createElement("div");
  container.className = "serie-container";

  // 2) Aside
  const aside = document.createElement("aside");
  aside.className = "serie-aside";
  aside.innerHTML = `
    <div class="cover">
      ${coverImg(serie.cover, `Couverture de ${serie.title}`, {
        width: 400,
        sizes: "(max-width: 768px) 90vw, 300px",
        eager: true,
      })}
    </div>

    <div class="meta-list">
      ${formatCredit(serie.author, 'Auteur', 'Auteurs')}
      ${serie.artist && serie.artist!==serie.author
                     ? formatCredit(serie.artist, 'Artiste', 'Artistes') : ""}
      ${serie.year    ? `<span><strong>Année :</strong> ${serie.year}</span>`     : ""}
      <span><strong>Statut :</strong> ${getStatusLabel(serie)}</span>
    </div>

    ${Array.isArray(serie.tags)
      ? `<div class="tags">${serie.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>`
      : ""}
  `;

  // 3) Contenu principal
  const content = document.createElement("div");
  content.className = "serie-content";
  content.innerHTML = `
    <div class="serie-header">
      <h1 class="section-title">${serie.title}</h1>
      <p class="synopsis">${serie.description||"Pas de synopsis."}</p>
    </div>
    <div class="serie-button">
      <a id="commencer" class="button"><i class="fa-solid fa-play"></i> Commencer</a>
      <a id="continuer" class="button button-disabled" aria-disabled="true"
         title="Ouvrez un chapitre pour pouvoir reprendre votre lecture ici">
        <i class="fa-solid fa-circle-play"></i> Continuer
      </a>
    </div>
    <div class="chapters-section">
      <div class="chapters-header">
        <h2 class="section-title">Chapitres</h2>
        <button id="toggle-order" class="toggle-order" aria-label="Trier">
            <i class="fas fa-sort-numeric-up"></i>
        </button>
      </div>
      <div class="chapters-list"></div>
    </div>
  `;



  container.append(aside, content);
  main.appendChild(container);

  // 4) Préparez vos données + état de tri
  const chaptersArray = Object.entries(serie.chapters).map(e => ({num:e[0],data:e[1]}));
  // Un one-shot en un seul chapitre (souvent numéroté 0) s’affiche « One-shot » plutôt que « Chap. 0 »
  const singleOneShot = serie.os && chaptersArray.length === 1;
  const progress = readProgress(serie.slug);
  const readChapters = new Set(progress?.read || []);
  let ascending = false;
  const listEl   = content.querySelector(".chapters-list");
  const btnOrder = content.querySelector("#toggle-order");

  // 5) Fonction de rendu
  function renderChapters() {
    // trie
    const sorted = chaptersArray
      .slice() // clone pour ne pas perturber l’original
      .sort((a,b) => ascending
        ? parseFloat(a.num) - parseFloat(b.num)
        : parseFloat(b.num) - parseFloat(a.num)
      );
    // vide
    listEl.innerHTML = "";
    // génère
    sorted.forEach(({num, data}) => {
      const grp  = renderGroups(data.groups);
      const date = new Date(data.last_updated*1000)
        .toLocaleDateString("fr-FR", {day:"2-digit",month:"2-digit",year:"numeric"});
      const vol  = data.volume ? `<span class="c-vol">Tome ${data.volume}</span>` : "";

      const isRead = readChapters.has(num);
      const card = document.createElement("a");
      card.className = `chapter-card-vertical${isRead ? " is-read" : ""}`;
      if (isRead) card.title = "Déjà lu";
      card.innerHTML = `
        <span class="c-num">${singleOneShot ? "One-shot" : `Chap. ${num}`}${
          isRead ? '<span class="sr-only"> (déjà lu)</span>' : ""
        }</span>
        <span class="c-vol">${vol}</span>
        <span class="c-title">${data.title||""}</span>
        <span class="c-group">${grp}</span>
        <span class="c-date">${date}</span>
      `;
      card.setAttribute("href",`/${serie.slug}/${num}/1/`);
      listEl.appendChild(card);
    });
  }
  const firstChapter = chaptersArray.reduce(
    (min, curr) => (parseFloat(curr.num) < parseFloat(min.num) ? curr : min)
  );
  content.querySelector("#commencer").href = `/${serie.slug}/${firstChapter.num}/1/`;

  // « Continuer » reprend au dernier chapitre/page ouvert dans le lecteur (voir cubari/override.js)
  if (progress?.chapter && serie.chapters[progress.chapter]) {
    const btnContinue = content.querySelector("#continuer");
    btnContinue.classList.remove("button-disabled");
    btnContinue.removeAttribute("aria-disabled");
    btnContinue.removeAttribute("title");
    btnContinue.href = `/${serie.slug}/${progress.chapter}/${progress.page || 1}/`;
    btnContinue.innerHTML = singleOneShot
      ? '<i class="fa-solid fa-circle-play"></i> Continuer'
      : `<i class="fa-solid fa-circle-play"></i> Continuer · Chap. ${progress.chapter}`;
  }

  // Liens des groupes partenaires : ouvre leur site sans suivre le lien du chapitre
  const openGroupLink = e => {
    const link = e.target.closest(".c-group-link");
    if (!link) return;
    if (e.type === "keydown" && e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    window.open(link.dataset.href, "_blank", "noopener");
  };
  listEl.addEventListener("click", openGroupLink);
  listEl.addEventListener("keydown", openGroupLink);

  // 6) Écouteur sur le bouton
    btnOrder.addEventListener("click", () => {
    ascending = !ascending;
    const icon = btnOrder.querySelector("i");
    icon.className = ascending
        ? "fas fa-sort-numeric-down"
        : "fas fa-sort-numeric-up";
    renderChapters();
    });

  // 7) Premier rendu + animation
  renderChapters();
  requestAnimationFrame(()=>{
    container.style.opacity = "1";
    container.style.transform = "translateY(0)";
  });
}
