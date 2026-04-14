// serie.js – affiche la fiche d’une série en se basant sur l’ID base64 passé dans l’URL
// Exemple : serie.html?id=aHR0cHM6Ly4uLg==
let CONFIG;
document.addEventListener("DOMContentLoaded", async () => {

  const dev = await fetch("./config-dev.json");
  if (dev.status === 404) {
    CONFIG = await fetch("./config.json").then((res) => res.json());
  } else {
    CONFIG = await dev.json();
  }

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

  let allSerie;
  const responseAllSerie = await fetch(`${CONFIG.URL_CDN}index.json`);
  if (!responseAllSerie.ok) throw new Error(`HTTP ${responseAllSerie.status}`);
  allSerie = await responseAllSerie.json();

  if(!allSerie[slug]) {
    return document.location("/404");
  }

  let serie;
  const urlJSON   = `${CONFIG.URL_CDN}${allSerie[slug]}`;
  const responseSerie  = await fetch(urlJSON);
  if (!responseSerie.ok) throw new Error(`HTTP ${responseSerie.status}`);
  serie = await responseSerie.json();
  
  /* ---------------------------------------------------------------- 
   * 3. Affichage
   * ---------------------------------------------------------------- */
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
      <img src="${serie.cover}" alt="Couverture de ${serie.title}">
    </div>

    <div class="meta-list">
      ${formatCredit(serie.author, 'Auteur', 'Auteurs')}
      ${serie.artist && serie.artist!==serie.author
                     ? formatCredit(serie.artist, 'Artiste', 'Artistes') : ""}
      ${serie.year    ? `<span><strong>Année :</strong> ${serie.year}</span>`     : ""}
      <span><strong>Statut :</strong> ${serie.completed ? "Terminé" : "En cours"}</span>
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
      <a class="button button-disabled"><i class="fa-solid fa-circle-play"></i> Continuer</a>
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
      const grp  = Object.keys(data.groups||{}).join(", ");
      const date = new Date(data.last_updated*1000)
        .toLocaleDateString("fr-FR", {day:"2-digit",month:"2-digit",year:"numeric"});
      const vol  = data.volume ? `<span class="c-vol">Tome ${data.volume}</span>` : "";

      const card = document.createElement("a");
      card.className = "chapter-card-vertical";
      card.innerHTML = `
        <span class="c-num">Chap. ${num}</span>
        <span class="c-vol">${vol}</span>
        <span class="c-title">${data.title||""}</span>
        <span class="c-group">${grp}</span>
        <span class="c-date">${date}</span>
      `;
      card.setAttribute("href",`/${serie.slug}/${num}/1/`);
      listEl.appendChild(card);
    });
  }
  content.querySelector("#commencer").href = `/${serie.slug}/${Math.min(...chaptersArray.map(e => e.num))}` 

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
