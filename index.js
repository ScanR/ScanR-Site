// ==========  ANIMATION ON SCROLL  ==========
document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = 1;
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.12 }
  );

  document
    .querySelectorAll(".chapter-card, .series-card, .section-title")
    .forEach((el) => observer.observe(el));
});

// ─────────────────────────────────  app.js ─────────────────────────────────────
import { loadAllSeries, coverImg, escapeAttr, initHeader, prefersReducedMotion } from "./common.js?v=2";

initHeader();

const konami = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

const latestContainer = document.querySelector(".latest-chapters");

// Helpers pour ajuster les URLs de cover
/*const appendSeriesCover = (url) => `${url.slice(0, -4)}-s.jpg`;
const appendChapterCover = (url) => `${url.slice(0, -4)}-m.jpg`;*/
function timeAgo(ms) {
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
const maybeNewBadge = (lastUpdated) =>
  Date.now() - lastUpdated < 3 * 24 * 60 * 60 * 1000
    ? '<span class="new-badge">NOUVEAU</span>'
    : "";

const maybeMultiChapter = (latest) =>
  latest
    ? `<span class="multi-chapter">${latest.length+1} chapitres</span>`
    : "";

const getChapitreNumber = (c) =>
  c.os ? "One Shot" : `Chapitre${c.latest ? `s ${c.chapter} - ${c.latest.at(-1)}` : ` ${c.chapter}`}`

// Helpers for credits labels
const isMultiple = (val) =>
  Array.isArray(val)
    ? val.length > 1
    : typeof val === "string" && /,|&| et | and |\/|\//i.test(val);

const joinVal = (val) => (Array.isArray(val) ? val.join(", ") : val);

const formatCredit = (val, sing, plur) =>
  val
    ? `<div class="meta"><strong>${isMultiple(val) ? plur : sing} :</strong> ${joinVal(val)}</div>`
    : "";

function preserveLatestChapterMeta(target, source) {
  if (source.last_updated > target.last_updated) {
    target.last_updated = source.last_updated;
    target.title = source.title;
    target.idChest = source.idChest;
  }
}

// Rendus HTML
function renderChapter(c, i) {
  return `
  <a class="chapter-card" href='${c.url}'>
    <div class="chapter-cover">
      ${coverImg(c.serieCover, `${c.serieTitle} – Cover`, {
        width: 400,
        sizes: "(max-width: 768px) 90vw, (max-width: 1024px) 50vw, 25vw",
        eager: i < 4,
      })}
      ${maybeMultiChapter(c.latest)}
      ${maybeNewBadge(c.last_updated)}
    </div>
    <div class="chapter-info">
      <div class="manga-title">${c.serieTitle}</div>
      <div class="chapter-title">${!c.latest && c.title ? c.title : "&nbsp;"}</div>
      <div class="chapter-number">${getChapitreNumber(c)}</div>
      <div class="chapter-time"><i class="fas fa-clock"></i> ${timeAgo(
        c.last_updated
      )}</div>
    </div>
  </a>`;
}

function renderSeries(s) {
  // 1) Calcul du numéro du dernier chapitre
  const lastChap = Object.keys(s.chapters).reduce(
    (max, curr) => (parseFloat(curr) > parseFloat(max) ? curr : max),
    "0"
  );

  // 2) Lien complet vers le dernier chapitre
  const lastChapUrl = `${s.urlSerie}/${lastChap}/1/`;

  // Le lien du titre couvre toute la carte (::after), le lien « Dernier chapitre » passe au-dessus
  return `
  <div class="series-card" >
    <div class="series-cover">
      ${coverImg(s.cover, `${s.title} – Cover`, { width: 200, sizes: "140px" })}
    </div>
    <div class="series-info">
      <h3 class="series-title"><a class="series-link" href="${s.urlSerie}">${s.title}</a></h3>
      ${s.year    ? `<div class="meta">Année : ${s.year}</div>`   : ""}
      ${formatCredit(s.author, 'Auteur', 'Auteurs')}
      ${s.artist && s.artist !== s.author
        ? formatCredit(s.artist, 'Artiste', 'Artistes')
        : ""}
      ${Array.isArray(s.tags)
        ? `
      <div class="tags">
        ${s.tags.slice(0, 6).map(t => `<span class="tag">${t}</span>`).join("")}
      </div>`
        : ""}
      ${
        !s.os
          ? `<div class="meta">
              Dernier chapitre :
              <a
                href="${lastChapUrl}"
                class="chapter-number-stylish"
                aria-label="${escapeAttr(`Lire le chapitre ${lastChap} de ${s.title}`)}"
              >
                ${lastChap}
              </a>
            </div>`
          : ""
      }
    </div>
  </div>`;
}


// 2) À partir de ces séries, bâtir liste de chapitres et liste de séries
async function bootstrap() {
  try {
    const allSeries = await loadAllSeries();

    // Séparer les séries selon leur statut
    const onGoing   = allSeries.filter(s => !s.completed && !s.os && !s.konami);
    const os        = allSeries.filter(s => s.os);
    const completed = allSeries.filter(s => s.completed);

    // Injection des grilles de séries
    document.querySelector('.on-going').innerHTML   = onGoing.map(renderSeries).join('');
    document.querySelector('.one-shot').innerHTML   = os.map(renderSeries).join('');
    document.querySelector('.completed').innerHTML  = completed.map(renderSeries).join('');

    // Construction et tri des derniers chapitres
    const allChapters = allSeries
      .flatMap(serie =>
        Object.entries(serie.chapters).map(([chapNum, chapData]) => {
          chapData.serieTitle   = serie.title;
          chapData.serieCover   = serie.cover;
          chapData.chapter      = chapNum;
          chapData.last_updated = Number(chapData.last_updated) * 1000;

          // Filter duplicate
          chapData.os = serie.os;
          chapData.url = `${serie.urlSerie}/${chapNum}/1/`;
          // ImgChest: "/proxy/api/imgchest/chapter/<id>" ; R2: liste des URLs des pages
          const pages = Object.values(chapData.groups)[0];
          chapData.idChest = Array.isArray(pages) ? String(pages[0]) : String(pages).split("/").pop();
          return chapData;
        })
      )
      .sort((a, b) => b.last_updated - a.last_updated)
      .reduce((acc,curr) => {
        const foundChapter = acc.find(chapData => chapData.idChest == curr.idChest);
        if(foundChapter){
          if(!foundChapter.os && curr.os) {
            acc.splice(acc.indexOf(foundChapter),1);
            acc.push(curr);
            return acc;
          }
        } 
        const prev = acc.at(-1);
        const isDuplicate = prev && prev.serieTitle === curr.serieTitle;
        if(isDuplicate){
            let mergedChapter;
            if(prev.chapter - curr.chapter > 0){
                curr.latest = prev.latest ?? [];
                curr.latest.push(prev.chapter)
                preserveLatestChapterMeta(curr, prev);
                acc.pop();
                acc.push(curr);
                mergedChapter = curr;
            }else {
                prev.latest = prev.latest ?? [];
                prev.latest.push(curr.chapter);
                preserveLatestChapterMeta(prev, curr);
                mergedChapter = prev;
            }
          mergedChapter.latest = mergedChapter.latest?.sort((a,b) => a - b);
        } else {
            acc.push(curr);
        }
        return acc;
      },[])
      .slice(0, 15);

    // Injection du carousel des chapitres
    const track = document.querySelector('.carousel-track');
    track.innerHTML = allChapters.map(renderChapter).join('');

    // Initialisation des flèches et du drag-to-scroll
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');

    nextBtn.addEventListener('click', () => {
      const visibleWidth = track.clientWidth;
      const maxScroll = track.scrollWidth - visibleWidth;
      track.scrollTo({
        left: track.scrollLeft >= maxScroll ? 0 : track.scrollLeft + visibleWidth,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    });

    prevBtn.addEventListener('click', () => {
      const visibleWidth = track.clientWidth;
      const maxScroll = track.scrollWidth - visibleWidth;
      track.scrollTo({
        left: track.scrollLeft <= 0 ? maxScroll : track.scrollLeft - visibleWidth,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    });

    // Glisser à la souris uniquement : au doigt, le défilement natif du navigateur suffit.
    // Au-delà de 5 px c'est un glisser, et le clic qui suit le relâchement n'ouvre pas le chapitre.
    let dragStartX = null, scrollStart = 0, dragged = false;

    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragStartX = e.clientX;
      scrollStart = track.scrollLeft;
      dragged = false;
    });

    document.addEventListener('pointermove', e => {
      if (dragStartX === null) return;
      const walk = e.clientX - dragStartX;
      if (!dragged && Math.abs(walk) < 5) return;
      dragged = true;
      track.classList.add('active');
      track.scrollLeft = scrollStart - walk;
    });

    document.addEventListener('pointerup', () => {
      if (dragStartX === null) return;
      dragStartX = null;
      track.classList.remove('active');
      // Le clic arrive juste après le pointerup : on le laisse passer par le filtre ci-dessous
      setTimeout(() => { dragged = false; });
    });

    track.addEventListener('click', e => {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    // Empêche le glisser-déposer natif des liens et des images, qui interromprait le défilement
    track.addEventListener('dragstart', e => e.preventDefault());

    // Konami
    const konamiSerie = allSeries.find(s => s.konami);
    if (konamiSerie) {
      const attempt = [];
      const seq = ["arrowup","arrowup","arrowdown","arrowdown","arrowleft","arrowright","arrowleft","arrowright","b","a"];
      document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        if (key === seq[attempt.length]) {
          attempt.push(key);
          if (attempt.length === seq.length) {
            window.open(konamiSerie.urlSerie, '_blank').focus();
          }
        } else {
          attempt.length = (key === 'arrowup' ? 1 : 0);
        }
      });
    }

  } catch (err) {
    console.error('Erreur de chargement :', err);
    document.querySelector('.carousel-track').innerHTML = '<p>Impossible de charger les chapitres.</p>';
    document.querySelectorAll('.series-grid').forEach(grid => {
      grid.innerHTML = '<p>Impossible de charger les séries.</p>';
    });
  }
}

// Lancer l’application
bootstrap();



