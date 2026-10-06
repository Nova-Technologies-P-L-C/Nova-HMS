import { redirect } from "next/navigation";

export default function OwnerAuditTrailPage() {
  redirect("/nova/org-admin" as any);
}
