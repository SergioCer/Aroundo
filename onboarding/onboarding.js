(function () {
  'use strict';
  const ONBOARDING_ZOOM = 13;
  let layer = null;
  let highlight = null;
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
    welcomeText: "Dai, ti faccio vedere come funziona.",
    whyTitle: "Per iniziare:<br>cosa stai guardando?",
    whyText: `Una mappa degli eventi che accadono intorno a te.<br>Così finalmente puoi scoprire<br><div style="text-align:center;"><strong>COSA FARE!</strong></div>`,
    eventsTitle: "E tutti quei puntini...<br>cosa sono?",
    eventsText: `<div style="text-align: center;"><strong>Sono gli eventi!</strong></div>Con un click scopri subito: cos'è, a che ora inizia, quando finisce, chi lo organizza, ed altre informazioni utili.`,
    eventsTitle1: "Ma non è finita qui!...",
    eventsText1: "Cliccando su More...<br>Scopri ulteriori dettagli.<br>E molte altre informazioni riferite all'evento.",
    moreTitle: "Ogni pulsante!",
    moreText: "Come Map<br>Esegue funzioni specifiche.<br>Come... avviare direttamente il tuo navigatore per raggiungere l'evento",
    moreTitle1: "Oppure",
    moreText1: "Sapere se l'accesso è gratuito, se a pagamento e quanto costa, ed infuturo...<br>chissà... prenotare...?",
    moreTitle2: "E se...",
    moreText2: "Hai intenzione di partecipare...<br>Semplicissimo...Dillo!<br>Inoltre se sei registrato...<br>puoi essere avvisato in tempo del suo inizio per non perderlo.",
    
    finalTitle: "Adesso sei pronto!",
    finalText: `Scopri come vivere al meglio il <strong>TUO</strong> territorio con...<br><div style="text-align:center;"><strong>Aroundo</strong></div>`,
    restartText: `<div style="text-align:center;">Non mi sono spiegato?<br>Va bene...ricominciamo...</div>`
  }
};

    const browserLanguage = navigator.language .slice(0, 2) .toLowerCase();
    const lang = onboardingTexts[browserLanguage] ? browserLanguage : 'en';
    const t = onboardingTexts[lang];
   
    function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

    /* Crea contenitore onboarding */
    function createLayer() {
      layer = document.createElement('div');
      layer.id = 'onboarding-layer';
      document.body.appendChild(layer);
    }

    /* Welcome */
    async function showWelcome(t) {
      const welcome = document.createElement('div');
      welcome.className = 'onboarding-card onboarding-welcome';
      welcome.innerHTML = `<div class="onboarding-title">${t.welcomeTitle}</div><div class="onboarding-subtitle">${t.welcomeText}</div>`;
      layer.appendChild(welcome);
      // permette al browser di applicare lo stato iniziale
      requestAnimationFrame(() => {welcome.classList.add('visible');});
      await wait(7000);
      welcome.classList.remove('visible');
      welcome.classList.add('hide');
      await wait(500);
      welcome.remove();
    }

   /* Why Aroundo? */
   async function showWhyAroundo(t) {
     const why = document.createElement('div');
     why.className = 'onboarding-card onboarding-welcome';
     why.innerHTML = `<div class="onboarding-title">${t.whyTitle}</div><div class="onboarding-subtitle">${t.whyText}</div>`;
     layer.appendChild(why);
     requestAnimationFrame(() => {why.classList.add('visible');});
     await wait(7000);
     why.classList.remove('visible');
     why.classList.add('hide');
     await wait(500);
     why.remove();
   }

    /* More... */
    async function showMore(markerData, mapInstance) {
      showBubble(t.moreTitle, t.moreText, markerData.marker, mapInstance);
      await wait(200);
      window.openDetailPopup(window.currentEvent, window.currentLatLng, false);
      await wait(200);
      const mapButton = document.querySelector('.map-btn');
      return highlightElement(mapButton);
    }

    function highlightElement(element) {
      if (!element) {return null;}
      const rect = element.getBoundingClientRect();
      const effect = document.createElement('div');
      effect.className = 'onboarding-highlight';
      effect.style.left = `${rect.left + rect.width / 2}px`;
      effect.style.top = `${rect.top + rect.height / 2}px`;
      layer.appendChild(effect);
      return effect;
    }
  
  /* Evidenzia marker */
  function showMarkerHighlight(marker, mapInstance) {
    const latlng = marker.getLatLng();
    const point = mapInstance.latLngToContainerPoint(latlng);
    highlight = document.createElement('div');
    highlight.className = 'onboarding-highlight';
    highlight.style.left = `${point.x}px`;
    highlight.style.top = `${point.y}px`;
    layer.appendChild(highlight);
  }

    /* Aggiorna posizione evidenziazione */
    function updateMarkerHighlight(marker, mapInstance) {
      if (!highlight) {return;}
      const latlng = marker.getLatLng();
      const point = mapInstance.latLngToContainerPoint(latlng);
      highlight.style.left = `${point.x}px`;
      highlight.style.top = `${point.y}px`;
    }

    function simulateClick(element) {
      if (!element) {return;}
      element.classList.add('onboarding-click');
      setTimeout(() => {if (element) {element.classList.remove('onboarding-click');}}, 800);
    }
  
    /* Mostra fumetto */
    function showBubble(title, text, marker, mapInstance, restartText = null) {
      bubble = document.createElement('div');
      bubble.className = 'onboarding-card onboarding-bubble';
      bubble.innerHTML = `<div class="onboarding-title">${title}</div><div class="onboarding-subtitle">${text}</div>${restartText ? `<div class="onboarding-restart">${restartText}</div>` : ''}`;
      layer.appendChild(bubble);
      positionBubble(marker, mapInstance);
      requestAnimationFrame(() => {bubble.classList.add('visible');});
      const restart = bubble.querySelector('.onboarding-restart');
      if (restart) {restart.addEventListener('click', async () => {onboardingRestart = true; await finish(mapInstance);});}
    }

      function hideBubble() {
         if (!bubble) {return;}
         const oldBubble = bubble;
         oldBubble.classList.remove('visible');
         oldBubble.classList.add('hide');
         setTimeout(() => {oldBubble.remove();
         if (bubble === oldBubble) {bubble = null;}}, 500);
      }

     /* Posiziona fumetto vicino al marker */
     function positionBubble(marker, mapInstance) {
       if (!bubble) {return;}
       const latlng = marker.getLatLng();
       const point = mapInstance.latLngToContainerPoint(latlng);
       const margin = 16;
       let left = point.x - bubble.offsetWidth / 2;
       let top = point.y + 150;
       const maxLeft = window.innerWidth - bubble.offsetWidth - margin;
       left = Math.max(margin, Math.min(left, maxLeft));
       bubble.style.left = `${left}px`;
       bubble.style.top = `${top}px`;
     }

     /* Aspetta che la mappa abbia terminato il movimento */
     function flyToEvent(marker, mapInstance) {
       return new Promise(resolve => {
         const latlng = marker.getLatLng();
         const updateHighlight = () => {updateMarkerHighlight(marker, mapInstance);};
          mapInstance.on('move', updateHighlight);
          mapInstance.once('moveend', () => {mapInstance.off('move', updateHighlight);
            updateMarkerHighlight(marker, mapInstance);
            resolve();
          });
          mapInstance.flyTo(latlng, ONBOARDING_ZOOM, {duration: 3.5, easeLinearity: 0.25});
        });
      }

      /* Apertura Marker */
      function showPopup(markerData) {
        const marker = markerData.marker;
        const event = markerData.event;
        if (!event) {console.warn('Aroundo Onboarding: evento reale non trovato.');return;}
        window.openBasePopup(event, marker.getLatLng());
      }

     window.aroundoOnboardingStart = function(markerData, mapInstance) {start(markerData, mapInstance);};
   
   /* Sequenza */
   async function start(markerData, mapInstance) {
      while (!window.gpsReady) {await wait(2000);}
      onboardingMarkerData = markerData;
      createLayer();
      disableMapInteraction(mapInstance);
      onboardingOriginalCenter = mapInstance.getCenter();
      onboardingOriginalZoom = mapInstance.getZoom();
      await showWelcome(t); 
      await showWhyAroundo(t);
      if (!markerData || !markerData.marker) {console.log('Aroundo Onboarding: nessun evento disponibile.'); finish(mapInstance); return;} /*Nessun evento disponibile: non blocca Aroundo.*/
      showMarkerHighlight(markerData.marker, mapInstance);
      await wait(500);
      showBubble(t.eventsTitle, t.eventsText, markerData.marker, mapInstance);
      await wait(7000);
      await flyToEvent(markerData.marker, mapInstance);
      updateMarkerHighlight(markerData.marker, mapInstance);
      simulateClick(highlight); await wait(500); // Effetto Click sul Marker
      if (highlight) {highlight.remove(); highlight = null;}
      showPopup(markerData, mapInstance); await wait(7000); hideBubble(); await wait(500);
      showBubble(t.eventsTitle1, t.eventsText1, markerData.marker, mapInstance); await wait(7000); hideBubble(); await wait(500);
      const mapHighlight = await showMore(markerData, mapInstance);
      await wait(7000);
      if (mapHighlight) {mapHighlight.remove();}
      hideBubble();
      await wait(500);
      showBubble(t.moreTitle1, t.moreText1, markerData.marker, mapInstance); await wait(7000); hideBubble(); await wait(500);
      showBubble(t.moreTitle2, t.moreText2, markerData.marker, mapInstance); await wait(7000);
      mapInstance.closePopup(); hideBubble();await wait(500);

      // Aggiungi altro
      showBubble(t.finalTitle, t.finalText, markerData.marker, mapInstance, t.restartText);
      await wait(10000);
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
      if (highlight) {highlight.remove(); highlight = null;}
      hideBubble();
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
    }
  
  function enableMapInteraction(map) {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
  }
   
})();
