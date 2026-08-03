import type { currentUser } from "@clerk/nextjs/server";

import { getActiveKiwifyAccessByEmail } from "@/db/queries";

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export function isKiwifyAccessControlEnabled() {
  return process.env.KIWIFY_ACCESS_CONTROL_ENABLED === "true";
}

export function normalizeAccessEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getUserPrimaryEmail(user: ClerkUser) {
  const primaryEmailId = user.primaryEmailAddressId;
  const primaryEmail =
    user.emailAddresses.find((email) => email.id === primaryEmailId) ??
    user.emailAddresses[0];

  return primaryEmail?.emailAddress
    ? normalizeAccessEmail(primaryEmail.emailAddress)
    : null;
}

export async function userHasPanelAccess(user: ClerkUser) {
  if (!isKiwifyAccessControlEnabled()) {
    return true;
  }

  const email = getUserPrimaryEmail(user);

  if (!email) {
    return false;
  }

  if (isBypassEmail(email)) {
    return true;
  }

  const access = await getActiveKiwifyAccessByEmail(email);
  return Boolean(access);
}

export async function requirePanelAccess(user: ClerkUser) {
  const hasAccess = await userHasPanelAccess(user);

  if (!hasAccess) {
    throw new Response(
      JSON.stringify({
        error:
          "Acesso pendente. Entre com o mesmo e-mail usado na compra anual."
      }),
      {
        status: 403,
        headers: { "content-type": "application/json" }
      }
    );
  }
}

function isBypassEmail(email: string) {
  const bypassEmails = process.env.KIWIFY_ACCESS_BYPASS_EMAILS?.split(",")
    .map((item) => normalizeAccessEmail(item))
    .filter(Boolean);

  return Boolean(bypassEmails?.includes(email));
}
