(function () {
  'use strict';
  const ONBOARDING_ZOOM = 13;
  let layer = null;
  let markerHighlight = null;
  let bubble = null;
  let onboardingOriginalCenter = null;
  let onboardingOriginalZoom = null;
  let onboardingRestart = false;
  let onboardingMarkerData = null;
  
   const onboardingTexts = {
  en: {
    welcomeTitle: "Aroundo",
    welcomeText: "Welcome!<br>Let me show you how it works.",
    whyTitle: "Why Aroundo?",
    whyText: "A map of events happening around you.<br>Explore what's happening in your area.",
    eventsTitle: "Events",
    eventsText: "Tap an event to discover what is happening around you.",
    finalTitle: "Aroundo",
    finalText: "You are ready!<br>Discover what's Around•you.",
    restartText: "not clear? Restart!"
  },
  it: {
    welcomeTitle: "Aroundo è felice di fare la tua conoscenza!",
    welcomeText: "Dai, ti faccio vedere come funziona.<br><br>Ti guido io.",
    whyTitle: "Per iniziare:<br>cosa stai guardando?",
    whyText: `Una mappa degli eventi che accadono intorno a te.<br>Così finalmente potrai scoprire<br><div style="text-align:center;"><strong><br>COSA FARE!</strong></div>`,
    eventsTitle: "E tutti quei puntini...<br>cosa sono?",
    eventsText: `<div style="text-align: center;"><strong>Sono gli eventi!</strong></div>Con un click scopri subito: cos'è, a che ora inizia, quando finisce, chi lo organizza, ed altre informazioni utili.`,
    eventsTitle1: "Cliccando su More...",
    eventsText1: "Scopri ulteriori dettagli.<br>Il luogo preciso, una breve desrizione, eventuali locandine ed in più...",
    moreTitle: "Deversi pulsanti!",
    moreText: "Come Map...<br>Che Eseguono funzioni specifiche.<br>Per esempio...<br>Avviare direttamente il tuo navigatore per raggiungere l'evento.",
    moreTitle1: "Oppure",
    moreText1: "Sapere se l'accesso è gratuito o a pagamento, quanto costa, ed in futuro...<br>chissà... prenotare...?",
    moreTitle2: "E se...",
    moreText2: "Volessi partecipare...<br>Basta...Dirlo!<br>Così, se sei registrato, puoi essere avvisato in tempo.",
    categoriesTitle: "Questo è il menu Categorie!",
    categoriesText: "Aprendolo puoi selezionare i tuoi interessi.<br>E visualizzare sulla mappa solo gli eventi che corrispondono alle tue preferenze.",
    categoriesTitle1: "Quando apri il menu...",
    categoriesText1: "Vengono disattivate tutte le catogorie.<br>Lasciandoti libertà di scegliere.<br>Come noti, infatti, sono spariti tutti gli eventi! ma non preoccuparti.",
    categoriesTitle2: "Se non selezioni nulla?",
    categoriesText2: "Nessun problema.<br>Chiudendo il menu, puoi anche fare click sulla mappa, verranno mostrati nuovamente tutti gli eventi di tutte le categorie.",
    categoriesTitle3: "Oppure...",
    categoriesText3: "Seleziona le tue preferite.<br>Appariranno solo gli eventi corrispondenti. Il selettore in alto ti informerà che non tutto è attivo.",
    categoriesTitle4: "Se hai fatto una selezione?",
    categoriesText4: "Verrà sempre mantenuta.<br>E fino a quando non cambi, vedrai solo i tuoi eventi preferiti.",
    categoriesTitle5: "Riaprendo infatti...",
    categoriesText5: "Troverai la tua selezione.<br>Se vuoi, puoi modificarle o reimpostare tutte le categorie con un solo click sul selettore in alto.",
    categoriesTitle6: "In questo modo,",
    categoriesText6: "tutti gli eventi di tutte le categorie saranno nuovamente visibili sulla mappa, come quando avii Aroundo.",
    timelineTitle: "Questa è la Linea del Tempo!",
    timelineText: "Grazie a questa puoi spostarti avanti ed indietro nei giorni, scoprendo cosa accadrà o cosa è gia successo.",
    timelineTitle1: "E con le maniglie...",
    timelineText1: "Puoi stabilire l'ora di inizio e di fine degli eventi a cui sei interessato!",
    timelineTitle2: "Quindi per esempio...",
    timelineText2: "Se vuoi sapere ieri...domani...dopodomani...tra un mese, in quella specifica zona della mappa, dopo le xx e prima delle yy quali eventi ci sono delle categorie che ti interessano.",
    timelineTitle3: "Tutto è sotto il tuo controllo",
    timelineText3: "Non dovrai mai più cercare tra manifesti, social, gruppi, riviste, ricordare dove hai visto, chiedere ad amici, sfogliare pagine e pagine...",
    timelineTitle4: "Aroundo è",
    timelineText4: "Spazio-Temporale<br>grazie a tutte queste combinazioni, saprai sempre cosa fare!<br>Guadagna il tuo tempo, è il bene più prezioso.",
    
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

    function cardShow(title, text) {
      const card = document.createElement('div');
      card.className = 'onboarding-card onboarding-welcome';
      card.innerHTML = `<div class="onboarding-title">${title}</div><div class="onboarding-subtitle">${text}</div>`;
      layer.appendChild(card);
      requestAnimationFrame(() => {card.classList.add('visible');});
    }

    function cardHide() {
      const card = layer.querySelector('.onboarding-welcome');
      if (!card) {return;}
      card.classList.remove('visible');
      card.classList.add('hide');
      setTimeout(() => {card.remove();}, 500);
    }
  
    function bubbleShow(title, text, marker, mapInstance, restartText = null) {
      bubble = document.createElement('div');
      bubble.className = 'onboarding-card onboarding-bubble';
      bubble.innerHTML = `<div class="onboarding-title">${title}</div><div class="onboarding-subtitle">${text}</div>${restartText ? `<div class="onboarding-restart">${restartText}</div>` : ''}`;
      layer.appendChild(bubble);
      bubblePosition(marker, mapInstance);
      requestAnimationFrame(() => {bubble.classList.add('visible');});
      const restart = bubble.querySelector('.onboarding-restart');
      if (restart) {restart.addEventListener('click', async () => {onboardingRestart = true; await finish(mapInstance);});}
    }

    function bubbleHide() {
      if (!bubble) {return;}
      const oldBubble = bubble;
      oldBubble.classList.remove('visible');
      oldBubble.classList.add('hide');
      setTimeout(() => {oldBubble.remove();
      if (bubble === oldBubble) {bubble = null;}}, 500);
    }

    /* Posiziona fumetto vicino al marker */
    function bubblePosition(marker, mapInstance) {
      if (!bubble) {return;}
      const latlng = marker.getLatLng();
      const point = mapInstance.latLngToContainerPoint(latlng);
      const mapRect = mapInstance.getContainer().getBoundingClientRect();
      const x = mapRect.left + point.x;
      const y = mapRect.top + point.y;
      const margin = 16;
      let left = point.x - bubble.offsetWidth / 2;
      let top = point.y + 130;
      const maxLeft = window.innerWidth - bubble.offsetWidth - margin;
      left = Math.max(margin, Math.min(left, maxLeft));
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
         const latlng = marker.getLatLng();
         const updateHighlight = () => {markerHighlightUpdate(marker, mapInstance);};
          mapInstance.on('move', updateHighlight);
          mapInstance.once('moveend', () => {mapInstance.off('move', updateHighlight);
            markerHighlightUpdate(marker, mapInstance);
            resolve();
          });
          mapInstance.flyTo(latlng, ONBOARDING_ZOOM, {duration: 3.5, easeLinearity: 0.25});
        });
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

  /* Regia */
  async function start(markerData, mapInstance) {
    while (!window.gpsReady) {await wait(2000);}
    onboardingMarkerData = markerData;
    layerCreate();
    disableMapInteraction(mapInstance);
    onboardingOriginalCenter = mapInstance.getCenter();
    onboardingOriginalZoom = mapInstance.getZoom();
    cardShow(t.welcomeTitle, t.welcomeText);
    await wait(10000);
    cardHide();
    await wait(500);
    cardShow(t.whyTitle, t.whyText);
    await wait(10000);
    cardHide();
    await wait(500);
    if (!markerData || !markerData.marker) {console.log('Aroundo Onboarding: nessun evento disponibile.'); finish(mapInstance); return;} /*Nessun evento disponibile: non blocca Aroundo.*/
    bubbleShow(t.eventsTitle, t.eventsText, markerData.marker, mapInstance);
    await wait(3000);
    markerHighlightShow(markerData.marker, mapInstance);
    await wait(9000);
    await flyToEvent(markerData.marker, mapInstance);
    markerHighlightUpdate(markerData.marker, mapInstance);
    clickSim(markerHighlight); 
    await wait(500);
    highlightRemove(markerHighlight); markerHighlight = null;
    markerShow(markerData, mapInstance);
    await wait(3000);
    bubbleHide(); 
    await wait(500);
    bubbleShow(t.eventsTitle1, t.eventsText1, markerData.marker, mapInstance);
    await wait(3000);
    const moreButton = [...document.querySelectorAll('.leaflet-popup button')] .find(button => button.textContent.trim() === 'More...');
    const moreHighlight = highlight(moreButton);
    await wait(6000);
    clickSim(moreButton);
    await wait(500);
    if (moreButton) {moreButton.click();}
    highlightRemove(moreHighlight);
    await wait(5000);
    bubbleHide(); 
    await wait(500);
    bubbleShow(t.moreTitle, t.moreText, markerData.marker, mapInstance);
    await wait(2000); 
    const mapButton = document.querySelector('.map-btn');
    const mapHighlight = highlight(mapButton);
    await wait(9000); 
    highlightRemove(mapHighlight);
    bubbleHide();
    await wait(500);
    bubbleShow(t.moreTitle1, t.moreText1, markerData.marker, mapInstance); 
    await wait(10000); 
    bubbleHide();
    await wait(500);
    bubbleShow(t.moreTitle2, t.moreText2, markerData.marker, mapInstance);
    const bookButton = document.querySelector('.book-btn');
    const bookHighlight = highlight(bookButton);
    await wait(9000);
    highlightRemove(bookHighlight);
    mapInstance.closePopup(); 
    bubbleHide();
    await wait(500);
    
    cardShow(t.categoriesTitle, t.categoriesText, markerData.marker, mapInstance);
    const categoryButton = document.querySelector('#menu-toggle');
    const categoryHighlight = highlight(categoryButton);
    await wait(4000);
    clickSim(categoryButton);
    await wait(500);
    highlightRemove(categoryHighlight);
    if (categoryButton) {categoryButton.click();}
    await wait(7000);
    cardHide();
    await wait(500);
    bubbleShow(t.categoriesTitle1, t.categoriesText1, markerData.marker, mapInstance);
    await wait(9000);
    bubbleHide();
    await wait(500);
    bubbleShow(t.categoriesTitle2, t.categoriesText2, markerData.marker, mapInstance);
    await wait(3000);
    if (categoryButton) {categoryButton.click();}
    await wait(7000);
    bubbleHide();
    await wait(500);
    bubbleShow(t.categoriesTitle3, t.categoriesText3, markerData.marker, mapInstance);
    if (categoryButton) {categoryButton.click();}

    await wait(2000);
    const category0 = highlight(categoryGet(0));
    await wait(6000);
    clickSim(categoryGet(0));
    await wait(500);
    categorySelect(0);
    await wait(1000);
    highlightRemove(category0);
    
    await wait(500);
    const category1 = highlight(categoryGet(1));
    await wait(1000);
    clickSim(categoryGet(1));
    await wait(500);
    categorySelect(1);
    await wait(500);
    highlightRemove(category1);
    
    await wait(500);
    const category6 = highlight(categoryGet(6));
    await wait(1000);
    clickSim(categoryGet(6));
    await wait(500);
    categorySelect(6);
    await wait(500);
    highlightRemove(category6);
    
    await wait(500);
    const category11 = highlight(categoryGet(11));
    await wait(1000);
    clickSim(categoryGet(11));
    await wait(500);
    categorySelect(11);
    await wait(500);
    highlightRemove(category11);
    
    await wait(8000);
    bubbleHide();
    await wait(500);
    bubbleShow(t.categoriesTitle4, t.categoriesText4, markerData.marker, mapInstance);
    await wait(8000);
    if (categoryButton) {categoryButton.click();}
    bubbleHide();
    await wait(500);

    bubbleShow(t.categoriesTitle5, t.categoriesText5, markerData.marker, mapInstance);
    await wait(2000);
    if (categoryButton) {categoryButton.click();}
    const selectAllButton = document.getElementById('select-all-toggle');
    const selectAllHighlight = highlight(selectAllButton);
    await wait(6000);
    clickSim(selectAllButton);
    await wait(500);
    categoriesSelectAll();
    await wait(4000);
    bubbleHide();
    await wait(500);
    bubbleShow(t.categoriesTitle6, t.categoriesText6, markerData.marker, mapInstance);
    highlightRemove(selectAllHighlight);
    if (categoryButton) {categoryButton.click();}
    await wait(6000);
    bubbleHide();
    await wait(500);

    cardShow(t.timelineTitle, t.timelineText, markerData.marker, mapInstance);
    await wait(10000);
    cardHide();
    bubbleShow(t.timelineTitle1, t.timelineText1, markerData.marker, mapInstance);
    await wait(10000);
    bubbleHide();
    bubbleShow(t.timelineTitle2, t.timelineText2, markerData.marker, mapInstance);
    await wait(10000);
    bubbleHide();
    bubbleShow(t.timelineTitle3, t.timelineText3, markerData.marker, mapInstance);
    await wait(10000);
    bubbleHide();
    bubbleShow(t.timelineTitle4, t.timelineText4, markerData.marker, mapInstance);
    await wait(10000);
    bubbleHide();

    
    bubbleShow(t.finalTitle, t.finalText, markerData.marker, mapInstance, t.restartText);
    await wait(12000);
    if (onboardingRestart) {
      onboardingRestart = false;
      await start(onboardingMarkerData, mapInstance);
    } else {
      finish(mapInstance);
    }
  }

   function finish(mapInstance) {
      if (mapInstance) {mapInstance.closePopup();}
      if (onboardingOriginalCenter !== null) {
      mapInstance.flyTo(onboardingOriginalCenter, onboardingOriginalZoom, {duration: 3.5, easeLinearity: 0.25});}
      if (markerHighlight) {markerHighlight.remove(); markerHighlight = null;}
      bubbleHide();
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
        map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const element = layer.getElement();
      if (element) {
        element.style.pointerEvents = 'none';
      }
    }
  });
    }
  
    function enableMapInteraction(map) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
        map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const element = layer.getElement();
      if (element) {
        element.style.pointerEvents = '';
      }
    }
  });
    }
 
})();
