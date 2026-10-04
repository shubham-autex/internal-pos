import { redirect } from "next/navigation";

/** Profit & discount now opens as a sheet on checkout. */
export default function ProfitPage() {
  redirect("/checkout");
}
