const supportedLanguages = {
    en: {
        file: "en.js",
        name: "English",
        direction:"ltr"
    },
    it: {
        file: "it.js",
        name: "Italiano",
        direction:"ltr"
    },
    fr: {
        file: "fr.js",
        name: "Français",
        direction:"ltr"
    },
    de: {
        file: "de.js",
        name: "Deutsch",
        direction:"ltr"
    },
    es: {
        file: "es.js",
        name: "Español",
        direction:"ltr"
    },
    ar: {
        file: "ar.js",
        name: "العربية",
        direction:"rtl"
    },
    zh: {
        file: "zh.js",
        name: "中文",
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
    document.documentElement.dir = dictionary.direction || "ltr";
    document.documentElement.lang = lang;
}

function detectLanguage(){
    const saved = localStorage.getItem("aroundo-language");
    if(saved && supportedLanguages.includes(saved)){
        return saved;
    }
    const browserLanguage =
        navigator.language
        .split("-")[0];
    if(supportedLanguages.includes(browserLanguage)){
        return browserLanguage;
    }
    return "en";
}

async function initLanguage(){
    const language = detectLanguage();
    await translatePage(language);
    const selector =
        document.getElementById("languageSelector");
    if(selector){
        selector.innerHTML = "";
        for (const lang of supportedLanguages){
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
    }
}
export {
    initLanguage
};
