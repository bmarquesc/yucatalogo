import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { getPublicCatalog } from "@/db/queries";
import { pedidos } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import {
  buildPublicOrderFields,
  buildPublicOrderObservacoes,
  findPublicOrderClienteNome,
  findPublicOrderDataEvento,
  findPublicOrderWhatsapp,
  formatPublicArtePedidoNome,
  type PublicOrderValues
} from "@/lib/publicOrder";
import { sanitizeWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const catalog = await getPublicCatalog(params.slug);

    if (!catalog) {
      return jsonError("Catálogo não encontrado.", 404);
    }

    return NextResponse.json(catalog);
  } catch (error) {
    return handleRouteError(error);
  }
}

type PublicPedidoPayload = {
  arteId?: string;
  values?: PublicOrderValues;
};

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const catalog = await getPublicCatalog(params.slug);

    if (!catalog) {
      return jsonError("Catálogo não encontrado.", 404);
    }

    const body = await readJson<PublicPedidoPayload>(request);
    const arte = catalog.artes.find((item) => item.id === body.arteId);

    if (!arte) {
      return jsonError("Convite não encontrado.", 404);
    }

    const values = body.values ?? {};
    const fields = buildPublicOrderFields(catalog.campos);
    const clienteNome = findPublicOrderClienteNome(fields, values);
    const clienteWhatsapp = findPublicOrderWhatsapp(fields, values);

    if (!clienteNome) {
      return jsonError("Informe o nome do responsável pelo convite.");
    }

    if (!sanitizeWhatsApp(clienteWhatsapp)) {
      return jsonError("Informe o WhatsApp para contato.");
    }

    const tipoNome = arte.tipo?.nomePublico || arte.tipo?.nome || null;
    const arteNome = formatPublicArtePedidoNome(arte.nome, tipoNome);
    const [pedido] = await getDb()
      .insert(pedidos)
      .values({
        conviteiraId: catalog.conviteira.id,
        arteId: arte.id,
        clienteNome,
        clienteWhatsapp: sanitizeWhatsApp(clienteWhatsapp),
        arteNome,
        origem: "catalogo",
        status: "em_aberto",
        dataPedido: today(),
        dataEntrega: findPublicOrderDataEvento(fields, values),
        observacoes: buildPublicOrderObservacoes({
          arteNome: arte.nome,
          fields,
          tipoNome,
          values
        }),
        valorPago: 0,
        valorTotal: 0
      })
      .returning();

    return NextResponse.json({ pedido }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
