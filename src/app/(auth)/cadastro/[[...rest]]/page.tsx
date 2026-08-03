"use client";

import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

import { authAppearance } from "@/lib/authAppearance";

export default function CadastroPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Criar conta no Yu Sistema">
        <Image
          alt="Yu Sistema"
          className="auth-logo"
          height={168}
          priority
          src="/yu-sistema-sem-fundo.png"
          width={168}
        />
        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-subtitle">para começar em Yu Sistema</p>
        <SignUp
          appearance={authAppearance}
          path="/cadastro"
          routing="path"
          signInUrl="/entrar"
          fallbackRedirectUrl="/painel"
        />
      </section>
    </main>
  );
}
