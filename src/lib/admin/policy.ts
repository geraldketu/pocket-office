export type Identity={id:string;email:string;role:string;carrier_id?:string|null};
export function isOwner(profile:Identity|null,ids:string){return !!profile&&profile.role==="admin"&&ids.split(",").map(s=>s.trim()).filter(Boolean).includes(profile.id);}
// Existing installations have one administrator (the owner). When an explicit
// allowlist is absent, verify that exact existing account; never promote users.
export function isVerifiedSoleOwner(profile:Identity|null,admins:Identity[],verifiedEmail:string|null){
 return !!profile&&profile.role==="admin"&&!profile.carrier_id&&admins.length===1&&admins[0].id===profile.id&&admins[0].role==="admin"&&!!verifiedEmail&&profile.email.toLowerCase()===verifiedEmail.toLowerCase()&&admins[0].email.toLowerCase()===verifiedEmail.toLowerCase();
}
export const PREVIEW_ROLES=["visitor","new-customer","Basic","Pro","Premium","Ultimate","driver","owner","salesperson","archive-owner","archive-office","archive-driver"] as const;
export type PreviewRole=typeof PREVIEW_ROLES[number];
export function startPage(role:PreviewRole){return role==="visitor"?"/":role==="owner"?"/admin":role.startsWith("archive-")?"/archive#member":role==="salesperson"?"/admin/leads":"/app";}
export function roleProfile(role:PreviewRole):Identity|null {
 if(role==="visitor"||role==="salesperson")return null;
 return {id:role==="owner"?"test-owner":`test-${role}`,email:`${role.toLowerCase()}@example.test`,role:role==="owner"?"admin":role==="driver"?"driver":"carrier",carrier_id:role==="owner"?null:role==="driver"?"test-carrier-Basic":`test-carrier-${role}`};
}
export function previewAccess(role:PreviewRole,path:string){
 const pathname=path.split(/[?#]/)[0];const profile=roleProfile(role);
 if(pathname.startsWith("/admin"))return role==="owner";
 if(pathname==="/archive")return role.startsWith("archive-")||role==="owner";
 if(pathname==="/app"||pathname.startsWith("/documents/"))return !!profile&&profile.role!=="admin"&&!role.startsWith("archive-");
 if(pathname==="/account")return !!profile&&!role.startsWith("archive-");
 if(pathname==="/set-password")return !!profile;
 return true;
}
export function safePreviewPath(value:string){
 if(!value.startsWith("/")||value.startsWith("//")||/[\\\u0000-\u001f]/.test(value))return "/";
 const path=new URL(value,"https://preview.invalid");if(path.origin!=="https://preview.invalid"||decodeURIComponent(path.pathname).includes("..")||path.pathname.startsWith("/admin/preview/")||path.pathname.startsWith("/admin/api/"))return "/";
 return path.pathname+path.search+path.hash;
}
export function labEnabled(env:Record<string,string|undefined>){return env.NODE_ENV!=="production"&&env.OLIVERFEE_ADMIN_LAB==="1";}
export const LAB_OWNER={id:"local-lab-owner",email:"owner@example.test",role:"admin",carrier_id:null};
export const TEST_PASSWORD="Preview-Only-2026!";
