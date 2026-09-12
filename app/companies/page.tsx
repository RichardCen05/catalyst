import { redirect } from "next/navigation";

export default function LegacyCompaniesPage() {
  redirect("/cases?view=picker");
}
