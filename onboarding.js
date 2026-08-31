/* AROUNDO — ONBOARDING — V1
   Sequenza:
   1. Welcome
   2. individua un evento reale
   3. flyTo verso l'evento
   4. apre il popup reale
   5. mostra spiegazione */

(function () {
  'use strict';
  const ONBOARDING_WELCOME_TIME = 1800;
  const ONBOARDING_ZOOM = 13;
  const ONBOARDING_FLY_DURATION = 2.2;
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
        Aroundo Onboarding
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

  /* Trova il primo evento disponibile */
  function getDemoMarker() {
    if (!Array.isArray(markers) || markers.length === 0) {
      return null;
    }
    return markers[0];
  }

  /* Evidenzia marker */
  function showMarkerHighlight(marker) {
    const latlng = marker.getLatLng();
    const point = map.latLngToContainerPoint(latlng);
    highlight = document.createElement('div');
    highlight.className = 'onboarding-marker-highlight';
    highlight.style.left = `${point.x}px`;
    highlight.style.top = `${point.y}px`;
    layer.appendChild(highlight);
  }

  /* Aggiorna posizione evidenziazione */
  function updateMarkerHighlight(marker) {
    if (!highlight) {
      return;
    }
    const latlng = marker.getLatLng();
    const point = map.latLngToContainerPoint(latlng);
    highlight.style.left = `${point.x}px`;
    highlight.style.top = `${point.y}px`;
  }

  /* Mostra fumetto */
  async function showBubble(text, marker) {
    bubble = document.createElement('div');
    bubble.className = 'onboarding-bubble';
    bubble.textContent = text;
    layer.appendChild(bubble);
    positionBubble(marker);
    requestAnimationFrame(() => {
      bubble.classList.add('visible');
    });
    await wait(100);
  }

  /* Posiziona fumetto vicino al marker */
  function positionBubble(marker) {
    if (!bubble) {
      return;
    }
    const latlng = marker.getLatLng();
    const point = map.latLngToContainerPoint(latlng);
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
  function flyToEvent(marker) {
    return new Promise(resolve => {
      const latlng = marker.getLatLng();
      map.once('moveend', resolve);
      map.flyTo(
        latlng,
        ONBOARDING_ZOOM,
        {
          duration: ONBOARDING_FLY_DURATION,
          easeLinearity: 0.25
        }
      );
    });
  }

  /* Apertura popup REALE di Aroundo */
  function openRealPopup(markerData) {
    const marker = markerData.marker;
    /* Recuperiamo l'evento associato al marker.
     * Per la V1 usiamo l'indice corrispondente
     * alla struttura già presente in markers. */
    const markerIndex = markers.indexOf(markerData);
    if (
      markerIndex === -1 ||
      !events[markerIndex]
    ) {
      console.warn(
        'Aroundo Onboarding: evento demo non trovato.'
      );
      return;
    }
    const event = events[markerIndex];
    /* Utilizziamo direttamente la funzione reale
     * già presente in Aroundo. */
    window.openBasePopup(
      event,
      marker.getLatLng()
    );
  }

  /* Sequenza principale */
  async function start() {
    createLayer();
    /* 1 — Welcome */
    await showWelcome();
    /* 2 — aspettiamo che i marker siano realmente presenti */
    let demoMarker = null;
    for (let i = 0; i < 30; i++) {
      demoMarker = getDemoMarker();
      if (demoMarker) {
        break;
      }
      await wait(250);
    }
    /* Nessun evento disponibile:
     * non blocchiamo Aroundo. */
    if (!demoMarker) {
      console.log(
        'Aroundo Onboarding: nessun evento disponibile.'
      );
      finish();
      return;
    }
    /* 3 — evidenzia il marker */
    showMarkerHighlight(demoMarker.marker);
    await wait(500);
    /* 4 — avvicinamento progressivo */
    await flyToEvent(demoMarker.marker);
    updateMarkerHighlight(demoMarker.marker);
    /* 5 — apertura del popup REALE */
    await wait(300);
    openRealPopup(demoMarker);
    /* 6 — spiegazione */
    await wait(500);
    await showBubble(
      'Tap an event to discover what is happening around you.',
      demoMarker.marker
    );
    /* Lasciamo il fumetto visibile per qualche secondo. */
    await wait(4000);
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

  /* Avvio */
  start();
})();
