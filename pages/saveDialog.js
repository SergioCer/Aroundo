
/* SAVE DIALOG - Conferma salvataggio modifiche
   HTML + CSS + JavaScript in un unico file */

(function () {
  "use strict";
  let dialogResolve = null;
  let pendingPromise = null;
  
  // 1. CSS
  const css = `
    #saveDialog {
      display: none;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      z-index: 99999;
      align-items: center;
      justify-content: center;
    }

    #saveDialog .save-dialog-box {
      background: white;
      padding: 22px;
      border-radius: 12px;
      width: 300px;
      max-width: calc(100vw - 40px);
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      box-sizing: border-box;
    }

    #saveDialog .save-dialog-message {
      margin-bottom: 18px;
      font-weight: 600;
    }

    #saveDialog .save-dialog-buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    #saveDialog .save-dialog-buttons button {
      flex: 1;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }

    #saveDialog .save-dialog-yes {
      background: #22c55e;
    }

    #saveDialog .save-dialog-no {
      background: #ef4444;
    }

    #saveDialog .save-dialog-cancel {
      background: #9ca3af;
    }
  `;

  // 2. HTML
  const html = `
    <div id="saveDialog"
         role="dialog"
         aria-modal="true"
         aria-labelledby="saveDialogMessage">
      <div class="save-dialog-box">
        <div id="saveDialogMessage"
             class="save-dialog-message">
          Vuoi salvare le modifiche?
        </div>
        <div class="save-dialog-buttons">
          <button type="button" class="save-dialog-yes" data-action="yes">Yes</button>
          <button type="button" class="save-dialog-no" data-action="no">No</button>
          <button type="button" class="save-dialog-cancel" data-action="cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  // 3. Inizializzazione automatica
  function initSaveDialog() {
    // Evita di creare elementi duplicati
    if (document.getElementById("saveDialog")) {return;}
    // Inserisce il CSS
    const style = document.createElement("style");
    style.id = "saveDialogStyles";
    style.textContent = css;
    document.head.appendChild(style);
    // Inserisce l'HTML
    document.body.insertAdjacentHTML("beforeend", html);
    // Gestisce i tre pulsanti
    const dialog = document.getElementById("saveDialog");
    dialog.querySelectorAll("[data-action]").forEach(button => {button.addEventListener("click", function () {dialogAction(this.dataset.action);});});
  }
  
  // 4. Apertura del dialogo
  function askSaveDialog() {initSaveDialog();
    // Se è già aperto, riutilizza la Promise esistente
    if (pendingPromise) {return pendingPromise;}
    const dialog = document.getElementById("saveDialog");
    dialog.style.display = "flex";
    pendingPromise = new Promise(resolve => {dialogResolve = resolve;});
    return pendingPromise;
  }

  // 5. Gestione della scelta
  function dialogAction(type) {
    if (!dialogResolve) {return;}
    if (!["yes", "no", "cancel"].includes(type)) {return;}
    const dialog = document.getElementById("saveDialog");
    dialog.style.display = "none";
    const resolve = dialogResolve;
    dialogResolve = null;
    pendingPromise = null;
    resolve(type);
  }

  // 6. Funzioni disponibili nelle pagine HTML
  window.askSaveDialog = askSaveDialog;
  window.dialogAction = dialogAction;
  // Inizializza quando il DOM è disponibile
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSaveDialog, { once: true });
  } else {initSaveDialog();
  }
})();
