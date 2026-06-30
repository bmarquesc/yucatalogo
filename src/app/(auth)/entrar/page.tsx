"use client";

import { SignIn } from "@clerk/nextjs";

const appearance = {
  elements: {
    headerTitle: "hidden",
    headerSubtitle: "hidden"
  }
};

export default function EntrarPage() {
  return (
    <main className="auth-page">
      <SignIn
        appearance={appearance}
        path="/entrar"
        routing="path"
        signUpUrl="/cadastro"
        fallbackRedirectUrl="/painel"
      />
    </main>
  );
}
