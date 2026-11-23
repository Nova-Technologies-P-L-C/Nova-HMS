import { redirect } from "next/navigation";

export default function ReceptionRootPage() {
  redirect("/nova/reception/register" as any);
}
