const supportedLanguages = {
    en: {
        file: "en.js",
        direction:"ltr"
    },
    it: {
        file: "it.js",
        direction:"ltr"
    },
    fr: {
        file: "fr.js",
        direction:"ltr"
    },
    de: {
        file: "de.js",
        direction:"ltr"
    },
    es: {
        file: "es.js",
        direction:"ltr"
    },
    ar: {
        file: "ar.js",
        direction:"rtl"
    },
    zh: {
        file: "zh.js",
        direction:"ltr"
    }
};

let currentLanguage = "en";
async function loadLanguage(lang){
    if(!supportedLanguages[lang]){
        lang = "en";
    }
    try {
        const module = await import(`./${supportedLanguages[lang].file}`);
        currentLanguage = lang;
        return module.default;
    } catch(error){
        console.warn(
            "Language not available:",
            lang,
            "Using English"
        );
        const module = await import("./en.js");
        currentLanguage = "en";
        return module.default;
    }
}

async function translatePage(lang){
    const dictionary = await loadLanguage(lang);
    document.querySelectorAll("[data-lang]").forEach(element=>{
        const key = element.getAttribute("data-lang");
        if(dictionary[key]){
            element.textContent = dictionary[key];
        }
    });
    document.documentElement.dir = supportedLanguages[lang].direction || "ltr";
    document.documentElement.lang = lang;
}

function detectLanguage(){
    const saved = localStorage.getItem("aroundo-language");
    if(saved && supportedLanguages[saved]){
        return saved;
    }
    const browserLanguage =
        navigator.language
        .split("-")[0];
    if(supportedLanguages[browserLanguage]){
        return browserLanguage;
    }
    return "en";
}

async function initLanguage(){
    const language = detectLanguage();
    await translatePage(language);
    // CANCELLARE vecchia vesione const selector =
    //    document.getElementById("languageSelector");
        const button =
    document.getElementById("languageButton");
const menu =
    document.getElementById("languageMenu");
if(button && menu){
    button.textContent =
        (await import(`./${language}.js`))
        .default
        .languageName
        + " ▼";
    menu.innerHTML = "";
    for (const lang of Object.keys(supportedLanguages)){
        try {
            const module =
                await import(`./${lang}.js`);
            const option =
                document.createElement("button");
            option.textContent =
                module.default.languageName;
            option.addEventListener("click", async ()=>{
                localStorage.setItem(
                    "aroundo-language",
                    lang
                );
                menu.style.display="none";
                await translatePage(lang);
                const updated =
                    await import(`./${lang}.js`);
                button.textContent =
                    updated.default.languageName
                    + " ▼";
            });
            menu.appendChild(option);
        } catch(error){
            console.warn(
                "Missing language file:",
                lang
            );
        }
    }
    button.addEventListener("click",()=>{
        menu.style.display =
            menu.style.display === "block"
            ? "none"
            : "block";
    });
    document.addEventListener("click",(event)=>{
        if(!event.target.closest(".language-selector")){
            menu.style.display="none";
        }
    });
}
    
   /* CANCELLARE vecchia gestione menu selettore lingue 
    if(selector){
        selector.innerHTML = "";
        for (const lang of Object.keys(supportedLanguages)){
            try {
                const module = await import(`./${lang}.js`);
                const option =
                    document.createElement("option");
                option.value = lang;
                option.textContent =
                    module.default.languageName;
                selector.appendChild(option);
            } catch(error){
                console.warn(
                    "Missing language file:",
                    lang
                );
            }
        }
        selector.value = language;
        selector.addEventListener("change", async ()=>{
            const newLanguage = selector.value;
            localStorage.setItem(
                "aroundo-language",
                newLanguage
            );
            await translatePage(newLanguage);
        });
    }  fino a qui */
}

export {
    initLanguage
};
