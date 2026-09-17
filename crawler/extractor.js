const http=require("http"),https=require("https"),fs=require("fs"),{URL}=require("url");

function clean(value){return value?value.replace(/\s+/g," ").trim():null;}

function extractMeta(html,selector){const m=html.match(selector);return m?clean(m[1]):null;}

function extractAll(html,regex){const out=[];let m;while((m=regex.exec(html))!==null)out.push(clean(m[1]));return [...new Set(out.filter(Boolean))];}

function extractJsonLd(html){
const blocks=extractAll(html,/<script[^>]*type=["']application/ld+json["'][^>]*>([\s\S]*?)</script>/gi),schema=[];
for(const block of blocks){
try{schema.push(JSON.parse(block));}
catch{try{schema.push(JSON.parse(block.replace(/<!--|-->/g,"").trim()));}catch{schema.push({raw:block});}}
}
return schema;
}

function collectEvents(value,out=[]){
if(Array.isArray(value)){value.forEach(item=>collectEvents(item,out));return out;}
if(!value||typeof value!=="object")return out;
const type=value["@type"];
if(type==="Event"||(Array.isArray(type)&&type.some(item=>String(item).toLowerCase()==="event")))out.push(value);
if(Array.isArray(value["@graph"]))value["@graph"].forEach(item=>collectEvents(item,out));
return out;
}

function normalize(url,html){
const title=extractMeta(html,/<title[^>]*>([\s\S]*?)</title>/i);
const description=extractMeta(html,/<meta[^>]+name=["']description["'][^>]+content=["']([^%22']*)["']/i);
const canonical=extractMeta(html,/<link[^>]+rel=["']canonical["'][^>]+href=["']([^%22']*)["']/i);
const ogTitle=extractMeta(html,/<meta[^>]+property=["']og:title[^>]+content=["']([^%22']*)["']/i);
const ogDescription=extractMeta(html,/<meta[^>]+property=["']og:description[^>]+content=["']([^%22']*)["']/i);
const ogImage=extractMeta(html,/<meta[^>]+property=["']og:image[^>]+content=["']([^%22']*)["']/i);
const ogUrl=extractMeta(html,/<meta[^>]+property=["']og:url[^>]+content=["']([^%22']*)["']/i);
const images=extractAll(html,/<img[^>]+src=["']([^%22']+)["']/gi);
const schema=extractJsonLd(html);
const eventi=collectEvents(schema);

return {
pagina:{url,canonical,title},
metadata:{title,description,og_title:ogTitle,og_description:ogDescription,og_image:ogImage,og_url:ogUrl},
immagini:images,
schema,
eventi
};
}

function extract(url){return new Promise((resolve,reject)=>{
const target=new URL(url),client=target.protocol==="https:"?https:http;
const request=client.get(target,{headers:{"User-Agent":"Mozilla/5.0 AroundoCrawler/1.0"}},response=>{
let content="";response.setEncoding("utf8");
response.on("data",chunk=>content+=chunk);
response.on("end",()=>resolve({acquisizione:{status:response.statusCode,contentType:response.headers["content-type"]||null,url},normalizzazione:normalize(url,content),content}));
});
request.setTimeout(20000,()=>request.destroy(new Error("Timeout")));
request.on("error",reject);
});}

http.createServer(async(req,res)=>{
const requestUrl=new URL(req.url,"[http://localhost:3000"),url=requestUrl.searchParams.get("url](http://localhost:3000%22%29,url=requestUrl.searchParams.get%28%22url)");
if(requestUrl.pathname==="/"&&!url){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});return res.end(fs.readFileSync(__dirname+"/crawler.html"));}
res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Content-Type","application/json; charset=utf-8");
if(!url)return res.end(JSON.stringify({error:"URL mancante"}));
try{res.end(JSON.stringify(await extract(url)));}catch(error){res.end(JSON.stringify({error:error.message}));}
}).listen(3000,()=>console.log("Crawler attivo sulla porta 3000"));
