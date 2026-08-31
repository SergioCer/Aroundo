/* AROUNDO — ONBOARDING — V1
   Sequenza:
   1. Welcome
   2. individua un evento reale
   3. flyTo verso l'evento
   4. apre il popup reale
   5. mostra spiegazione */

(function () {
  'use strict';
  const ONBOARDING_WELCOME_TIME = 3000;
  const ONBOARDING_ZOOM = 13;
  const ONBOARDING_FLY_DURATION = 2.5;
  let layer = null;
  let highlight = null;
  let bubble = null;

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
    welcome.className = 'onboarding-welcome';
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
    requestAnimationFrame(() => {
      welcome.classList.add('visible');
    });
    await wait(ONBOARDING_WELCOME_TIME);
    welcome.classList.remove('visible');
    welcome.classList.add('hide');
    await wait(450);
    welcome.remove();
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
    if (!highlight) {
      return;
    }
    const latlng = marker.getLatLng();
    const point = mapInstance.latLngToContainerPoint(latlng);
    highlight.style.left = `${point.x}px`;
    highlight.style.top = `${point.y}px`;
  }

  /* Mostra fumetto */
  async function showBubble(text, marker, mapInstance) {
    bubble = document.createElement('div');
    bubble.className = 'onboarding-bubble';
    bubble.textContent = text;
    layer.appendChild(bubble);
    positionBubble(marker, mapInstance);
    requestAnimationFrame(() => {
      bubble.classList.add('visible');
    });
    await wait(100);
  }

  /* Posiziona fumetto vicino al marker */
  function positionBubble(marker, mapInstance) {
    if (!bubble) {
      return;
    }
    const latlng = marker.getLatLng();
    const point = mapInstance.latLngToContainerPoint(latlng);
    const margin = 16;
    let left = point.x - bubble.offsetWidth / 2;
    let top = point.y - bubble.offsetHeight - 35;
    const maxLeft = window.innerWidth - bubble.offsetWidth - margin;
    left = Math.max(margin, Math.min(left, maxLeft));
    if (top < margin) {
      top = point.y + 35;
    }
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
  }

  /* Aspetta che la mappa abbia terminato il movimento */
  function flyToEvent(marker, mapInstance) {
    return new Promise(resolve => {
      const latlng = marker.getLatLng();
      mapInstance.once('moveend', resolve);
      mapInstance.flyTo(latlng, ONBOARDING_ZOOM, {duration: ONBOARDING_FLY_DURATION, easeLinearity: 0.25});
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
   
  /* Sequenza principale */
  async function start(markerData, mapInstance) {
    createLayer();
    /* 1 — Welcome */
    await showWelcome();
    /* Nessun evento disponibile:
     * non blocchiamo Aroundo. */
    if (!markerData || !markerData.marker) {
      console.log(
        'Aroundo Onboarding: nessun evento disponibile.'
      );
      finish();
      return;
    }
    /* 2 — evidenzia il marker */
    showMarkerHighlight(markerData.marker, mapInstance);
    await wait(1000);
    /* 3 — avvicinamento progressivo */
    await flyToEvent(markerData.marker, mapInstance);
    updateMarkerHighlight(markerData.marker, mapInstance);
    /* 4 — apertura del popup REALE */
    await wait(500);
    openRealPopup(markerData, mapInstance);
    /* 5 — spiegazione */
    await wait(1000);
    await showBubble(
      'Tap an event to discover what is happening around you.',
      markerData.marker, mapInstance
    );
    /* Lasciamo il fumetto visibile per qualche secondo. */
    await wait(5000);
    /* Fine V1 */
    finish();
  }

  /* Fine onboarding */
  function finish() {
    if (highlight) {
      highlight.remove();
      highlight = null;
    }
    if (bubble) {
      bubble.remove();
      bubble = null;
    }
    if (layer) {
      layer.remove();
      layer = null;
    }
    /* Per ora NON salviamo localStorage.
     * Durante i test vogliamo che l'onboarding
     * possa essere ripetuto. */
  }
})();
