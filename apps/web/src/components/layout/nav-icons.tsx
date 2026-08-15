import { IconDashboard, IconHome, IconMoveOut, IconScale, IconSettings } from "../icons";
import type { NavItem } from "@/lib/nav";

export const NAV_ICONS: Record<NavItem["icon"], typeof IconHome> = {
  dashboard: IconDashboard,
  agreements: IconHome,
  moveout: IconMoveOut,
  disputes: IconScale,
  settings: IconSettings,
};
