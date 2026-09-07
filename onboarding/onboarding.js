(function () {
  'use strict';
  const ONBOARDING_ZOOM = 14;
  let layer = null;
  let markerHighlight = null;
  let bubble = null;
  let onboardingOriginalCenter = null;
  let onboardingOriginalZoom = null;
  let onboardingRestart = false;
  let onboardingMarkerData = null;
  let onboardingNextReadyAt = 0;
  
   const onboardingTexts = {
en: {
  welcomeTitle: "Aroundo is happy to meet you!",
  welcomeText: "Come on, let me show you how it works.<br>I'll guide you.",
  whyTitle: "To get started:<br>what are you looking at?",
  whyText: "A map of events happening around you.<br>So you can finally discover...<br><div style=\"text-align:center;\"><strong>WHAT TO DO!</strong></div>",
  
  eventsTitle: "And all those little dots...<br>what are they?",
  eventsText: "<div style=\"text-align:center;\"><strong>They're events!</strong></div>With a click you can immediately discover what's happening, when it starts, when it ends, who is organising it, and other useful information.",
  eventsTitle1: "Clicking on More...",
  eventsText1: "Discover more details.<br>The exact location, a short description, any posters and...",
  
  categoriesTitle: "This is the Categories menu!",
  categoriesText: "Open it to select your interests and display on the map only the events that match your preferences.",
  categoriesTitle1: "When you open the menu...",
  categoriesText1: "All categories are deactivated.<br>So you can choose them freely.<br>As you can see, the events have disappeared from the map.",
  categoriesTitle2: "Now...",
  categoriesText2: "You can select your favourites.<br>Only matching events will appear.<br>The selector at the top, with a dot, lets you know that not everything is active.",
  categoriesTitle3: "When you open it again...",
  categoriesText3: "You'll find your selection.<br>You can change it or, with a single click on the selector at the top, show everything again.",
  categoriesTitle4: "Why do the dots change?",
  categoriesText4: "The closer an event gets to its start time, the bigger it becomes and...it starts bouncing, and then...<br>If it has just started, it will keep swaying briefly as it gets smaller.",
  
  timelineTitle: "These are the days!",
  timelineText: "You can move backwards and forwards, discovering what will happen or what has already happened.<br>The dot underneath the centre acts as a reset.",
  timelineTitle1: "And these are the hours!",
  timelineText1: "You can select the start and end times of the events you're interested in.",
  timelineTitle2: "So, for example...",
  timelineText2: "You can find out what happened yesterday, what will happen tomorrow, the day after tomorrow...in that specific area of the map, during the selected times, and only for the categories you're interested in!",
  timelineTitle3: "Aroundo is...",
  timelineText3: "<div style=\"text-align:center;\">Space-Time<br>Save time.<br>It's your most precious asset!</div>",
  
  finalTitle: "Now you're ready!",
  finalText: "Discover how to make the most of <strong>YOUR</strong> territory with...<br><div style=\"text-align:center;\"><strong>Aroundo</strong></div>",
  restartText: "<div style=\"text-align:center;\">Didn't I explain it clearly?<br>Okay...let's start again...</div>"
},
  it: {
    welcomeTitle: "Aroundo è felice di fare la tua conoscenza!",
    welcomeText: "Dai, ti faccio vedere come funziona.<br>Ti guido io.",
    whyTitle: "Per iniziare:<br>cosa stai guardando?",
    whyText: `Una mappa degli eventi che accadono intorno a te.<br>Così finalmente potrai scoprire...<br><div style="text-align:center;"><strong>COSA FARE!</strong></div>`,

    eventsTitle: "E tutti quei puntini...<br>cosa sono?",
    eventsText: `<div style="text-align: center;"><strong>Sono gli eventi!</strong></div>Con un click scopri subito cosa succede, a che ora inizia, quando finisce, chi organizza, ed altre informazioni utili.`,
    eventsTitle1: "Cliccando su More...",
    eventsText1: "Scopri ulteriori dettagli.<br>Il luogo preciso, una breve descrizione, eventuali locandine e...",

    categoriesTitle: "Questo è il menu Categorie!",
    categoriesText: "Aprendolo puoi selezionare i tuoi interessi e visualizzare sulla mappa solo gli eventi che corrispondono alle tue preferenze.",
    categoriesTitle1: "Quando apri il menu...",
    categoriesText1: "Vengono disattivate tutte le categorie.<br>Così le puoi scegliere liberamente.<br>Come vedi, sulla mappa sono spariti gli eventi.",
    categoriesTitle2: "Adesso...",
    categoriesText2: "Puoi selezionare le tue preferite.<br>Appariranno solo gli eventi corrispondenti.<br>Il selettore in alto, con un puntino, ti informerà che non tutto è attivo.",
    categoriesTitle3: "Riaprendo...",
    categoriesText3: "Troverai la tua selezione.<br>Puoi modificarla oppure, con un solo click sul selettore in alto, mostrare nuovamente tutto.",
    categoriesTitle4: "Perché i puntini cambiano?",
    categoriesText4: "Più un evento è vicino al suo orario di inizio, più sarà grande e...inizia a saltellare e poi...<br>Se è iniziato da poco, per breve tempo oscillerà ancora riducendosi.",

    timelineTitle: "Questi sono i giorni!",
    timelineText: "Puoi spostarti avanti ed indietro, scoprendo cosa accadrà o cosa è già successo.<br>Il puntino sotto al centro serve da reset.",
    timelineTitle1: "Queste le ore!",
    timelineText1: "Puoi selezionare l'ora di inizio e di fine degli eventi a cui sei interessato.",
    timelineTitle2: "Quindi per esempio...",
    timelineText2: "Puoi sapere cosa è successo ieri, cosa accadrà domani, dopodomani...in quella specifica zona della mappa, negli orari selezionati e solo delle categorie che ti interessano!",
    timelineTitle3: "Aroundo è...",
    timelineText3: `<div style="text-align:center;">Spazio-Temporale<br>Guadagna tempo.<br>È il tuo bene più prezioso!</div>`,
    
    finalTitle: "Adesso sei pronto!",
    finalText: `Scopri come vivere al meglio il <strong>TUO</strong> territorio con...<br><div style="text-align:center;"><strong>Aroundo</strong></div>`,
    restartText: `<div style="text-align:center;">Non mi sono spiegato?<br>Va bene...ricominciamo...</div>`
  }
};

    const browserLanguage = navigator.language .slice(0, 2) .toLowerCase();
    const lang = onboardingTexts[browserLanguage] ? browserLanguage : 'en';
    const t = onboardingTexts[lang];
   
    function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}
    window.aroundoOnboardingStart = function(markerData, mapInstance) {start(markerData, mapInstance);};

    /* Crea contenitore onboarding */
    function layerCreate() {
      layer = document.createElement('div');
      layer.id = 'onboarding-layer';
      document.body.appendChild(layer);
    }

    function cardShow(title, text, restartText = null) {
      const card = document.createElement('div');
      card.className = 'onboarding-card onboarding-welcome';
      card.innerHTML = `<div class="onboarding-title">${title}</div><div class="onboarding-subtitle">${text}</div>${restartText ? `<div class="onboarding-restart">${restartText}</div>` : ''}<button class="onboarding-next" disabled aria-label="Continua">&rarr;</button>`;
      layer.appendChild(card);
      onboardingNextReadyAt = Date.now() + onboardingReadingTime(title, text);
      requestAnimationFrame(() => {card.classList.add('visible');});
      const restart = card.querySelector('.onboarding-restart');
      if (restart) {
        restart.addEventListener('click', () => {
          onboardingRestart = true;
          cardHide();
          if (onboardingNext.resolve) {
            const resolve = onboardingNext.resolve;
            onboardingNext.resolve = null;
            wait(500).then(resolve);
          }
        });
      }
    }

    function cardHide() {
      const card = layer.querySelector('.onboarding-welcome');
      if (!card) {return;}
      card.classList.remove('visible');
      card.classList.add('hide');
      setTimeout(() => {card.remove();}, 500);
    }
  
    function bubbleShow(title, text, marker, mapInstance) {
      bubble = document.createElement('div');
      bubble.className = 'onboarding-card onboarding-bubble';
      bubble.innerHTML = `<div class="onboarding-title">${title}</div><div class="onboarding-subtitle">${text}</div><button class="onboarding-next" disabled aria-label="Continua">&rarr;</button>`;
      layer.appendChild(bubble);
      onboardingNextReadyAt = Date.now() + onboardingReadingTime(title, text);
      bubblePosition(marker, mapInstance);
      requestAnimationFrame(() => {bubble.classList.add('visible');});
    }

    function bubbleHide() {
      if (!bubble) {return;}
      const oldBubble = bubble;
      oldBubble.classList.remove('visible');
      oldBubble.classList.add('hide');
      setTimeout(() => {
        oldBubble.remove();
        if (bubble === oldBubble) {bubble = null;}
      }, 500);
    }
    
    /* Posiziona fumetto vicino al marker */
    function bubblePosition(marker, mapInstance) {
      if (!bubble) {return;}
      const latlng = marker.getLatLng();
      const point = mapInstance.latLngToContainerPoint(latlng);
      const mapRect = mapInstance.getContainer().getBoundingClientRect();
      const x = mapRect.left + point.x;
      const y = mapRect.top + point.y;
      const margin = 12;
      let left = x - bubble.offsetWidth / 2;
      let top = y + 40; // Spostamento in basso rispetto all'elemento selezionato
      if (window.innerWidth <= 520) {left = (window.innerWidth - bubble.offsetWidth) / 2;
      } else {const maxLeft = window.innerWidth - bubble.offsetWidth - margin;
        left = Math.max(margin, Math.min(left, maxLeft));
      }      
      const maxTop = window.innerHeight - bubble.offsetHeight - margin;
      top = Math.min(top, maxTop);
      bubble.style.left = `${left}px`;
      bubble.style.top = `${top}px`;
    }
   
    function highlight(element) {
      if (!element) {return null;}
      const rect = element.getBoundingClientRect();
      const effect = document.createElement('div');
      effect.className = 'onboarding-highlight';
      effect.style.left = `${rect.left + rect.width / 2}px`;
      effect.style.top = `${rect.top + rect.height / 2}px`;
      layer.appendChild(effect);
      return effect;
    }

    function highlightRemove(effect) {
      if (!effect) {return;}
      effect.remove();
    }

    function clickSim(element) {
      if (!element) {return;}
      element.classList.add('onboarding-click');
      setTimeout(() => {if (element) {element.classList.remove('onboarding-click');}}, 800);
    }
  
    /* Evidenzia marker */
    function markerHighlightShow(marker, mapInstance) {
      const latlng = marker.getLatLng();
      const point = mapInstance.latLngToContainerPoint(latlng);
      markerHighlight = document.createElement('div');
      markerHighlight.className = 'onboarding-highlight';
      markerHighlight.style.left = `${point.x}px`;
      markerHighlight.style.top = `${point.y}px`;
      layer.appendChild(markerHighlight);
    }

    /* Apertura Marker */
    function markerShow(markerData) {
      const marker = markerData.marker;
      const event = markerData.event;
      if (!event) {console.warn('Aroundo Onboarding: evento reale non trovato.');return;}
      window.openBasePopup(event, marker.getLatLng());
    }

    /* Aggiorna posizione evidenziazione */
    function markerHighlightUpdate(marker, mapInstance) {
      if (!markerHighlight) {return;}
      const latlng = marker.getLatLng();
      const point = mapInstance.latLngToContainerPoint(latlng);
      markerHighlight.style.left = `${point.x}px`;
      markerHighlight.style.top = `${point.y}px`;
    }

  
    /* Aspetta che la mappa abbia terminato il movimento */
    function flyToEvent(marker, mapInstance) {
      return new Promise(resolve => {
        const updatePosition = () => {markerHighlightUpdate(marker, mapInstance); bubblePosition(marker, mapInstance);};
        mapInstance.on('move', updatePosition);
        mapInstance.once('moveend', () => {mapInstance.off('move', updatePosition); markerHighlightUpdate(marker, mapInstance); bubblePosition(marker, mapInstance); resolve();});
        mapInstance.flyTo(marker.getLatLng(), ONBOARDING_ZOOM, {duration: 3.5, easeLinearity: 0.25});});
    }
  
    function categoryGet(position) {
      const checkboxes = document.querySelectorAll('#menu-items .category-checkbox');
      return checkboxes[position] || null;
    }

    function categorySelect(position) {
      const checkbox = categoryGet(position);
      if (!checkbox) {return;}
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', {bubbles: true}));
    }

    function categoriesSelectAll() {
      const toggle = document.getElementById('select-all-toggle');
      if (!toggle) {return;}
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change', {bubbles: true}));
    }

  //***** REGIA *****//
  async function start(markerData, mapInstance) {
    while (!window.gpsReady) {await wait(2000);}
    onboardingMarkerData = markerData;
    layerCreate();
    disableMapInteraction(mapInstance);
    onboardingOriginalCenter = mapInstance.getCenter();
    onboardingOriginalZoom = mapInstance.getZoom();
    
    cardShow(t.welcomeTitle, t.welcomeText);
    await onboardingNext("card");
    
    cardShow(t.whyTitle, t.whyText);
    await onboardingNext("card");
    
    if (!markerData || !markerData.marker) {console.log('Aroundo Onboarding: nessun evento disponibile.'); finish(mapInstance); return;} /*Nessun evento disponibile: non blocca Aroundo.*/
    bubbleShow(t.eventsTitle, t.eventsText, markerData.marker, mapInstance);
    markerHighlightShow(markerData.marker, mapInstance);
    await flyToEvent(markerData.marker, mapInstance);
    markerHighlightUpdate(markerData.marker, mapInstance);
    clickSim(markerHighlight); 
    await wait(500);
    highlightRemove(markerHighlight); markerHighlight = null;
    markerShow(markerData, mapInstance);
    await onboardingNext();
    
    bubbleShow(t.eventsTitle1, t.eventsText1, markerData.marker, mapInstance);
    const moreButton = [...document.querySelectorAll('.leaflet-popup button')] .find(button => button.textContent.trim() === 'More...');
    const moreHighlight = highlight(moreButton);
    await wait(3000);
    clickSim(moreButton);
    await wait(500);
    if (moreButton) {moreButton.click();}

const moreButtonRect = moreButton.getBoundingClientRect();
const markerRect = markerData.marker.getElement().getBoundingClientRect();
const gap = 12;
const targetY = 94 + moreButtonRect.height + gap;
const markerCenterY = markerRect.top + markerRect.height / 2;
const deltaY = markerCenterY - targetY;
const centerPoint = mapInstance.latLngToContainerPoint(markerData.marker.getLatLng());
centerPoint.y -= deltaY;
const moveMore = mapInstance.containerPointToLatLng(centerPoint);
    
    mapInstance.flyTo(moveMore, ONBOARDING_ZOOM, {duration: 0.4, easeLinearity: 0.25});
    await wait(500);
    bubblePosition(markerData.marker, mapInstance);
    highlightRemove(moreHighlight);
    await onboardingNext();
    
    mapInstance.closePopup();
    if (onboardingOriginalCenter !== null) {mapInstance.flyTo(onboardingOriginalCenter, 8, {duration: 3.5, easeLinearity: 0.25});}
    
    /*  Ricordarsi che nel DOM 'Categorie' deseleziona tutto se tutto è selezionato e che chiude 'Categorie' se si fa click fuori */ 
    cardShow(t.categoriesTitle, t.categoriesText,);
    const categoryButton = document.querySelector('#menu-toggle');
    const categoryHighlight = highlight(categoryButton);
    clickSim(categoryButton);
    await wait(500);
    if (categoryButton) {categoryButton.click();}
    categoriesSelectAll();
    await onboardingNext("card");
    highlightRemove(categoryHighlight);
    
    bubbleShow(t.categoriesTitle1, t.categoriesText1, markerData.marker, mapInstance);
    if (categoryButton) {categoryButton.click();}
    await onboardingNext();
    
    bubbleShow(t.categoriesTitle2, t.categoriesText2, markerData.marker, mapInstance);
    if (categoryButton) {categoryButton.click();}
    await wait(2000);
    
    const category12 = highlight(categoryGet(12).nextElementSibling);
    await wait(500);
    clickSim(categoryGet(12));
    await wait(500);
    categorySelect(12);
    await wait(500);
    highlightRemove(category12);
    await wait(500);
    
    const category3 = highlight(categoryGet(3).nextElementSibling);
    await wait(500);
    clickSim(categoryGet(3));
    await wait(500);
    categorySelect(3);
    await wait(500);
    highlightRemove(category3);
    await wait(500);
    
    const category1 = highlight(categoryGet(1).nextElementSibling);
    await wait(500);
    clickSim(categoryGet(1));
    await wait(500);
    categorySelect(1);
    await wait(500);
    highlightRemove(category1);
    await wait(500);
    
    const category0 = highlight(categoryGet(0).nextElementSibling);
    await wait(500);
    clickSim(categoryGet(0));
    await wait(500);
    categorySelect(0);
    await wait(500);
    highlightRemove(category0);
    const selectAllButton = document.getElementById('select-all-toggle');
    const selectAllHighlight = highlight(selectAllButton.parentElement);
    await onboardingNext();
    
    bubbleShow(t.categoriesTitle3, t.categoriesText3, markerData.marker, mapInstance);
    if (categoryButton) {categoryButton.click();}
    await wait(5000);
    await wait(500);
    clickSim(selectAllButton);
    await wait(500);
    categoriesSelectAll();
    await onboardingNext();
    highlightRemove(selectAllHighlight);

    if (onboardingOriginalCenter !== null) {mapInstance.flyTo(onboardingOriginalCenter, onboardingOriginalZoom, {duration: 3.5, easeLinearity: 0.25});}

    bubbleShow(t.categoriesTitle4, t.categoriesText4, markerData.marker, mapInstance);
    await wait(3000);
    await onboardingNext();

    cardShow(t.timelineTitle, t.timelineText);
    const prevDay = document.getElementById("prev-day");
    const nextDay = document.getElementById("next-day");
    const resetDay = document.getElementById("reset-day");
    
    const prevDayHighlight = highlight(prevDay);
    await wait(3000);
    clickSim(prevDay); await wait(1000);
    prevDay.click();
    clickSim(prevDay); await wait(1000);
    prevDay.click();
    highlightRemove(prevDayHighlight);

    const resetDayHighlight = highlight(resetDay);
    await wait(3000);
    clickSim(resetDay); await wait(1000);
    resetDay.click();
    highlightRemove(resetDayHighlight);

    const nextDayHighlight = highlight(nextDay);
    await wait(3000);
    clickSim(nextDay); await wait(1000);
    nextDay.click();
    clickSim(nextDay); await wait(1000);
    nextDay.click();
    clickSim(nextDay); await wait(1000);
    nextDay.click();
    const prevDayHighlight1 = highlight(prevDay);
    const resetDayHighlight1 = highlight(resetDay);
    await onboardingNext("card");
    highlightRemove(prevDayHighlight1);
    highlightRemove(resetDayHighlight1);
    highlightRemove(nextDayHighlight);
    

    bubbleShow(t.timelineTitle1, t.timelineText1, markerData.marker, mapInstance);
    const slider = document.getElementById('time-range');
    const handles = slider.querySelectorAll('.noUi-handle');
    const startHandle = handles[0];
    const endHandle = handles[1];
    const startHighlight = highlight(startHandle);
    await wait(3000);
    const values = slider.noUiSlider.get();
    const newStart = Number(values[0]) + 4;
    slider.noUiSlider.set([newStart, values[1]]);
    highlightRemove(startHighlight);
    await wait(1000);
    const endHighlight = highlight(endHandle);
    await wait(3000);
    const newEnd = Number(values[1]) - 12;
    slider.noUiSlider.set([newStart, newEnd]);
    highlightRemove(endHighlight);
    await wait(1000);
    const startHighlight1 = highlight(startHandle);
    const endHighlight1 = highlight(endHandle);
    await onboardingNext();
    highlightRemove(startHighlight1);
    highlightRemove(endHighlight1);
    
    bubbleShow(t.timelineTitle2, t.timelineText2, markerData.marker, mapInstance);
    await onboardingNext();
    
    cardShow(t.timelineTitle3, t.timelineText3);
    await onboardingNext("card");
    
    cardShow(t.finalTitle, t.finalText, t.restartText);
    await onboardingNext("card");
    resetDay.click();
    
    if (onboardingRestart) {onboardingRestart = false; finish(mapInstance); await start(onboardingMarkerData, mapInstance);} else {finish(mapInstance);}
  }

   function finish(mapInstance) {
      if (mapInstance) {mapInstance.closePopup();}
      if (markerHighlight) {markerHighlight.remove(); markerHighlight = null;}
      bubbleHide();
      cardHide();
      if (layer) {layer.remove(); layer = null;}
      enableMapInteraction(mapInstance);
    }

    function disableMapInteraction(map) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.eachLayer(layer => {if (layer instanceof L.Marker) {const element = layer.getElement(); if (element) {element.style.pointerEvents = 'none';}}});
    }
  
    function enableMapInteraction(map) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.eachLayer(layer => {if (layer instanceof L.Marker) {const element = layer.getElement();if (element) {element.style.pointerEvents = '';}}});
    }

    function onboardingNext(mode = "bubble") {
      return new Promise(async resolve => {
        onboardingNext.resolve = resolve;
        const next = layer.querySelector('.onboarding-next');
        if (!next) {console.warn('Aroundo onboarding: pulsante next non trovato.'); onboardingNext.resolve = null; resolve(); return;}
        const remaining = Math.max(0, onboardingNextReadyAt - Date.now());
        if (remaining > 0) {await wait(remaining);}
        next.disabled = false;
        next.onclick = () => {next.onclick = null; next.disabled = true; onboardingNext.resolve = null;
          if (mode === "card") {cardHide();
          } else {bubbleHide();}
          wait(500).then(resolve);};});
    }

    function onboardingReadingTime(title, text) {
      const cleanText = (title + " " + text)
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const words = cleanText ? cleanText.split(' ').length : 0;
      const readingTime = words / 2.8 * 1000; // Velocità di lettura
      const baseTime = 1000;
      const readingFactor = 0.20; // 0.30 più lento, 0.20 più veloce
      return baseTime + readingTime * readingFactor;
    }

})();
