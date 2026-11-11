export type AccountIdentity={role:string;carrier_id?:string|null};
export function accountDestination(profile:AccountIdentity|null){return !profile?"/login":profile.role==="admin"?"/admin":profile.carrier_id?"/app":"/account";}
export function safeAuthPath(value:string){
 if(!value.startsWith("/")||value.startsWith("//")||/[\\\u0000-\u001f]/.test(value))return "/dashboard";
 try{const decoded=decodeURIComponent(value);if(decoded.startsWith("//")||/[\\\u0000-\u001f]/.test(decoded))return "/dashboard";const url=new URL(value,"https://account.invalid");return url.origin==="https://account.invalid"?url.pathname+url.search+url.hash:"/dashboard";}catch{return "/dashboard";}
}
export function signupPayload(fullName:string,email:string,password:string,origin:string){
 const name=fullName.trim(),address=email.trim().toLowerCase();
 if(name.length<2||name.length>120)throw Error("Enter your name (2–120 characters).");
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||address.length>254)throw Error("Enter a valid email address.");
 if(password.length<10||password.length>128)throw Error("Use a password between 10 and 128 characters.");
 return {email:address,password,options:{emailRedirectTo:new URL("/auth/confirm?next=/account",origin).href,data:{full_name:name}}};
}
