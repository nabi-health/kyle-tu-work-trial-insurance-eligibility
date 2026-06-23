import { redirect } from "next/navigation";

export default function Home() {
  // Eligibility check is the primary task — make it the landing screen.
  redirect("/check");
}
