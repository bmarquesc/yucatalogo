import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OnboardingRedirect } from "@/components/painel/OnboardingRedirect";
import { Sidebar } from "@/components/painel/Sidebar";
import { ToastProvider } from "@/components/painel/ToastProvider";
import { getConviteirasByUserId } from "@/db/queries";
import { getLocalDevConviteira } from "@/lib/auth";
import { ensureConviteiraForUser } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function PainelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const localDevConviteira = await getLocalDevConviteira();

  if (localDevConviteira) {
    const { conviteira, created } = localDevConviteira;
    const catalogos = await getConviteirasByUserId(conviteira.clerkUserId);

    return (
      <ToastProvider>
        <div className="panel-layout">
          <Sidebar
            activeCatalogoId={conviteira.id}
            catalogos={catalogos.map(toCatalogoResumo)}
            localDev
            nomeMarca={conviteira.nomeMarca}
            slug={conviteira.slug}
          />
          <OnboardingRedirect shouldRedirect={created} />
          <main className="panel-main">{children}</main>
        </div>
      </ToastProvider>
    );
  }

  const { userId } = await auth();

  if (!userId) {
    redirect("/entrar");
  }

  const user = await currentUser();

  if (!user) {
    redirect("/entrar");
  }

  const { conviteira, created } = await ensureConviteiraForUser(user);
  const catalogos = await getConviteirasByUserId(user.id);

  return (
    <ToastProvider>
      <div className="panel-layout">
        <Sidebar
          activeCatalogoId={conviteira.id}
          catalogos={catalogos.map(toCatalogoResumo)}
          nomeMarca={conviteira.nomeMarca}
          slug={conviteira.slug}
        />
        <OnboardingRedirect shouldRedirect={created} />
        <main className="panel-main">{children}</main>
      </div>
    </ToastProvider>
  );
}

function toCatalogoResumo(catalogo: {
  id: string;
  nomeMarca: string;
  slug: string;
}) {
  return {
    id: catalogo.id,
    nomeMarca: catalogo.nomeMarca,
    slug: catalogo.slug
  };
}
