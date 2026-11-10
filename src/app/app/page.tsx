import { redirect } from "next/navigation";

// Old address for the carrier vault; it now lives in the Member Office.
export default function OldCarrierHome() {
  redirect("/#member");
}
