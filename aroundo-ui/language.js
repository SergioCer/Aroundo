const supportedLanguages = [
    "en",
    "it",
    "fr",
    "de",
    "es",
    "ar",
    "zh"
];

let currentLanguage = "en";
async function loadLanguage(lang){
    if(!supportedLanguages.includes(lang)){
        lang = "en";
    }
    try {
        const module = await import(`./${lang}.js`);
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
        supportedLanguages.forEach(lang=>{
            const option =
                document.createElement("option");
            option.value = lang;
            option.textContent = lang.toUpperCase();
            selector.appendChild(option);
        });
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
