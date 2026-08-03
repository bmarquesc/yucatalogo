import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import {
  createConviteiraWithDefaults,
  getConviteiraById,
  getConviteiraBySlug,
  getFirstConviteira
} from "@/db/queries";
import { requirePanelAccess } from "@/lib/accessControl";
import { isLocalDevAuthEnabled } from "@/lib/devMode";
import { ensureConviteiraForUser } from "@/lib/onboarding";

export const ACTIVE_CATALOGO_COOKIE = "yc_catalogo_id";

export async function getLocalDevConviteira() {
  if (!isLocalDevAuthEnabled()) {
    return null;
  }

  const selectedId = cookies().get(ACTIVE_CATALOGO_COOKIE)?.value;
  if (selectedId) {
    const selected = await getConviteiraById(selectedId);
    if (selected) {
      return { conviteira: selected, created: false };
    }
  }

  const slug = process.env.DEV_AUTH_SLUG?.trim();
  if (slug) {
    const conviteira = await getConviteiraBySlug(slug);
    if (conviteira) {
      return { conviteira, created: false };
    }
  }

  const existing = await getFirstConviteira();
  if (existing) {
    return { conviteira: existing, created: false };
  }

  const conviteira = await createConviteiraWithDefaults({
    clerkUserId: "dev-local-user",
    nomeMarca: "Catalogo local",
    whatsapp: "5500000000000"
  });

  return { conviteira, created: true };
}

export async function requireUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Response(JSON.stringify({ error: "Não autorizado." }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }

  const user = await currentUser();

  if (!user) {
    throw new Response(JSON.stringify({ error: "Usuário não encontrado." }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }

  return user;
}

export async function requireConviteira() {
  const localDevConviteira = await getLocalDevConviteira();

  if (localDevConviteira) {
    return localDevConviteira;
  }

  const user = await requireUser();
  await requirePanelAccess(user);

  const selectedId = cookies().get(ACTIVE_CATALOGO_COOKIE)?.value;
  return ensureConviteiraForUser(user, selectedId);
}
