/* AROUNDO — ONBOARDING */

(function () {
  'use strict';
  const ONBOARDING_ZOOM = 13;
  let layer = null;
  let highlight = null;
  let bubble = null;
  let onboardingOriginalCenter = null;
  let onboardingOriginalZoom = null;

   const onboardingTexts = {
  en: {
    welcomeTitle: "Aroundo",
    welcomeText: "Welcome!<br>Let me show you how it works.",
    whyTitle: "Why Aroundo?",
    whyText: "A map of events happening around you.<br>Explore what's happening in your area.",
    eventsTitle: "Events",
    eventsText: "Tap an event to discover what is happening around you.",
    finalTitle: "Aroundo",
    finalText: "You are ready!<br>Discover what's Around•you."
  },
  it: {
    welcomeTitle: "Aroundo",
    welcomeText: "Benvenuto!<br>Ti mostro come funziona.",
    whyTitle: "Perché Aroundo?",
    whyText: "Una mappa degli eventi intorno a te.<br>Scopri cosa succede nella tua zona.",
    eventsTitle: "Eventi",
    eventsText: "Tocca un evento per scoprire i suoi dettagli.",
    finalTitle: "Aroundo",
    finalText: "Adesso sei pronto!<br>Scopri come vivere al meglio il territorio."
  }
};

   const browserLanguage = navigator.language
     .slice(0, 2)
     .toLowerCase();
   const lang = onboardingTexts[browserLanguage]
     ? browserLanguage
     : 'en';
   const t = onboardingTexts[lang];
   
  /* Utility */
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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
    welcome.innerHTML = `
      <div class="onboarding-title">
        ${t.welcomeTitle}
      </div>
      <div class="onboarding-subtitle">
        ${t.welcomeText}
      </div>
    `;
    layer.appendChild(welcome);
    // permette al browser di applicare lo stato iniziale
    requestAnimationFrame(() => {welcome.classList.add('visible');});
    await wait(5000);
    welcome.classList.remove('visible');
    welcome.classList.add('hide');
    await wait(500);
    welcome.remove();
  }

   /* Why Aroundo? */
   async function showWhyAroundo(t) {
     const why = document.createElement('div');
     why.className = 'onboarding-card onboarding-welcome';
     why.innerHTML = `
      <div class="onboarding-title">
        ${t.whyTitle}
      </div>
      <div class="onboarding-subtitle">
        ${t.whyText}
      </div>
     `;
     layer.appendChild(why);
     requestAnimationFrame(() => {why.classList.add('visible');});
     await wait(5000);
     why.classList.remove('visible');
     why.classList.add('hide');
     await wait(500);
     why.remove();
   }
   
  /* Evidenzia marker */
  function showMarkerHighlight(marker, mapInstance) {
    const latlng = marker.getLatLng();
    const point = mapInstance.latLngToContainerPoint(latlng);
    highlight = document.createElement('div');
    highlight.className = 'onboarding-marker-highlight';
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

     /* Mostra fumetto */
     function showBubble(title, text, marker, mapInstance) {
       bubble = document.createElement('div');
       bubble.className = 'onboarding-card onboarding-bubble';
         bubble.innerHTML = `
          <div class="onboarding-title">
            ${title}
          </div>
          <div class="onboarding-subtitle">
            ${text}
          </div>
        `;
       layer.appendChild(bubble);
       positionBubble(marker, mapInstance);
       requestAnimationFrame(() => {bubble.classList.add('visible');});
     }

      function hideBubble() {
         if (!bubble) {return;}
         const oldBubble = bubble;
         oldBubble.classList.remove('visible');
         oldBubble.classList.add('hide');
         setTimeout(() => {oldBubble.remove();
         if (bubble === oldBubble) {bubble = null;}}, 800);
      }

     /* Posiziona fumetto vicino al marker */
     function positionBubble(marker, mapInstance) {
       if (!bubble) {return;}
       const latlng = marker.getLatLng();
       const point = mapInstance.latLngToContainerPoint(latlng);
       const margin = 16;
       let left = point.x - bubble.offsetWidth / 2;
       let top = point.y + 125;
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

function markerClickEffect() {
  console.log("MARKER CLICK EFFECT");
  if (!highlight) {
    console.log("highlight mancante");
    return;
  }
  highlight.classList.remove('click');
  void highlight.offsetWidth;
  highlight.classList.add('click');
  setTimeout(() => {
    if (highlight) {
      highlight.classList.remove('click');
    }
  }, 700);
}
  
      /* Apertura Marker */
      function openRealPopup(markerData) {
        const marker = markerData.marker;
        const event = markerData.event;
        if (!event) {console.warn('Aroundo Onboarding: evento reale non trovato.');return;}
        window.openBasePopup(event, marker.getLatLng());
      }

   window.aroundoOnboardingStart = function(markerData, mapInstance) {start(markerData, mapInstance);};
   
   /* Sequenza */
   async function start(markerData, mapInstance) {
      createLayer();
      disableMapInteraction(mapInstance);
      onboardingOriginalCenter = mapInstance.getCenter();
      onboardingOriginalZoom = mapInstance.getZoom();
      await wait(1500); /* Lascia terminare la finestra iniziale di Aroundo */
      await showWelcome(t); /* 5,5'' */
      await showWhyAroundo(t); /* 5,5'' */
      if (!markerData || !markerData.marker) {console.log('Aroundo Onboarding: nessun evento disponibile.'); finish(mapInstance); return;} /*Nessun evento disponibile: non blocca Aroundo.*/
      showMarkerHighlight(markerData.marker, mapInstance);
      await wait(500);
      showBubble(t.eventsTitle, t.eventsText, markerData.marker, mapInstance);
      await wait(2000);
      await flyToEvent(markerData.marker, mapInstance); /* 3,5'' */
      updateMarkerHighlight(markerData.marker, mapInstance);
      markerClickEffect(); // Effetto Click sul Marker
      await wait(500);
      openRealPopup(markerData, mapInstance);
      await wait(3000);
      hideBubble();
      mapInstance.closePopup();
      // Aggiungi altro
      showBubble(t.finalTitle, t.finalText, markerData.marker, mapInstance);
      await wait(1500);
      finish(mapInstance); /* total 23,0'' width End*/
   }

   function finish(mapInstance) {
      if (mapInstance) {mapInstance.closePopup();}
      if (onboardingOriginalCenter !== null) {
      mapInstance.flyTo(onboardingOriginalCenter, onboardingOriginalZoom, {duration: 3.5, easeLinearity: 0.25});}
      if (highlight) {highlight.remove(); highlight = null;}
         setTimeout(() => {hideBubble();
      if (layer) {layer.remove(); layer = null;}}, 3500);
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
