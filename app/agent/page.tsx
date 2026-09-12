import { redirect } from "next/navigation";

export default function LegacyAgentPage() {
  redirect("/cases?view=audit");
}
