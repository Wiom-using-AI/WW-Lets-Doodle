import { getCurrentEmployee, getEvent } from "@/lib/session";
import SplitScreen from "@/components/SplitScreen";
import LoginScreen from "@/components/LoginScreen";
import ResultsScreen from "@/components/ResultsScreen";

export default async function HomePage() {
  const [employee, event] = await Promise.all([getCurrentEmployee(), getEvent()]);

  // Results appear ONLY when an admin explicitly closes the event.
  // No server-time trigger — the Railway server runs in UTC and would fire at the wrong IST hour.
  if (event.status === "completed") {
    return <ResultsScreen />;
  }

  if (!employee) {
    return <LoginScreen />;
  }

  return <SplitScreen employee={employee} />;
}
