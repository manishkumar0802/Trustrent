"use client";

import { useRole } from "@/components/role-provider";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { getMockReputation } from "@/data/mock-data";
import type { Party } from "@trustrent/types";

/**
 * Reputation badge for the currently viewed user, following the demo role
 * switcher: viewing as tenant shows the tenant's score, as landlord the
 * landlord's. In production the active user comes from wallet auth (see
 * ARCHITECTURE.md → auth), not the role switcher.
 */
export function CurrentUserReputation({ landlord, tenant }: { landlord: Party; tenant: Party }) {
  const { role } = useRole();
  const party = role === "landlord" ? landlord : tenant;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-sm font-medium text-ink-500">{party.name}</span>
      <ReputationBadge score={getMockReputation(party.address)} />
    </span>
  );
}
