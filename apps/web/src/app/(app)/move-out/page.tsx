"use client";

import { useMemo, useState } from "react";
import { useRole } from "@/components/role-provider";
import { Stepper } from "@/components/ui/stepper";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconFile, IconShield, IconCheck } from "@/components/icons";
import { evidenceStorage } from "@/services/evidence-storage";
import { formatINR } from "@trustrent/shared";
import type { EvidenceReference } from "@trustrent/types";

const STEPS = [
  { id: "request", label: "Request" },
  { id: "evidence", label: "Evidence" },
  { id: "inspection", label: "Inspection" },
  { id: "settlement", label: "Settlement" },
];

type MoveOutPhase = "request" | "evidence" | "inspection" | "settlement" | "complete";

export default function MoveOutPage() {
  const { role } = useRole();
  const [phase, setPhase] = useState<MoveOutPhase>("request");
  const [evidence, setEvidence] = useState<EvidenceReference[]>([]);
  const [uploading, setUploading] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<"approved" | "deduction" | null>(null);
  const [deductionAmount, setDeductionAmount] = useState(8000);
  const [settlementAccepted, setSettlementAccepted] = useState(false);

  const stepIndex = useMemo(() => {
    switch (phase) {
      case "request":
        return role === "tenant" ? 0 : 2;
      case "evidence":
        return 1;
      case "inspection":
        return 2;
      case "settlement":
        return 3;
      case "complete":
        return 4;
    }
  }, [phase, role]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const storage = await evidenceStorage.put(file, { name: file.name });
      const ref: EvidenceReference = {
        id: `local-${Date.now()}`,
        agreementId: "AG-1042",
        submitter: role,
        kind: "FINAL_DUES",
        contentHash: storage.uri.split("://")[1] ?? storage.uri,
        storage,
        submittedAt: new Date().toISOString(),
      };
      setEvidence((prev) => [...prev, ref]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Move-out</h1>
        <p className="mt-1 text-sm text-ink-400">
          A transparent, evidence-first process. The deposit stays locked until both sides agree.
        </p>
      </header>

      <Card>
        <CardBody>
          <Stepper steps={STEPS} current={stepIndex} />
        </CardBody>
      </Card>

      {/* ── Phase: Request ── */}
      {phase === "request" && role === "tenant" && (
        <Card>
          <CardHeader
            title="Submit final dues & room condition evidence"
            subtitle="Upload bills, photos or reports — stored off-chain, the contract keeps only the reference"
          />
          <CardBody className="space-y-4">
            <label
              htmlFor="evidence-upload"
              className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-ivory-50/60 px-6 py-10 text-center transition-colors hover:border-forest-500 hover:bg-forest-50"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-forest-100 text-forest-700">
                <IconFile className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink-800">
                  {uploading ? "Hashing…" : "Upload bills, photos, reports"}
                </span>
                <span className="mt-1 block text-xs text-ink-400">
                  JPG, PNG, PDF · stored via the pluggable storage provider
                </span>
              </span>
              <input
                id="evidence-upload"
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>

            {evidence.length > 0 && (
              <ul className="space-y-2">
                {evidence.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm"
                  >
                    <span className="truncate font-medium text-ink-800">{item.contentHash}</span>
                    <span className="shrink-0 text-xs text-ink-400">reference stored</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-400">
              <IconShield className="mt-0.5 size-3.5 shrink-0" />
              The blockchain records the content reference, submitter and timestamp — not the file
              itself. That keeps evidence tamper-evident and cheap to store.
            </p>

            <div className="flex justify-end">
              <Button
                onClick={() => setPhase("evidence")}
                disabled={evidence.length === 0}
              >
                Submit evidence
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {phase === "request" && role === "landlord" && (
        <Card>
          <CardHeader title="Incoming move-out request" subtitle="Tenant has initiated a move-out" />
          <CardBody className="space-y-4 text-sm text-ink-500">
            <p>
              The tenant has initiated a move-out request. Once they submit evidence, you will be
              able to review it and run an inspection.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Waiting for tenant to submit evidence and request inspection.
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Phase: Evidence submitted → tenant waiting / landlord reviews ── */}
      {phase === "evidence" && role === "tenant" && (
        <Card>
          <CardHeader title="Evidence submitted" subtitle="Waiting for landlord inspection" />
          <CardBody className="space-y-4 text-sm text-ink-500">
            <p>
              Your evidence has been submitted. The landlord will now review and schedule an
              inspection. The escrow remains locked until inspection and settlement.
            </p>
            <div className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800">
              Move-out request is in review. The escrow remains locked until inspection and settlement.
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setPhase("inspection")}>
                Request inspection
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {phase === "evidence" && role === "landlord" && (
        <Card>
          <CardHeader title="Review tenant evidence" subtitle="Evidence submitted · review before inspection" />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-border bg-ivory-50/60 p-4 text-sm text-ink-500">
              <p className="font-medium text-ink-800">Evidence submitted by tenant</p>
              <p className="mt-1">
                Final dues calculation and room condition photos are available for review.
                Verify the evidence before scheduling an inspection.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPhase("inspection")}>
                Schedule inspection
              </Button>
              <Button onClick={() => setPhase("inspection")}>
                Approve and proceed
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Phase: Inspection ── */}
      {phase === "inspection" && role === "tenant" && !inspectionResult && (
        <Card>
          <CardHeader title="Inspection in progress" subtitle="Landlord is reviewing the property condition" />
          <CardBody className="space-y-4 text-sm text-ink-500">
            <p>
              The landlord is inspecting the property. You will be notified of the result — either
              a clean approval or a proposed deduction.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Inspection in progress. This typically takes 1–3 days.
            </div>
          </CardBody>
        </Card>
      )}

      {phase === "inspection" && role === "landlord" && !inspectionResult && (
        <Card>
          <CardHeader title="Conduct inspection" subtitle="Approve clean move-out or propose a deduction" />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-border bg-ivory-50/60 p-4 text-sm text-ink-500">
              <p className="font-medium text-ink-800">Inspection checklist</p>
              <ul className="mt-2 space-y-1">
                <li>✓ Kitchen cleaned and appliances intact</li>
                <li>✓ Walls and paint condition verified</li>
                <li>✓ Locks and keys accounted for</li>
                <li>✓ Final utility dues cleared</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setInspectionResult("deduction")}
              >
                Propose deduction
              </Button>
              <Button onClick={() => setInspectionResult("approved")}>
                Approve move-out
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Inspection result → settlement ── */}
      {phase === "inspection" && inspectionResult === "approved" && (
        <Card>
          <CardHeader title="Inspection approved" subtitle="Clean move-out — full refund" />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-3 text-sm text-forest-800">
              <p className="font-semibold">Move-out approved — no deductions</p>
              <p className="mt-1">
                The full deposit of ₹30,000 will be released to the tenant.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setPhase("settlement"); setSettlementAccepted(true); }}>
                Approve full refund
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {phase === "inspection" && inspectionResult === "deduction" && (
        <Card>
          <CardHeader title="Propose deduction" subtitle="Specify the amount and reason" />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-border bg-ivory-50/60 p-4 text-sm text-ink-500">
              <p className="font-medium text-ink-800">Deduction details</p>
              <p className="mt-1">
                A deduction reduces the tenant&apos;s refund. The tenant must accept or dispute it.
                If disputed, the escrow stays locked until an arbitrator resolves.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="deduction-input" className="text-sm font-medium text-ink-700">
                Deduction amount (₹):
              </label>
              <input
                id="deduction-input"
                type="number"
                value={deductionAmount}
                onChange={(e) => setDeductionAmount(Number(e.target.value))}
                className="h-10 w-32 rounded-lg border border-border bg-surface px-3 text-sm text-ink-900 shadow-card"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setInspectionResult(null)}>
                Cancel
              </Button>
              <Button onClick={() => setPhase("settlement")}>
                Submit deduction
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Phase: Settlement ── */}
      {phase === "settlement" && role === "tenant" && (
        <Card>
          <CardHeader title="Settlement" subtitle={inspectionResult === "deduction" ? "Review the proposed deduction" : "Full refund approved"} />
          <CardBody className="space-y-4">
            {inspectionResult === "deduction" ? (
              <>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="font-semibold text-amber-800">Deduction proposed: {formatINR(deductionAmount)}</p>
                  <p className="mt-1 text-amber-700">
                    The landlord has proposed a deduction of {formatINR(deductionAmount)} from your
                    deposit of {formatINR(30000)}.
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-amber-200 pt-3 text-sm">
                    <span className="text-amber-700">Your refund</span>
                    <span className="font-semibold text-ink-900">{formatINR(30000 - deductionAmount)}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setPhase("settlement");
                      setSettlementAccepted(true);
                    }}
                  >
                    Dispute deduction
                  </Button>
                  <Button onClick={() => setSettlementAccepted(true)}>
                    Accept deduction
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-forest-200 bg-forest-50 p-4 text-sm text-forest-800">
                  <p className="font-semibold">Full refund of {formatINR(30000)} approved</p>
                  <p className="mt-1">No deductions. The entire deposit will be released to your wallet.</p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setSettlementAccepted(true)}>
                    Confirm receipt
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {phase === "settlement" && role === "landlord" && (
        <Card>
          <CardHeader title="Settlement" subtitle={inspectionResult === "deduction" ? "Deduction proposed — awaiting tenant response" : "Full refund approved"} />
          <CardBody className="space-y-4">
            {inspectionResult === "deduction" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <p className="font-semibold text-amber-800">Deduction of {formatINR(deductionAmount)} proposed</p>
                <p className="mt-1">
                  Waiting for the tenant to accept or dispute the deduction. If disputed, the
                  escrow stays locked until an arbitrator resolves.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-forest-200 bg-forest-50 p-4 text-sm text-forest-800">
                <p className="font-semibold">Full refund approved</p>
                <p className="mt-1">
                  The tenant will confirm receipt. Once confirmed, the escrow releases the full
                  deposit.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Phase: Complete ── */}
      {phase === "complete" && (
        <Card>
          <CardHeader title="Move-out complete" subtitle="Settlement finalized" />
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-forest-50 px-3 py-2 text-sm text-forest-800">
              <IconCheck className="size-4" />
              <span className="font-semibold">Settlement finalized — escrow released</span>
            </div>
            {inspectionResult === "deduction" && (
              <p className="text-sm text-ink-500">
                Tenant received {formatINR(30000 - deductionAmount)} · Landlord received {formatINR(deductionAmount)}
              </p>
            )}
            {inspectionResult === "approved" && (
              <p className="text-sm text-ink-500">
                Tenant received {formatINR(30000)} · No deductions applied.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Progress button — only show when relevant */}
      {phase !== "complete" && phase !== "request" && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (phase === "settlement" && settlementAccepted) {
                setPhase("complete");
              } else if (phase === "evidence") {
                setPhase("inspection");
              }
            }}
            disabled={
              (phase === "settlement" && !settlementAccepted)
            }
          >
            {phase === "settlement" && settlementAccepted ? "Finalize settlement" : "Continue"}
          </Button>
        </div>
      )}
    </div>
  );
}
