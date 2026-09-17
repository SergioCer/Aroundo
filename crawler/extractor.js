const http=require("http"),https=require("https"),fs=require("fs"),{URL}=require("url");

function extract(url){return new Promise((resolve,reject)=>{const target=new URL(url),client=target.protocol==="https:"?https:http;
const request=client.get(target,{headers:{"User-Agent":"Mozilla/5.0 AroundoCrawler/1.0"}},response=>{let content="";response.setEncoding("utf8");
response.on("data",chunk=>content+=chunk);response.on("end",()=>resolve({status:response.statusCode,contentType:response.headers["content-type"]||null,url,content}));});
request.setTimeout(20000,()=>request.destroy(new Error("Timeout")));request.on("error",reject);});}

http.createServer(async(req,res)=>{const requestUrl=new URL(req.url,"http://localhost:3000");
if(!requestUrl.searchParams.has("url")){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});return res.end(fs.readFileSync(__dirname+"/crawler.html"));}
res.setHeader("Content-Type","application/json; charset=utf-8");
const url=requestUrl.searchParams.get("url");if(!url)return res.end(JSON.stringify({error:"URL mancante"}));
try{res.end(JSON.stringify(await extract(url)));}catch(error){res.end(JSON.stringify({error:error.message}));}}).listen(3000,()=>console.log("Crawler attivo sulla porta 3000"));

