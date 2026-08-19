"use client";

import { useSyncExternalStore } from "react";
import {
  getDisputes,
  subscribeDisputes,
} from "@/services/disputes-store";

/** React hook that returns the current dispute list and re-renders on changes. */
export function useDisputes() {
  return useSyncExternalStore(subscribeDisputes, getDisputes, getDisputes);
}
