import "server-only";
export const DESIGNATED_OWNER_EMAIL="oliverfee360@gmail.com";
// Explicitly selected by the owner earlier in this conversation, then replaced
// by DESIGNATED_OWNER_EMAIL. This is not a general administrator allowlist.
export const PREVIOUS_OWNER_EMAIL="felicialvrg@gmail.com";
export function designatedOwnerEmail(email:string|null|undefined){return email?.trim().toLowerCase()===DESIGNATED_OWNER_EMAIL;}
