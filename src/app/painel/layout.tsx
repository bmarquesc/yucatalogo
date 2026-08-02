import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OnboardingRedirect } from "@/components/painel/OnboardingRedirect";
import { Sidebar } from "@/components/painel/Sidebar";
import { ToastProvider } from "@/components/painel/ToastProvider";
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

    return (
      <div className="panel-layout">
        <Sidebar localDev nomeMarca={conviteira.nomeMarca} slug={conviteira.slug} />
        <OnboardingRedirect shouldRedirect={created} />
        <main className="panel-main">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
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

  return (
    <div className="panel-layout">
      <Sidebar nomeMarca={conviteira.nomeMarca} slug={conviteira.slug} />
      <OnboardingRedirect shouldRedirect={created} />
      <main className="panel-main">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
