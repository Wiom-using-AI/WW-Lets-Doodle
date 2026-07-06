import { getCurrentEmployee, getEvent, isEventClosed } from "@/lib/session";
import { redirect } from "next/navigation";
import SplitScreen from "@/components/SplitScreen";
import LoginScreen from "@/components/LoginScreen";
import ResultsScreen from "@/components/ResultsScreen";

export default async function HomePage() {
  const [employee, event] = await Promise.all([getCurrentEmployee(), getEvent()]);

  if (isEventClosed() || event.status === "completed") {
    return <ResultsScreen />;
  }

  if (!employee) {
    return <LoginScreen />;
  }

  return <SplitScreen employee={employee} />;
}
