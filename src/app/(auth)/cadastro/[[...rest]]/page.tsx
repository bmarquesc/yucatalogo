"use client";

import { SignUp } from "@clerk/nextjs";

const appearance = {
  elements: {
    headerTitle: "hidden",
    headerSubtitle: "hidden"
  }
};

export default function CadastroPage() {
  return (
    <main className="auth-page">
      <SignUp
        appearance={appearance}
        path="/cadastro"
        routing="path"
        signInUrl="/entrar"
        fallbackRedirectUrl="/painel"
      />
    </main>
  );
}
