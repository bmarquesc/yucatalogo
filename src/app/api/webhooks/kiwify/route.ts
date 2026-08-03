import { NextResponse } from "next/server";

import { upsertKiwifyAccess } from "@/db/queries";
import { jsonError } from "@/lib/api";
import {
  isAllowedKiwifyProduct,
  normalizeKiwifyPayload,
  verifyKiwifyWebhookRequest
} from "@/lib/kiwify";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, webhook: "kiwify" });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verification = verifyKiwifyWebhookRequest(request, rawBody);

  if (!verification.ok) {
    return jsonError(verification.message, verification.status);
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return jsonError("Payload JSON invalido.", 400);
  }

  const normalized = normalizeKiwifyPayload(payload);

  if (!normalized.email) {
    return jsonError("E-mail do comprador nao encontrado no webhook.", 422);
  }

  if (!isAllowedKiwifyProduct(normalized.produtoId)) {
    return NextResponse.json({
      ignored: true,
      ok: true,
      reason: "product_not_allowed"
    });
  }

  if (normalized.action === "ignore") {
    return NextResponse.json({
      ignored: true,
      ok: true,
      reason: "event_not_mapped",
      status: normalized.status
    });
  }

  const access = await upsertKiwifyAccess({
    email: normalized.email,
    nome: normalized.nome,
    telefone: normalized.telefone,
    produtoId: normalized.produtoId,
    produtoNome: normalized.produtoNome,
    pedidoId: normalized.pedidoId,
    assinaturaId: normalized.assinaturaId,
    status: normalized.status,
    acessoAtivo: normalized.acessoAtivo,
    validoAte: normalized.validoAte,
    ultimoEvento: normalized.ultimoEvento,
    payload
  });

  return NextResponse.json({
    acessoAtivo: access.acessoAtivo,
    email: access.email,
    ok: true,
    validoAte: access.validoAte
  });
}
