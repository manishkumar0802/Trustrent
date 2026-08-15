import { Badge, type BadgeTone } from "./badge";
import { IconShield } from "../icons";

/**
 * Compact reputation indicator for a registry user. Mirrors the 0..=100
 * score maintained by `contracts/user_registry`; the tone conveys trust at a
 * glance (high = trusted, low = building).
 */
export function ReputationBadge({ score }: { score: number }) {
  const { label, tone } = reputationMeta(score);
  return (
    <span title={`Reputation ${score}/100 — ${label}`}>
      <Badge tone={tone}>
        <IconShield className="size-3.5" />
        {score} <span className="opacity-70">· {label}</span>
      </Badge>
    </span>
  );
}

function reputationMeta(score: number): { label: string; tone: BadgeTone } {
  if (score >= 70) return { label: "Trusted", tone: "sage" };
  if (score >= 45) return { label: "Steady", tone: "forest" };
  return { label: "Building", tone: "amber" };
}
