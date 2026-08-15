"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Role } from "@trustrent/types";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const STORAGE_KEY = "trustrent.role";
const ROLE_CHANGE_EVENT = "trustrent-role-change";

function getStoredRole(): Role {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "landlord" || saved === "tenant" ? saved : "tenant";
}

function subscribeToRole(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(ROLE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ROLE_CHANGE_EVENT, callback);
  };
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const role = useSyncExternalStore(subscribeToRole, getStoredRole, (): Role => "tenant");

  function setRole(next: Role) {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
  }

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within <RoleProvider>");
  return ctx;
}
