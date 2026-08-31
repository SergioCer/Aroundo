/* AROUNDO — ONBOARDING — V1
   Sequenza:
   1. Welcome
   2. individua un evento reale
   3. flyTo verso l'evento
   4. apre il popup reale
   5. mostra spiegazione */

(function () {
  'use strict';
  const ONBOARDING_ZOOM = 13;
  let layer = null;
  let highlight = null;
  let bubble = null;
  let onboardingOriginalCenter = null;
  let onboardingOriginalZoom = null;
   
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
  async function showWelcome() {
    const welcome = document.createElement('div');
    welcome.className = 'onboarding-card onboarding-welcome';
    welcome.innerHTML = `
      <div class="onboarding-title">
        Aroundo onboarding...
      </div>
      <div class="onboarding-subtitle">
        Welcome!<br>
        Let me show you how it works.
      </div>
    `;
    layer.appendChild(welcome);
    // permette al browser di applicare lo stato iniziale
    requestAnimationFrame(() => {welcome.classList.add('visible');});
    await wait(4000);
    welcome.classList.remove('visible');
    welcome.classList.add('hide');
    await wait(500);
    welcome.remove();
  }

   /* Why Aroundo? */
   async function showWhyAroundo() {
     const why = document.createElement('div');
     why.className = 'onboarding-card onboarding-welcome';
     why.innerHTML = `
       <div class="onboarding-title">
         Why Aroundo?
       </div>
       <div class="onboarding-subtitle">
         A map of events happening around you.<br>
         Explore what's happening in your area.
       </div>
     `;
     layer.appendChild(why);
     requestAnimationFrame(() => {why.classList.add('visible');});
     await wait(4000);
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
   
      /* Apertura popup REALE di Aroundo */
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
      onboardingOriginalCenter = mapInstance.getCenter();
      onboardingOriginalZoom = mapInstance.getZoom();
      await wait(1500); /* Lascia terminare la finestra iniziale di Aroundo */
      await showWelcome(); /* 4,5'' */
      await showWhyAroundo(); /* 4,5'' */
      if (!markerData || !markerData.marker) {console.log('Aroundo Onboarding: nessun evento disponibile.'); finish(mapInstance); return;} /*Nessun evento disponibile: non blocca Aroundo.*/
      showMarkerHighlight(markerData.marker, mapInstance);
      await wait(500);
      showBubble('Events', 'Tap an event to discover what is happening around you.', markerData.marker, mapInstance);
      await wait(3000);
      await flyToEvent(markerData.marker, mapInstance); /* 3,5'' */
      updateMarkerHighlight(markerData.marker, mapInstance);
      openRealPopup(markerData, mapInstance);
      await wait(4000);
      hideBubble();
      mapInstance.closePopup();
      // Aggiungi altro
      showBubble('Aroundo', 'Have fun!', markerData.marker, mapInstance);
      await wait(5000);
      hideBubble();
      finish(mapInstance); /* total 26,5'' */
   }

   function finish(mapInstance) {
      if (mapInstance) {mapInstance.closePopup();}
      if (onboardingOriginalCenter !== null) {
      mapInstance.flyTo(onboardingOriginalCenter, onboardingOriginalZoom, {duration: 3.5, easeLinearity: 0.25});}
      if (highlight) {highlight.remove(); highlight = null;}
      hideBubble()
      if (layer) {setTimeout(() => {if (layer) {layer.remove(); layer = null;}}, 700);}
   }

})();
