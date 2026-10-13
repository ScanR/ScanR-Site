// serie.js – affiche la fiche d’une série à partir du slug de l’URL
// Exemple : https://teamscanr.fr/kaguya-sama
import { loadSerie, getStatusLabel, coverImg, readProgress, initHeader } from "./common.js?v=2";

// Groupes partenaires (collabs) : nom affiché dans le JSON → site du groupe.
// Ce sont de vrais liens, posés au-dessus du lien du chapitre (pas de lien dans un lien).
const GROUP_LINKS = {
  "Manga-Corporation": "https://manga-corporation.com/",
};

const renderGroups = groups => Object.keys(groups || {})
  .flatMap(key => key.split(","))
  .map(name => name.trim())
  .filter(Boolean)
  .map(name => GROUP_LINKS[name]
    ? `<a class="c-group-link" href="${GROUP_LINKS[name]}" target="_blank" rel="noopener noreferrer">${name}</a>`
    : name)
  .join(", ");

document.addEventListener("DOMContentLoaded", async () => {
  /* ----------------------------------------------------------------
   * 1. En-tête (thème, menu mobile)
   * ---------------------------------------------------------------- */
  initHeader();

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
  document.getElementById("serie-page").innerHTML = `
    <div class="not-found">
      <h1>${msg}</h1>
      <a class="button" href="/"><i class="fas fa-home"></i> Retour à l’accueil</a>
    </div>`;
}

const normalizeText = value => String(value || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .trim();

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
        <div class="chapters-tools">
          <div class="chapter-filter" hidden>
            <label class="sr-only" for="chapter-filter-input">Aller au chapitre (numéro ou titre)</label>
            <i class="fas fa-search" aria-hidden="true"></i>
            <input id="chapter-filter-input" type="search" placeholder="Aller au chapitre…" autocomplete="off">
          </div>
          <button id="toggle-order" class="toggle-order" aria-label="Inverser l’ordre des chapitres">
              <i class="fas fa-sort-numeric-up"></i>
          </button>
        </div>
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
  let query = "";
  const listEl   = content.querySelector(".chapters-list");
  const btnOrder = content.querySelector("#toggle-order");
  const filterInput = content.querySelector("#chapter-filter-input");
  const chapterUrl = num => `/${serie.slug}/${num}/1/`;

  // Les longues séries sont regroupées par tome (repliables) ; les chapitres sans tome
  // (souvent les plus récents, pas encore reliés) forment un groupe « Hors tome ».
  const groupByVolume = new Set(chaptersArray.map(c => c.data.volume).filter(Boolean)).size > 1;
  const volumeKey = c => String(c.data.volume || "");
  // Tomes ouverts : celui des derniers chapitres et celui de la lecture en cours
  const openVolumes = new Set();
  const latestChapter = chaptersArray.reduce(
    (max, curr) => (parseFloat(curr.num) > parseFloat(max.num) ? curr : max)
  );
  openVolumes.add(volumeKey(latestChapter));
  if (progress?.chapter && serie.chapters[progress.chapter]) {
    openVolumes.add(String(serie.chapters[progress.chapter].volume || ""));
  }

  // « 150 » trouve les chapitres 150, 150.5, 151…; du texte cherche dans les titres
  const matchesQuery = ({num, data}) => {
    if (!query) return true;
    const q = normalizeText(query).replace(/^chap(itre)?\.?\s*/, "").replace(",", ".");
    return num.startsWith(q) || normalizeText(data.title).includes(q);
  };

  const renderChapterRow = ({num, data}) => {
    const grp  = renderGroups(data.groups);
    const date = new Date(data.last_updated*1000)
      .toLocaleDateString("fr-FR", {day:"2-digit",month:"2-digit",year:"numeric"});
    const vol  = data.volume ? `Tome ${data.volume}` : "";

    // Le lien du numéro couvre toute la ligne (::after), le lien du groupe passe au-dessus
    const isRead = readChapters.has(num);
    const card = document.createElement("div");
    card.className = `chapter-card-vertical${isRead ? " is-read" : ""}`;
    if (isRead) card.title = "Déjà lu";
    card.innerHTML = `
      <a class="c-num chapter-link" href="${chapterUrl(num)}">${singleOneShot ? "One-shot" : `Chap. ${num}`}${
        isRead ? '<span class="sr-only"> (déjà lu)</span>' : ""
      }</a>
      <span class="c-vol">${vol}</span>
      <span class="c-title">${data.title||""}</span>
      <span class="c-group">${grp}</span>
      <span class="c-date">${date}</span>
    `;
    return card;
  };

  const renderVolumeGroup = (key, chapters) => {
    const nums = chapters.map(c => parseFloat(c.num));
    const first = chapters.find(c => parseFloat(c.num) === Math.min(...nums)).num;
    const last = chapters.find(c => parseFloat(c.num) === Math.max(...nums)).num;
    const details = document.createElement("details");
    details.className = "volume-group";
    details.open = openVolumes.has(key);
    details.innerHTML = `
      <summary>
        <span class="volume-name">${key ? `Tome ${key}` : "Hors tome"}</span>
        <span class="volume-range">${first === last ? `Chap. ${first}` : `Chap. ${first} à ${last}`}
          · ${chapters.length} chapitre${chapters.length > 1 ? "s" : ""}</span>
      </summary>
      <div class="volume-chapters"></div>
    `;
    details.querySelector(".volume-chapters").append(...chapters.map(renderChapterRow));
    details.addEventListener("toggle", () => {
      if (details.open) openVolumes.add(key);
      else openVolumes.delete(key);
    });
    return details;
  };

  // 5) Fonction de rendu
  function renderChapters() {
    const sorted = chaptersArray
      .filter(matchesQuery)
      .sort((a,b) => ascending
        ? parseFloat(a.num) - parseFloat(b.num)
        : parseFloat(b.num) - parseFloat(a.num)
      );
    listEl.innerHTML = "";

    if (!sorted.length) {
      const empty = document.createElement("p");
      empty.className = "chapters-empty";
      empty.textContent = `Aucun chapitre ne correspond à « ${query} ».`;
      listEl.appendChild(empty);
      return;
    }

    // Pendant une recherche, liste à plat des résultats
    if (!groupByVolume || query) {
      listEl.append(...sorted.map(renderChapterRow));
      return;
    }

    // Les tomes arrivent dans l'ordre de leur premier chapitre, donc dans le sens du tri
    const volumes = new Map();
    sorted.forEach(c => {
      const key = volumeKey(c);
      if (!volumes.has(key)) volumes.set(key, []);
      volumes.get(key).push(c);
    });
    listEl.append(...[...volumes].map(([key, chapters]) => renderVolumeGroup(key, chapters)));
  }

  // Recherche « Aller au chapitre » : utile dès qu'il y a un peu de chapitres
  if (chaptersArray.length > 10) {
    content.querySelector(".chapter-filter").hidden = false;
    filterInput.addEventListener("input", () => {
      query = filterInput.value.trim();
      renderChapters();
    });
    // Entrée ouvre le chapitre exact s'il existe, sinon le premier résultat
    filterInput.addEventListener("keydown", e => {
      if (e.key !== "Enter" || !query) return;
      e.preventDefault();
      const exact = serie.chapters[query.replace(",", ".")] ? query.replace(",", ".") : null;
      const href = exact ? chapterUrl(exact) : listEl.querySelector(".chapter-link")?.getAttribute("href");
      if (href) window.location.href = href;
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

  // 6) Écouteur sur le bouton
    btnOrder.addEventListener("click", () => {
    ascending = !ascending;
    const icon = btnOrder.querySelector("i");
    icon.className = ascending
        ? "fas fa-sort-numeric-down"
        : "fas fa-sort-numeric-up";
    // Le tome qui arrive en tête de liste s'ouvre
    openVolumes.add(volumeKey(ascending ? firstChapter : latestChapter));
    renderChapters();
    });

  // 7) Premier rendu + animation
  renderChapters();
  requestAnimationFrame(()=>{
    container.style.opacity = "1";
    container.style.transform = "translateY(0)";
  });
}
