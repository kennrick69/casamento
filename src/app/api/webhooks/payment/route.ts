import { NextResponse } from "next/server";

// TODO[gateway]: implementar webhook do gateway de pagamento (Modo 3 de doação).
// Ver docs/tech-debt.md para detalhes.
export async function POST() {
  return NextResponse.json({ received: true });
}
