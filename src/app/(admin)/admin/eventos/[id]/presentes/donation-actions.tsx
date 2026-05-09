"use client";

import { useTransition } from "react";
import { approveDonation, rejectDonation } from "./actions";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  eventId: string;
  donationId: string;
  status: string;
}

export function DonationActions({ eventId, donationId, status }: Props) {
  const [isPending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      void await approveDonation(eventId, donationId);
    });
  }

  function reject() {
    startTransition(async () => {
      void await rejectDonation(eventId, donationId);
    });
  }

  return (
    <div className="flex gap-1.5 shrink-0">
      <button
        onClick={approve}
        disabled={isPending}
        title="Aprovar doação"
        className="p-1.5 rounded text-green-600 hover:bg-green-50 disabled:opacity-50"
      >
        <CheckCircle size={16} />
      </button>
      {status !== "DECLARED" && (
        <button
          onClick={reject}
          disabled={isPending}
          title="Rejeitar doação"
          className="p-1.5 rounded text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <XCircle size={16} />
        </button>
      )}
    </div>
  );
}
