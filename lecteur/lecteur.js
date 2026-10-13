let CONFIG;

let direction = true; // true = droite defaut
let inversion = false;
let webtoon = false;
let double = false;
let offset = false; 

let chapitres;
let chapitresDouble = [];
let chapitresOffset = [];
let indice = 0;



const init = async () => {
  const { loadConfig } = await import("../common.js?v=2");
  CONFIG = await loadConfig();

  const proxyCubari = "/proxy/api/imgchest/chapter/9rydmwp6wyk";
  const urlChapter = `${CONFIG.URL_API_IMGCHEST}?id=${proxyCubari.split('/').pop()}` 

  chapitres = await fetch(urlChapter)
    .then(res => res.json());

  let indexDouble = 0;
  let indexOffset = 0;

  chapitres = chapitres.map((page,index) => {
    const imgElement = document.createElement("img");
    imgElement.classList.add("img","img-none");
    imgElement.setAttribute("id",`page-${index+1}`);
    imgElement.setAttribute("src",page.link);
    const lecteurDiv = document.querySelector("#lecteur");
    lecteurDiv.appendChild(imgElement);
    page.idDiv = `page-${index+1}`;
    const getCurrent = (offset,index,chaps) => {
      let current = [];
      if(page.width > page.height){
        index++;
      }else if(index%2 != offset){
        const last = chaps.at(-1);
        if(last && last[0].width <= last[0].height) {
          current = chaps.pop();
        }
      }
      index++;
      current.push(page);
      chaps.push(current);
      return index;
    }
    indexDouble = getCurrent(1,indexDouble,chapitresDouble);
    indexOffset = getCurrent(0,indexOffset,chapitresOffset);
    return page;
  });

  showPage();

  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    switch(key) {
      case "arrowleft" : 
        turn(!direction);
        break;
      case "arrowright" : 
        turn(direction);
        break;
      case "d" :
        toggleDouble();
        break;
      case "o" :
        toggleOffset();
        break;    
      case "w" :
        toggleWebtoon();
        break;
      case "s" :
        toggleSens()
        break;
      case "i" :
        toggleInversion()
        break;
    }
  })
}

const toggleDouble = () => {
  const lecteurDiv = document.querySelector("#lecteur");
  if(double) {
    let current = (offset ? chapitresOffset : chapitresDouble)[indice][0];
    indice = chapitres.findIndex(p => p.idDiv === current.idDiv);
    lecteurDiv.classList.remove("lecteur-double");
  } else {
    let current = chapitres[indice];
    let chaps = offset ? chapitresOffset : chapitresDouble;
    indice = chaps.findIndex(dp => dp.find(p => p.idDiv === current.idDiv));
    lecteurDiv.classList.add("lecteur-double");
  }
  double = !double;
  console.log(double);
  showPage();
}

const toggleOffset = () => {
  offset = !offset;
  showPage(); 
}

const toggleWebtoon = () => {
  const lecteurDiv = document.querySelector("#lecteur");
  webtoon = !webtoon;
  if(webtoon) {
    lecteurDiv.classList.add("lecteur-webtoon");
    const allImg = document.querySelectorAll(".img.img-none")
    Array.from(allImg).forEach(img => img.classList.remove("img-none"));
  } else {
    lecteurDiv.classList.remove("lecteur-webtoon");
    showPage();
  }
}

const toggleSens = () => {
  direction = !direction;
  toggleInversion();
  toggleOffset();
}

const toggleInversion = () => {
  if(webtoon) return;
  const lecteurDiv = document.querySelector("#lecteur");
  inversion = !inversion;
  if(inversion) {
    lecteurDiv.classList.add("lecteur-inversion");
  } else {
    lecteurDiv.classList.remove("lecteur-inversion");
  }
}


const turn = (right) => {
  if(webtoon) return;
  if(right) {
    nextPage();
  }else {
    previousPage();
  }
}

const nextPage = () => {
  if(indice < chapitres.length){
    indice++;
    if(double && chapitres[indice-1].double) indice++;
    showPage();
  }
}

const previousPage = () => {
  if(indice > 0) {
    indice--;
    if(double && chapitres[indice+1].double) indice--;
    showPage();
  }
}

const showPage = () => {
  const allImg = document.querySelectorAll(".img:not(.img-none)")
  Array.from(allImg).forEach(img => img.classList.add("img-none"));

  let current;
  let currentDouble;
  if(double){
    if(offset){
      currentDouble = chapitresOffset[indice];
    }else {
      currentDouble = chapitresDouble[indice];
    }
    current = currentDouble[0];
  }else{
    current = chapitres[indice];
  }

  const imgDiv = document.querySelector(`#${current.idDiv}`);
  imgDiv.classList.remove("img-none");

  if(double && currentDouble.length === 2) {
    const imgDiv2 = document.querySelector(`#${currentDouble[1].idDiv}`);
    imgDiv2.classList.remove("img-none");
  }
}

init();