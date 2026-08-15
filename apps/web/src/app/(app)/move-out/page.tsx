"use client";

import { useMemo, useState } from "react";
import { useRole } from "@/components/role-provider";
import { Stepper } from "@/components/ui/stepper";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconFile, IconShield } from "@/components/icons";
import { evidenceStorage } from "@/services/evidence-storage";
import type { EvidenceReference } from "@trustrent/types";

const STEPS = [
  { id: "request", label: "Request" },
  { id: "evidence", label: "Evidence" },
  { id: "inspection", label: "Inspection" },
  { id: "settlement", label: "Settlement" },
];

export default function MoveOutPage() {
  const { role } = useRole();
  const [evidence, setEvidence] = useState<EvidenceReference[]>([]);
  const [uploading, setUploading] = useState(false);

  const stepIndex = useMemo(() => {
    if (evidence.length > 0) return 1;
    return role === "tenant" ? 0 : 2;
  }, [evidence.length, role]);

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

      {role === "tenant" ? (
        <Card>
          <CardHeader
            title="Submit final dues & room condition evidence"
            subtitle="Local demo provider — the on-chain contract will store only the reference (hash), never the files"
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
              <Button title="Arrives in phase 2">Request inspection</Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Incoming move-out" subtitle="Landlord review queue" />
          <CardBody className="space-y-4 text-sm text-ink-500">
            <p>
              As a landlord you review move-out requests, evidence and proposed deductions. In phase
              2 this page reads the on-chain move-out state and lets you approve or dispute.
            </p>
            <Button variant="secondary" title="Arrives in phase 2">
              Review evidence
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
