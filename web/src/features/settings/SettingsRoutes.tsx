import { PrivacyScreen } from "@/app/PrivacyScreen";
import type { Route } from "@/app/route";
import { BillSheet } from "./BillSheet";
import { BucketsPage } from "./BucketsPage";
import { BillsPage } from "./BillsPage";
import { PasswordSheet } from "./PasswordSheet";
import { ProfilePage } from "./ProfilePage";
import { ReminderPage } from "./ReminderPage";
import { SettingsScreen } from "./SettingsScreen";
import { StorePage } from "./StorePage";
import { StoresPage } from "./StoresPage";

export function SettingsRoutes({ route, them }: { route: Route; them: string }) {
  if (route.sub === "privacy") return <PrivacyScreen them={them} />;
  if (route.sub === "profile") return <><ProfilePage />{route.id === "password" && <PasswordSheet />}</>;
  if (route.sub === "reminder") return <ReminderPage />;
  if (route.sub === "stores") return route.id ? <StorePage key={route.id} id={route.id} /> : <StoresPage />;
  if (route.sub === "bills") return <><BillsPage />{route.id && <BillSheet key={route.id} id={route.id} />}</>;
  if (route.sub === "buckets") return <BucketsPage />;
  return <SettingsScreen />;
}
