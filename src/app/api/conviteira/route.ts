import { NextResponse } from "next/server";

import { updateConviteira } from "@/db/queries";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { sanitizeWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type ConviteiraPayload = {
  nomeMarca?: string;
  slug?: string;
  bio?: string | null;
  whatsapp?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  corPrincipal?: string;
  corDestaque?: string;
  fonteCatalogo?: string;
};

export async function GET() {
  try {
    const { conviteira, created } = await requireConviteira();
    return NextResponse.json({ conviteira, created });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<ConviteiraPayload>(request);

    if (body.nomeMarca !== undefined && !body.nomeMarca.trim()) {
      return jsonError("Nome da marca é obrigatório.");
    }

    if (body.whatsapp !== undefined && !sanitizeWhatsApp(body.whatsapp)) {
      return jsonError("WhatsApp é obrigatório.");
    }

    const updated = await updateConviteira(conviteira.id, {
      nomeMarca: body.nomeMarca?.trim(),
      slug: body.slug ? slugify(body.slug) : undefined,
      bio: body.bio ?? undefined,
      whatsapp: body.whatsapp ? sanitizeWhatsApp(body.whatsapp) : undefined,
      logoUrl: body.logoUrl ?? undefined,
      bannerUrl: body.bannerUrl ?? undefined,
      corPrincipal: body.corPrincipal,
      corDestaque: body.corDestaque,
      fonteCatalogo: body.fonteCatalogo
    });

    return NextResponse.json({ conviteira: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
