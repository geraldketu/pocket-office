"use server";
import {requireOwner} from "@/lib/admin/owner";
export type InviteResult={ok:boolean;message:string;link?:string;carrierId?:string}|null;
const message="Live administration is read-only. Create an isolated preview to test invitations or changes.";
export async function createCarrierAndInvite(_previous:InviteResult,_form:FormData):Promise<InviteResult>{void _previous;void _form;await requireOwner();return {ok:false,message};}
export async function resendInvite(_previous:InviteResult,_form:FormData):Promise<InviteResult>{void _previous;void _form;await requireOwner();return {ok:false,message};}
export async function addLead(_form:FormData){void _form;await requireOwner();throw Error(message);}
export async function updateLead(_form:FormData){void _form;await requireOwner();throw Error(message);}
