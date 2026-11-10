export function sameOrigin(request:Request){
 const origin=request.headers.get("origin"),host=request.headers.get("host");if(!origin||!host)return false;
 try{const url=new URL(origin);return ["http:","https:"].includes(url.protocol)&&url.protocol===new URL(request.url).protocol&&url.host===host&&!url.username&&!url.password;}catch{return false;}
}
export function loopbackHost(request:Request){try{return ["localhost","127.0.0.1","[::1]"].includes(new URL("http://"+request.headers.get("host")).hostname);}catch{return false;}}
