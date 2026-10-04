import { PrivacyScreen } from "@/app/PrivacyScreen";
import type { Route } from "@/app/route";
import { C } from "@/domain/copy.js";
import { PasswordSheet } from "./PasswordSheet";
import { ProfilePage } from "./ProfilePage";
import { ReminderPage } from "./ReminderPage";
import { SettingsScreen } from "./SettingsScreen";
import { SoonPage } from "./SoonPage";

export function SettingsRoutes({ route, them }: { route: Route; them: string }) {
  if (route.sub === "privacy") return <PrivacyScreen them={them} />;
  if (route.sub === "profile") return <><ProfilePage />{route.id === "password" && <PasswordSheet />}</>;
  if (route.sub === "reminder") return <ReminderPage />;
  if (route.sub === "stores") return <SoonPage title={C.stores} />;
  if (route.sub === "bills") return <SoonPage title={C.bills} />;
  return <SettingsScreen />;
}
