import { redirect } from "next/navigation";

export default function KioskPage() {
  redirect("/nova/reception/register" as any);
}
