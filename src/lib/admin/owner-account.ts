import "server-only";
// Existing provider identity audited for the owner's requested login. Not a secret.
export const DESIGNATED_OWNER_ID="d5f443af-ac3a-42b2-8294-6fbf51f73beb";
export const DESIGNATED_OWNER_EMAIL="felicialvrg@gmail.com";
export function designatedOwnerEmail(email:string|null|undefined){return email?.trim().toLowerCase()===DESIGNATED_OWNER_EMAIL;}
export function designatedOwnerIdentity(user:{id:string;email?:string|null;email_confirmed_at?:string|null;is_anonymous?:boolean}|null){return !!user&&user.id===DESIGNATED_OWNER_ID&&designatedOwnerEmail(user.email)&&!!user.email_confirmed_at&&!user.is_anonymous;}
