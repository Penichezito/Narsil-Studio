import { redirect } from "next/navigation";

// The public site is still under construction: the root always lands on the
// maintenance screen, even when NEXT_PUBLIC_MAINTENANCE_MODE is off.
export default function Home() {
  redirect("/maintenance");
}
