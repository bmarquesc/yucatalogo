import { auth, currentUser } from "@clerk/nextjs/server";

import { ensureConviteiraForUser } from "@/lib/onboarding";

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
  const user = await requireUser();
  return ensureConviteiraForUser(user);
}
