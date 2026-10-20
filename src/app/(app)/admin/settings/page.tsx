import { redirect } from "next/navigation";

/** Settings has its own menu item now. This keeps an old link or bookmark working. */
export default function OldSettingsPage() {
  redirect("/settings");
}
