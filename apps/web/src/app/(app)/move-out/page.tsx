"use client";

import { useState } from "react";
import { useRole } from "@/components/role-provider";
import { Stepper } from "@/components/ui/stepper";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconFile, IconShield, IconCheck } from "@/components/icons";
import { evidenceStorage } from "@/services/evidence-storage";
import { fileDispute } from "@/services/disputes-store";
import { formatINR } from "@trustrent/shared";
import type { EvidenceReference } from "@trustrent/types";

const STEPS = [
  { id: "request", label: "Request" },
  { id: "evidence", label: "Evidence" },
  { id: "inspection", label: "Inspection" },
  { id: "settlement", label: "Settlement" },
];

type MoveOutPhase =
  | "request"
  | "evidence"
  | "inspection"
  | "settlement"
  | "complete";

export default function MoveOutPage() {
  const { role } = useRole();
  const [phase, setPhase] = useState<MoveOutPhase>("request");
  const [evidence, setEvidence] = useState<EvidenceReference[]>([]);
  const [uploading, setUploading] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<
    "approved" | "deduction" | null
  >(null);
  const [deductionAmount, setDeductionAmount] = useState(8000);
  const [settlementAccepted, setSettlementAccepted] = useState(false);
  const [deductionReason, setDeductionReason] = useState(
    "Kitchen repaint and lock replacement",
  );
  const [disputeFiled, setDisputeFiled] = useState(false);

  const stepIndex = (() => {
    switch (phase) {
      case "request":
        return 0;
      case "evidence":
        return 1;
      case "inspection":
        return 2;
      case "settlement":
        return 3;
      case "complete":
        return 4;
    }
  })();

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
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Move-out
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          A transparent, evidence-first process. The deposit stays locked until
          both sides agree.
        </p>
      </header>

      <Card>
        <CardBody>
          <Stepper steps={STEPS} current={stepIndex} />
        </CardBody>
      </Card>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Phase: Request                                           */}
      {/* ══════════════════════════════════════════════════════════ */}
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
                    <span className="truncate font-medium text-ink-800">
                      {item.contentHash}
                    </span>
                    <span className="shrink-0 text-xs text-ink-400">
                      reference stored
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-400">
              <IconShield className="mt-0.5 size-3.5 shrink-0" />
              The blockchain records the content reference, submitter and
              timestamp — not the file itself. That keeps evidence tamper-evident
              and cheap to store.
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
          <CardHeader
            title="Start move-out process"
            subtitle="Initiate or inspect a tenant move-out"
          />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-border bg-ivory-50/60 p-4 text-sm text-ink-500">
              <p className="font-medium text-ink-800">
                Manage the move-out workflow
              </p>
              <p className="mt-1">
                As a landlord, you can review evidence submitted by the tenant,
                schedule inspections, and propose deductions if the property
                condition requires it.
              </p>
            </div>
            <div className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800">
              <span className="font-semibold">Tip:</span> Switch to Tenant role
              to see the tenant's evidence submission flow, or stay as Landlord
              to review and inspect.
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEvidence([]);
                  setPhase("evidence");
                }}
              >
                Skip to evidence review
              </Button>
              <Button onClick={() => setPhase("inspection")}>
                Go to inspection
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Phase: Evidence                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase === "evidence" && role === "tenant" && (
        <Card>
          <CardHeader
            title="Evidence submitted"
            subtitle="Waiting for landlord inspection"
          />
          <CardBody className="space-y-4 text-sm text-ink-500">
            <p>
              Your evidence has been submitted. The landlord will now review and
              schedule an inspection. The escrow remains locked until inspection
              and settlement.
            </p>
            <div className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800">
              Move-out request is in review. The escrow remains locked until
              inspection and settlement.
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
          <CardHeader
            title="Review tenant evidence"
            subtitle="Evidence submitted · review before inspection"
          />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-border bg-ivory-50/60 p-4 text-sm text-ink-500">
              <p className="font-medium text-ink-800">
                Evidence submitted by tenant
              </p>
              <p className="mt-1">
                Final dues calculation and room condition photos are available
                for review. Verify the evidence before scheduling an inspection.
              </p>
            </div>

            {evidence.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-ink-400 mb-2">
                  Uploaded references ({evidence.length})
                </p>
                <ul className="space-y-1.5">
                  {evidence.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate text-ink-700">
                        {item.contentHash}
                      </span>
                      <Badge tone="forest">stored</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setPhase("inspection")}
              >
                Schedule inspection
              </Button>
              <Button onClick={() => setPhase("inspection")}>
                Approve and proceed
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Phase: Inspection                                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase === "inspection" && role === "tenant" && !inspectionResult && (
        <Card>
          <CardHeader
            title="Inspection in progress"
            subtitle="Landlord is reviewing the property condition"
          />
          <CardBody className="space-y-4 text-sm text-ink-500">
            <p>
              The landlord is inspecting the property. You will be notified of
              the result — either a clean approval or a proposed deduction.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Inspection in progress. This typically takes 1–3 days.
            </div>
            <p className="text-xs text-ink-400">
              Switch to <span className="font-medium">Landlord</span> role to
              conduct the inspection yourself in this demo.
            </p>
          </CardBody>
        </Card>
      )}

      {phase === "inspection" && role === "landlord" && !inspectionResult && (
        <Card>
          <CardHeader
            title="Conduct inspection"
            subtitle="Approve clean move-out or propose a deduction"
          />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-border bg-ivory-50/60 p-4 text-sm text-ink-500">
              <p className="font-medium text-ink-800">Inspection checklist</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-forest-600">✓</span> Kitchen cleaned
                  and appliances intact
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-forest-600">✓</span> Walls and paint
                  condition verified
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-forest-600">✓</span> Locks and keys
                  accounted for
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-forest-600">✓</span> Final utility dues
                  cleared
                </li>
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

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Inspection result → settlement                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase === "inspection" && inspectionResult === "approved" && (
        <Card>
          <CardHeader
            title="Inspection approved"
            subtitle="Clean move-out — full refund"
          />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-3 text-sm text-forest-800">
              <p className="font-semibold">
                Move-out approved — no deductions
              </p>
              <p className="mt-1">
                The full deposit of {formatINR(30000)} will be released to the
                tenant.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setPhase("settlement");
                  setSettlementAccepted(true);
                }}
              >
                {role === "landlord"
                  ? "Approve full refund"
                  : "Approve full refund"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {phase === "inspection" && inspectionResult === "deduction" && (
        <Card>
          <CardHeader
            title="Propose deduction"
            subtitle="Specify the amount and reason"
          />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-border bg-ivory-50/60 p-4 text-sm text-ink-500">
              <p className="font-medium text-ink-800">Deduction details</p>
              <p className="mt-1">
                A deduction reduces the tenant&apos;s refund. The tenant must
                accept or dispute it. If disputed, the escrow stays locked until
                an arbitrator resolves.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="deduction-reason"
                  className="text-sm font-medium text-ink-700"
                >
                  Reason:
                </label>
                <input
                  id="deduction-reason"
                  type="text"
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink-900 shadow-card"
                />
              </div>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="deduction-input"
                  className="text-sm font-medium text-ink-700"
                >
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
            </div>

            <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm">
              <p className="font-semibold text-danger-600">
                Proposed deduction: {formatINR(deductionAmount)}
              </p>
              <p className="mt-1 text-danger-500">
                Tenant refund: {formatINR(30000 - deductionAmount)} · Landlord
                receives: {formatINR(deductionAmount)}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setInspectionResult(null)}
              >
                Cancel
              </Button>
              <Button onClick={() => setPhase("settlement")}>
                Submit deduction
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Phase: Settlement                                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase === "settlement" && role === "tenant" && !disputeFiled && (
        <Card>
          <CardHeader
            title="Settlement"
            subtitle={
              inspectionResult === "deduction"
                ? "Review the proposed deduction"
                : "Full refund approved"
            }
          />
          <CardBody className="space-y-4">
            {inspectionResult === "deduction" ? (
              <>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="font-semibold text-amber-800">
                    Deduction proposed: {formatINR(deductionAmount)}
                  </p>
                  <p className="mt-1 text-amber-700">
                    Reason: {deductionReason}
                  </p>
                  <p className="mt-1 text-amber-700">
                    The landlord has proposed a deduction of{" "}
                    {formatINR(deductionAmount)} from your deposit of{" "}
                    {formatINR(30000)}.
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-amber-200 pt-3 text-sm">
                    <span className="text-amber-700">Your refund</span>
                    <span className="font-semibold text-ink-900">
                      {formatINR(30000 - deductionAmount)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      fileDispute({
                        agreementId: "AG-1042",
                        initiator: "tenant",
                        reason: `Tenant disputes landlord proposed deduction of ₹${deductionAmount}: ${deductionReason}.`,
                        proposedDeduction: { value: deductionAmount, currency: "INR" },
                      });
                      setDisputeFiled(true);
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
                  <p className="font-semibold">
                    Full refund of {formatINR(30000)} approved
                  </p>
                  <p className="mt-1">
                    No deductions. The entire deposit will be released to your
                    wallet.
                  </p>
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

      {phase === "settlement" && role === "landlord" && !disputeFiled && (
        <Card>
          <CardHeader
            title="Settlement"
            subtitle={
              inspectionResult === "deduction"
                ? "Deduction proposed — awaiting tenant response"
                : "Full refund approved"
            }
          />
          <CardBody className="space-y-4">
            {inspectionResult === "deduction" ? (
              <>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  <p className="font-semibold text-amber-800">
                    Deduction of {formatINR(deductionAmount)} proposed
                  </p>
                  <p className="mt-1">Reason: {deductionReason}</p>
                  <p className="mt-1">
                    Waiting for the tenant to accept or dispute the deduction.
                    If disputed, the escrow stays locked until an arbitrator
                    resolves.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-ivory-50/60 p-3 text-sm">
                  <p className="text-ink-400">Breakdown</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-ink-600">Tenant refund</span>
                      <span className="font-medium text-ink-900">
                        {formatINR(30000 - deductionAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-600">You receive</span>
                      <span className="font-medium text-ink-900">
                        {formatINR(deductionAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-forest-200 bg-forest-50 p-4 text-sm text-forest-800">
                <p className="font-semibold">Full refund approved</p>
                <p className="mt-1">
                  The tenant will confirm receipt. Once confirmed, the escrow
                  releases the full deposit.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Phase: Dispute Filed                                     */}
      {/* ══════════════════════════════════════════════════════════ */}
      {disputeFiled && role === "tenant" && (
        <Card>
          <CardHeader
            title="Dispute filed"
            subtitle="Escrow remains locked until arbitrator resolves"
          />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm">
              <p className="font-semibold text-danger-700">
                You have disputed the proposed deduction of{" "}
                {formatINR(deductionAmount)}
              </p>
              <p className="mt-1 text-danger-600">
                Reason for dispute: The deduction amount is not justified. You
                believe the property was returned in acceptable condition.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-ivory-50/60 p-4 text-sm text-ink-500">
              <p className="font-medium text-ink-800">What happens next?</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-forest-600">1.</span>
                  <span>
                    An independent arbitrator is assigned to review both sides of
                    the dispute.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-forest-600">2.</span>
                  <span>
                    Both parties can submit additional evidence to support their
                    position.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-forest-600">3.</span>
                  <span>
                    The arbitrator will rule on a fair settlement, and the escrow
                    will release accordingly.
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              The deposit of {formatINR(30000)} remains locked in escrow until
              the dispute is resolved. You can track progress on the{" "}
              <span className="font-medium">Disputes</span> page.
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDisputeFiled(false)}
              >
                Withdraw dispute
              </Button>
              <a href="/disputes">
                <Button>View disputes</Button>
              </a>
            </div>
          </CardBody>
        </Card>
      )}

      {disputeFiled && role === "landlord" && (
        <Card>
          <CardHeader
            title="Dispute filed by tenant"
            subtitle="Escrow remains locked until arbitrator resolves"
          />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-semibold text-amber-800">
                Tenant has disputed the proposed deduction of{" "}
                {formatINR(deductionAmount)}
              </p>
              <p className="mt-1 text-amber-700">
                Reason: The deduction amount is not justified. The tenant
                believes the property was returned in acceptable condition.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-ivory-50/60 p-4 text-sm text-ink-500">
              <p className="font-medium text-ink-800">What happens next?</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-forest-600">1.</span>
                  <span>
                    An independent arbitrator is assigned to review both sides of
                    the dispute.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-forest-600">2.</span>
                  <span>
                    You can submit additional evidence to support your proposed
                    deduction.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-forest-600">3.</span>
                  <span>
                    The arbitrator will rule on a fair settlement, and the escrow
                    will release accordingly.
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-ivory-50/60 p-3 text-sm">
              <p className="text-ink-400">Breakdown (disputed)</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-ink-600">Tenant refund</span>
                  <span className="font-medium text-ink-900">
                    {formatINR(30000 - deductionAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600">You receive</span>
                  <span className="font-medium text-ink-900">
                    {formatINR(deductionAmount)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-ink-600">Deposit locked</span>
                  <span className="font-medium text-amber-600">
                    {formatINR(30000)}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              The deposit of {formatINR(30000)} remains locked in escrow until
              the dispute is resolved. You can track progress on the{" "}
              <span className="font-medium">Disputes</span> page.
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDisputeFiled(false)}
              >
                Cancel dispute
              </Button>
              <a href="/disputes">
                <Button>View disputes</Button>
              </a>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Phase: Complete                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase === "complete" && (
        <Card>
          <CardHeader
            title="Move-out complete"
            subtitle="Settlement finalized"
          />
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-forest-50 px-3 py-2 text-sm text-forest-800">
              <IconCheck className="size-4" />
              <span className="font-semibold">
                Settlement finalized — escrow released
              </span>
            </div>
            {inspectionResult === "deduction" ? (
              <div className="rounded-lg border border-border bg-ivory-50/60 p-3 text-sm">
                <p className="text-ink-400 mb-2">Final breakdown</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-ink-600">Tenant received</span>
                    <span className="font-medium text-ink-900">
                      {formatINR(30000 - deductionAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">Landlord received</span>
                    <span className="font-medium text-ink-900">
                      {formatINR(deductionAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1">
                    <span className="text-ink-700 font-medium">Total</span>
                    <span className="font-semibold text-ink-900">
                      {formatINR(30000)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-500">
                Tenant received {formatINR(30000)} · No deductions applied.
              </p>
            )}
            <p className="text-xs text-ink-400">
              The escrow contract has released the deposit according to the
              settlement terms. Both parties can verify this on-chain.
            </p>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPhase("request");
                  setEvidence([]);
                  setInspectionResult(null);
                  setSettlementAccepted(false);
                  setDisputeFiled(false);
                }}
              >
                Start new move-out
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Progress button (shared, role-aware)                     */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase === "settlement" && settlementAccepted && !disputeFiled && (
        <div className="flex justify-end">
          <Button onClick={() => setPhase("complete")}>
            Finalize settlement
          </Button>
        </div>
      )}
    </div>
  );
}
