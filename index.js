document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("theme-toggle");
  const logoImg = document.querySelector(".logo img");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("mv-theme");

  // 1. Initialisation du thème et du logo au chargement
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }

  const updateIcon = () => {
    const icon = toggleBtn.querySelector("i");
    icon.className = document.body.classList.contains("dark")
      ? "fas fa-sun"
      : "fas fa-moon";
  };

  const updateLogo = () => {
    logoImg.src = document.body.classList.contains("dark")
      ? "img/scanr.webp"
      : "img/scanr-black.webp";
  };

  // applique tout de suite
  updateIcon();
  updateLogo();

  // 2. Au clic, on bascule thème + logo + icône + stockage
  toggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("mv-theme", isDark ? "dark" : "light");
    updateIcon();
    updateLogo();
  });
});

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
let CONFIG;

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
const appendSeriesCover = (url) => `${url.slice(0, -4)}-s.jpg`;
const appendChapterCover = (url) => `${url.slice(0, -4)}-m.jpg`;
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

// Rendus HTML
function renderChapter(c) {
  return `
  <a class="chapter-card" href='${c.url}'>
    <div class="chapter-cover">
      <img src="${appendChapterCover(c.serieCover)}" alt="${
    c.serieTitle
  } – Cover">
      ${maybeMultiChapter(c.latest)}
      ${maybeNewBadge(c.last_updated)}
    </div>
    <div class="chapter-info">
      <div class="manga-title">${c.serieTitle}</div>
      <div class="chapter-title">${!c.latest ? c.title : "&nbsp;"}</div>
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

  // 2) On remplace les points pour correspondre à la route
  const safeChap = lastChap.replaceAll(".", "-");

  // 3) Lien complet vers le dernier chapitre
  //    s.urlSerie vaut "https://teamscanr.fr/read/gist/<base64>"
  const lastChapUrl = `${s.urlSerie}/${safeChap}/1/`;

  return `
  <div class="series-card" >
    <div class="series-cover">
      <img src="${appendSeriesCover(s.cover)}" alt="${s.title} – Cover">
    </div>
    <div class="series-info">
      <div class="series-title">${s.title}</div>
      ${s.year    ? `<div class="meta">Année : ${s.year}</div>`   : ""}
      ${s.status  ? `<div class="meta">Statut : ${s.status}</div>` : ""}
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
                target="_blank"
                class="chapter-number-stylish"
                onclick="event.stopPropagation()"
              >
                ${lastChap}
              </a>
            </div>`
          : ""
      }
    </div>
    <a class='series-redirect' href='${s.slug}'></a>
  </div>`;
}


async function fetchAllSeries() {

  const dev = await fetch("./config-dev.json");
  if (dev.status === 404) {
    CONFIG = await fetch("./config.json").then((res) => res.json());
  } else {
    CONFIG = await dev.json();
  }
  
  const res = await fetch(`${CONFIG.URL_CDN}index.json`);
  if (!res.ok) {
    throw new Error(`Erreur HTTP ${res.status} en récupérant all_series.json`);
  }
  const allSerie = await res.json(); // renvoie tableau d'objets, chacun avec .id et .urlSerie
  console.log(allSerie)
  const seriesPromises = Object.entries(allSerie).map(async ([slug,fileName]) => {
      const serie = await fetch(`${CONFIG.URL_CDN}${fileName}`).then((r) => r.json());
      serie.urlSerie = `/${slug}`;
      return serie;
  })
    return Promise.all(seriesPromises);
}

// 2) À partir de ces séries, bâtir liste de chapitres et liste de séries
async function bootstrap() {
  try {
    const allSeries = await fetchAllSeries();

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

          // Génération de l'URL du chapitre
          const safeChap = chapNum.replaceAll('.', '-');

          // Filter duplicate
          chapData.os = serie.os;
          chapData.url = `${serie.urlSerie}/${safeChap}/1/`;
          chapData.idChest = Object.values(chapData.groups)[0].split("/").pop();
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
            if(prev.chapter > curr.chapter){
                curr.latest = prev.latest ?? [];
                curr.latest.push(prev.chapter)
                acc.pop();
                acc.push(curr);
            }else {
                prev.latest = prev.latest ?? [];
                prev.latest.push(curr.chapter);
            }
        } else {
            acc.push(curr);
        }
        return acc;
      },[])
      .slice(0, 15);
    console.log(allChapters);

    // Injection du carousel des chapitres
    const track = document.querySelector('.carousel-track');
    track.innerHTML = allChapters.map(renderChapter).join('');

    // Initialisation des flèches et du drag-to-scroll
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    let isDragging = false, startX = 0, scrollStart = 0;

    nextBtn.addEventListener('click', () => {
      const visibleWidth = track.clientWidth;
      const maxScroll = track.scrollWidth - visibleWidth;
      track.scrollTo({
        left: track.scrollLeft >= maxScroll ? 0 : track.scrollLeft + visibleWidth,
        behavior: 'smooth'
      });
    });

    prevBtn.addEventListener('click', () => {
      const visibleWidth = track.clientWidth;
      const maxScroll = track.scrollWidth - visibleWidth;
      track.scrollTo({
        left: track.scrollLeft <= 0 ? maxScroll : track.scrollLeft - visibleWidth,
        behavior: 'smooth'
      });
    });

    track.addEventListener('mousedown', e => {
      isDragging = true;
      startX = e.pageX - track.offsetLeft;
      scrollStart = track.scrollLeft;
      track.classList.add('active');
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      track.classList.remove('active');
    });

    track.addEventListener('mousemove', e => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollStart - walk;
    });

    // Touch events
    track.addEventListener('touchstart', e => {
      startX = e.touches[0].pageX - track.offsetLeft;
      scrollStart = track.scrollLeft;
    });
    track.addEventListener('touchmove', e => {
      const x = e.touches[0].pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollStart - walk;
    });

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
    document.querySelector('.series-grid').innerHTML    = '<p>Impossible de charger les séries.</p>';
  }
}

// Lancer l’application
bootstrap();
