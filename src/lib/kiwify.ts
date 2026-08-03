import { createHmac, timingSafeEqual } from "crypto";

import { normalizeAccessEmail } from "@/lib/accessControl";

type JsonRecord = Record<string, unknown>;

type NormalizedKiwifyPayload = {
  action: "activate" | "deactivate" | "ignore";
  acessoAtivo: boolean;
  email: string | null;
  nome: string | null;
  telefone: string | null;
  produtoId: string | null;
  produtoNome: string | null;
  pedidoId: string | null;
  assinaturaId: string | null;
  status: string;
  validoAte: Date | null;
  ultimoEvento: string | null;
};

const ACTIVE_EVENTS = new Set([
  "order_approved",
  "order_paid",
  "pedido_aprovado",
  "purchase_approved",
  "purchase_paid",
  "paid",
  "approved",
  "subscription_renewed",
  "subscription_paid",
  "subscription_approved"
]);

const INACTIVE_EVENTS = new Set([
  "order_refunded",
  "order_refund",
  "refunded",
  "refund",
  "purchase_refunded",
  "chargeback",
  "order_chargeback",
  "purchase_chargeback",
  "subscription_canceled",
  "subscription_cancelled",
  "subscription_expired",
  "canceled",
  "cancelled",
  "cancelado",
  "order_canceled",
  "order_cancelled"
]);

export function verifyKiwifyWebhookRequest(request: Request, rawBody: string) {
  const token = process.env.KIWIFY_WEBHOOK_TOKEN?.trim();
  const signatureSecret = process.env.KIWIFY_WEBHOOK_SECRET?.trim();
  const url = new URL(request.url);
  const receivedToken =
    url.searchParams.get("token") ??
    request.headers.get("x-webhook-token") ??
    request.headers.get("x-kiwify-token");

  if (token && safeCompare(receivedToken, token)) {
    return { ok: true as const };
  }

  if (signatureSecret) {
    const signature =
      request.headers.get("x-kiwify-signature") ??
      request.headers.get("x-webhook-signature") ??
      request.headers.get("x-signature") ??
      request.headers.get("kiwify-signature");

    if (signature && verifyHmacSignature(rawBody, signature, signatureSecret)) {
      return { ok: true as const };
    }

    if (!token) {
      return {
        ok: false as const,
        message: "Assinatura do webhook invalida.",
        status: 401
      };
    }
  }

  if (token) {
    return {
      ok: false as const,
      message: "Token do webhook invalido.",
      status: 401
    };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      ok: false as const,
      message: "Configure KIWIFY_WEBHOOK_TOKEN ou KIWIFY_WEBHOOK_SECRET.",
      status: 500
    };
  }

  return { ok: true as const };
}

export function normalizeKiwifyPayload(
  payload: JsonRecord
): NormalizedKiwifyPayload {
  const rawEvent = normalizeEventKey(
    getFirstString(payload, [
      ["webhook_event_type"],
      ["event"],
      ["event_type"],
      ["type"],
      ["data", "event"],
      ["data", "type"]
    ])
  );
  const orderStatus = normalizeEventKey(
    getFirstString(payload, [
      ["order_status"],
      ["status"],
      ["payment_status"],
      ["purchase", "status"],
      ["data", "status"]
    ])
  );
  const status = rawEvent || orderStatus || "recebido";
  const action = getKiwifyAction(rawEvent, orderStatus);
  const email = getFirstString(payload, [
    ["Customer", "email"],
    ["customer", "email"],
    ["buyer", "email"],
    ["Buyer", "email"],
    ["data", "Customer", "email"],
    ["data", "customer", "email"],
    ["data", "buyer", "email"],
    ["email"]
  ]);
  const approvedAt = parseDate(
    getFirstString(payload, [
      ["approved_date"],
      ["approved_at"],
      ["paid_at"],
      ["created_at"],
      ["updated_at"],
      ["purchase", "created_at"],
      ["data", "created_at"]
    ])
  );
  const explicitValidity = parseDate(
    getFirstString(payload, [
      ["valid_until"],
      ["valid_until_at"],
      ["expires_at"],
      ["expiration_at"],
      ["access_until"],
      ["Subscription", "next_payment"],
      ["Subscription", "expires_at"],
      ["Subscription", "ends_at"],
      ["subscription", "next_payment"],
      ["subscription", "expires_at"],
      ["subscription", "ends_at"],
      ["purchase", "subscription", "expires_at"]
    ])
  );
  const acessoAtivo = action === "activate";

  return {
    action,
    acessoAtivo,
    email: email ? normalizeAccessEmail(email) : null,
    nome:
      getFirstString(payload, [
        ["Customer", "full_name"],
        ["Customer", "first_name"],
        ["customer", "name"],
        ["customer", "full_name"],
        ["buyer", "name"],
        ["Buyer", "name"],
        ["data", "customer", "name"],
        ["name"]
      ]) ?? null,
    telefone:
      getFirstString(payload, [
        ["Customer", "mobile"],
        ["Customer", "phone"],
        ["customer", "phone"],
        ["buyer", "phone"],
        ["Buyer", "phone"],
        ["data", "customer", "phone"],
        ["phone"]
      ]) ?? null,
    produtoId:
      getFirstString(payload, [
        ["Product", "product_id"],
        ["Product", "id"],
        ["product", "id"],
        ["product", "product_id"],
        ["data", "Product", "product_id"],
        ["data", "product", "id"],
        ["product_id"]
      ]) ?? null,
    produtoNome:
      getFirstString(payload, [
        ["Product", "product_name"],
        ["Product", "name"],
        ["product", "name"],
        ["product", "product_name"],
        ["data", "Product", "product_name"],
        ["data", "product", "name"],
        ["product_name"]
      ]) ?? null,
    pedidoId:
      getFirstString(payload, [
        ["order_id"],
        ["order_ref"],
        ["id"],
        ["payment_id"],
        ["purchase", "transaction"],
        ["data", "order_id"],
        ["data", "id"]
      ]) ?? null,
    assinaturaId:
      getFirstString(payload, [
        ["Subscription", "id"],
        ["Subscription", "subscription_id"],
        ["subscription", "id"],
        ["subscription", "subscription_id"],
        ["purchase", "subscription", "id"],
        ["subscription_id"]
      ]) ?? null,
    status,
    validoAte: acessoAtivo
      ? explicitValidity ?? addDays(approvedAt ?? new Date(), getAccessDays())
      : new Date(),
    ultimoEvento: rawEvent || orderStatus || null
  };
}

export function isAllowedKiwifyProduct(productId: string | null) {
  const allowedIds = process.env.KIWIFY_ALLOWED_PRODUCT_IDS?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!allowedIds?.length) {
    return true;
  }

  return Boolean(productId && allowedIds.includes(productId));
}

function getKiwifyAction(rawEvent: string, orderStatus: string) {
  if (INACTIVE_EVENTS.has(rawEvent) || INACTIVE_EVENTS.has(orderStatus)) {
    return "deactivate";
  }

  if (ACTIVE_EVENTS.has(rawEvent) || ACTIVE_EVENTS.has(orderStatus)) {
    return "activate";
  }

  return "ignore";
}

function getAccessDays() {
  const days = Number(process.env.KIWIFY_ACCESS_DAYS ?? "365");
  return Number.isFinite(days) && days > 0 ? days : 365;
}

function getFirstString(payload: JsonRecord, paths: string[][]) {
  for (const path of paths) {
    const value = getValueAtPath(payload, path);

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function getValueAtPath(payload: JsonRecord, path: string[]) {
  let current: unknown = payload;

  for (const key of path) {
    if (!isRecord(current)) {
      return null;
    }

    current = current[key];
  }

  return current;
}

function normalizeEventKey(value: string | null) {
  return value?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function verifyHmacSignature(rawBody: string, signature: string, secret: string) {
  const normalizedSignature = signature.trim().replace(/^sha256=/i, "");
  const hexDigest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const base64Digest = createHmac("sha256", secret).update(rawBody).digest("base64");

  return (
    safeCompare(normalizedSignature, hexDigest) ||
    safeCompare(normalizedSignature, base64Digest)
  );
}

function safeCompare(received: string | null | undefined, expected: string) {
  if (!received) {
    return false;
  }

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
