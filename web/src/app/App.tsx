import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/data/auth";
import { DataProvider } from "@/data/data";
import { DeniedScreen } from "./DeniedScreen";
import { LoginScreen } from "./LoginScreen";
import { Shell } from "./Shell";
import { applyTheme, storedTheme } from "./theme";

function Gate() {
  const a = useAuth();
  useEffect(() => { if (a.status === "signedOut") applyTheme(storedTheme()); }, [a.status]);
  if (a.status === "loading") return <main aria-busy="true" className="p-5"><Skeleton className="h-8 w-48 rounded-md" /></main>;
  if (a.status === "signedOut") return <LoginScreen />;
  if (a.status === "denied") return <DeniedScreen />;
  return <DataProvider key={a.people.me} people={a.people}><Shell /></DataProvider>;
}
export function App() {
  return <AuthProvider><Gate /><Toaster position="bottom-center" /></AuthProvider>;
}
