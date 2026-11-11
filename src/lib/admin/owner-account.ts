import "server-only";
export const DESIGNATED_OWNER_EMAIL="oliverfee360@gmail.com";
export function designatedOwnerEmail(email:string|null|undefined){return email?.trim().toLowerCase()===DESIGNATED_OWNER_EMAIL;}
