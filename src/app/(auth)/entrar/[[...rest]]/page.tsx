"use client";

import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

import { authAppearance } from "@/lib/authAppearance";

export default function EntrarPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Entrar no Yu Sistema">
        <Image
          alt="Yu Sistema"
          className="auth-logo"
          height={168}
          priority
          src="/yu-sistema-sem-fundo.png"
          width={168}
        />
        <h1 className="auth-title">Entrar</h1>
        <p className="auth-subtitle">para continuar em Yu Sistema</p>
        <SignIn
          appearance={authAppearance}
          path="/entrar"
          routing="path"
          signUpUrl="/cadastro"
          fallbackRedirectUrl="/painel"
        />
      </section>
    </main>
  );
}
