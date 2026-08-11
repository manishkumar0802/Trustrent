export interface NavItem {
  href: string;
  label: string;
  icon: "dashboard" | "agreements" | "moveout" | "disputes" | "settings";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/agreements", label: "Agreements", icon: "agreements" },
  { href: "/move-out", label: "Move-out", icon: "moveout" },
  { href: "/disputes", label: "Disputes", icon: "disputes" },
  { href: "/settings", label: "Settings", icon: "settings" },
];
