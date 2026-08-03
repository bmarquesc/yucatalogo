import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  isKiwifyAccessControlEnabled,
  userHasPanelAccess
} from "@/lib/accessControl";

export const dynamic = "force-dynamic";

export default async function SemAcessoPage() {
  if (!isKiwifyAccessControlEnabled()) {
    redirect("/painel");
  }

  const user = await currentUser();

  if (user && (await userHasPanelAccess(user))) {
    redirect("/painel");
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-message-card" aria-label="Acesso pendente">
        <Image
          alt="Yu Sistema"
          className="auth-logo"
          height={168}
          priority
          src="/yu-sistema-sem-fundo.png"
          width={168}
        />
        <h1 className="auth-title">Acesso pendente</h1>
        <p className="auth-subtitle">
          Entre com o mesmo e-mail usado na compra anual da Kiwify. Se a compra
          acabou de ser aprovada, aguarde alguns instantes e tente novamente.
        </p>
        <div className="auth-message-actions">
          {user ? (
            <SignOutButton redirectUrl="/entrar">
              <button className="button" type="button">
                Sair e entrar com outro e-mail
              </button>
            </SignOutButton>
          ) : (
            <Link className="button" href="/entrar">
              Entrar
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
