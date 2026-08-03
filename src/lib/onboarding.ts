import { currentUser } from "@clerk/nextjs/server";

import {
  createConviteiraWithDefaults,
  getConviteiraByIdForUser,
  getConviteiraByUserId
} from "@/db/queries";

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export async function ensureConviteiraForUser(
  user: ClerkUser,
  selectedConviteiraId?: string
) {
  if (selectedConviteiraId) {
    const selected = await getConviteiraByIdForUser(selectedConviteiraId, user.id);

    if (selected) {
      return { conviteira: selected, created: false };
    }
  }

  const existing = await getConviteiraByUserId(user.id);

  if (existing) {
    return { conviteira: existing, created: false };
  }

  const nomeMarca =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "Minha marca";

  const whatsapp = user.primaryPhoneNumber?.phoneNumber || "5500000000000";
  const conviteira = await createConviteiraWithDefaults({
    clerkUserId: user.id,
    nomeMarca,
    whatsapp
  });

  return { conviteira, created: true };
}
