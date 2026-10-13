// common.js – code partagé par les pages : config, données des séries, couvertures, en-tête, progression de lecture
// Importé avec un ?v= (comme les scripts et style.css dans les pages HTML) : les fichiers sont gardés
// 4 h en cache, il faut changer ce numéro partout à chaque modification pour éviter un mélange
// d'ancien et de nouveau code.

const PROD_CONFIG = {
  URL_CDN: "https://cdn.teamscanr.fr/",
  URL_API_IMGCHEST: "https://api.teamscanr.fr/imgchest",
};

// En local uniquement, un config-dev.json (ignoré par git) peut surcharger la config de prod
const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
let configPromise;
export const loadConfig = () =>
  (configPromise ??= isLocal
    ? fetch("/config-dev.json")
        .then((res) => (res.ok ? res.json() : PROD_CONFIG))
        .catch(() => PROD_CONFIG)
    : Promise.resolve(PROD_CONFIG));

const fetchJSON = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} en récupérant ${url}`);
  return res.json();
};

/* ===== Données des séries ======================================== */

// catalog.json (généré par le dépôt cub à chaque synchro R2) regroupe toutes les séries en une requête.
// S'il est absent, on retombe sur index.json + une requête par série.
async function fetchAllSeries() {
  const { URL_CDN } = await loadConfig();
  const catalog = await fetchJSON(`${URL_CDN}catalog.json`).catch(() => null);
  const entries = catalog?.series
    ? Object.entries(catalog.series)
    : await Promise.all(
        Object.entries(await fetchJSON(`${URL_CDN}index.json`)).map(
          async ([slug, fileName]) => [slug, await fetchJSON(`${URL_CDN}${fileName}`)]
        )
      );
  return entries.map(([slug, serie]) => ({
    ...serie,
    slug: serie.slug || slug,
    urlSerie: `/${slug}`,
  }));
}

// Partagé entre l'accueil et la recherche : les séries ne sont chargées qu'une fois par page
let seriesPromise;
export const loadAllSeries = () =>
  (seriesPromise ??= fetchAllSeries().catch((err) => {
    seriesPromise = null;
    throw err;
  }));

// Renvoie null si le slug n'existe pas
export async function loadSerie(slug) {
  const { URL_CDN } = await loadConfig();
  const index = await fetchJSON(`${URL_CDN}index.json`);
  if (!index[slug]) return null;
  return fetchJSON(`${URL_CDN}${index[slug]}`);
}

/* ===== Textes ==================================================== */

// Pour les recherches : sans accents ni majuscules
export const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// « il y a … » puis la date au-delà d'une semaine
export function timeAgo(ms) {
  const diff = Date.now() - ms;
  const min = 60 * 1000,
    h = 60 * min,
    d = 24 * h,
    w = 7 * d;
  if (diff < min) return "à l’instant";
  if (diff < h) return `${Math.floor(diff / min)} min`;
  if (diff < d) return `${Math.floor(diff / h)} h`;
  if (diff < w) return `${Math.floor(diff / d)} j`;
  return new Date(ms).toLocaleDateString("fr-FR");
}

// Les crédits sont une liste ou une chaîne (« A, B », « A & B », « A et B »…)
const isMultiple = (val) =>
  Array.isArray(val)
    ? val.length > 1
    : typeof val === "string" && /,|&| et | and |\//i.test(val);

export const joinVal = (val) => (Array.isArray(val) ? val.join(", ") : val || "");

// « Auteur : X » ou « Auteurs : X, Y », dans la balise demandée ; rien si le crédit est vide
export const formatCredit = (val, sing, plur, tag = "span", className = "") =>
  val
    ? `<${tag}${className ? ` class="${className}"` : ""}><strong>${isMultiple(val) ? plur : sing} :</strong> ${joinVal(val)}</${tag}>`
    : "";

/* ===== Icônes ==================================================== */

// Symboles SVG définis dans le header commun (_partials/header.html)
export const icon = (name, className = "") =>
  `<svg class="icon${className ? ` ${className}` : ""}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

export const getStatusLabel = (serie) => {
  if (serie.os) return "One-shot";
  return serie.completed ? "Terminée" : "En cours";
};

/* ===== Couvertures =============================================== */

// Les couvertures imgchest sont en taille originale (jusqu'à 15 Mo) : on passe par wsrv.nl
// pour servir des miniatures WebP redimensionnées, avec repli sur l'original en cas d'erreur.
export const thumbUrl = (url, width) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp`;

export const escapeAttr = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

export function coverImg(url, alt, { width, sizes, eager = false }) {
  return `<img
    src="${thumbUrl(url, width)}"
    srcset="${thumbUrl(url, width)} ${width}w, ${thumbUrl(url, width * 2)} ${width * 2}w"
    sizes="${sizes}"
    data-original="${escapeAttr(url)}"
    onerror="this.onerror=null;this.removeAttribute('srcset');this.src=this.dataset.original"
    loading="${eager ? "eager" : "lazy"}"
    decoding="async"
    alt="${escapeAttr(alt)}">`;
}

/* ===== En-tête : thème clair/sombre et menu mobile =============== */

// La classe .dark est posée sur <html> par le script en ligne du <head>, avant le premier rendu
// (pas de flash blanc). Le logo et l'icône du bouton suivent en CSS (.only-dark / .only-light).
export function initHeader() {
  const root = document.documentElement;
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const isDark = root.classList.toggle("dark");
    try {
      localStorage.setItem("mv-theme", isDark ? "dark" : "light");
    } catch {
      // localStorage indisponible : le thème ne sera juste pas retenu
    }
  });

  const header = document.querySelector("header");
  const navToggle = document.getElementById("nav-toggle");
  if (!header || !navToggle) return;
  const setNavOpen = (open) => {
    header.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  };
  navToggle.addEventListener("click", () => setNavOpen(!header.classList.contains("nav-open")));
  // Un lien suivi, un clic en dehors ou Échap referment le menu
  header.querySelector("nav")?.addEventListener("click", (e) => {
    if (e.target.closest("a")) setNavOpen(false);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("header")) setNavOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("nav-open")) {
      setNavOpen(false);
      navToggle.focus();
    }
  });
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===== Progression de lecture ==================================== */

// Écrite par cubari/override.js dans le lecteur (même origine) :
// { [slug]: { chapter: "12", page: 3, read: ["1", "2", ...], at: <timestamp> } }
const PROGRESS_KEY = "scanr-progress";

export function readProgress(slug) {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}")[slug] || null;
  } catch {
    return null;
  }
}
