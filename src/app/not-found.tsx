import Link from "next/link";
import { headers } from "next/headers";

import { isPublicCatalogHost } from "@/lib/domains";

export default function NotFound() {
  if (isPublicCatalogHost(headers().get("host"))) {
    return (
      <main className="neutral-catalog-page">
        <section className="neutral-catalog-message">
          <p className="page-kicker">Catalogo</p>
          <h1>Catalogo nao encontrado</h1>
          <p>Confira se o link foi digitado exatamente como foi enviado.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="panel-card" style={{ maxWidth: 420 }}>
        <p className="page-kicker">Catálogo</p>
        <h1 className="page-title" style={{ fontSize: 42 }}>
          Página não encontrada
        </h1>
        <p className="page-subtitle">
          O endereço informado não está disponível.
        </p>
        <Link className="button" href="/entrar" style={{ marginTop: 20 }}>
          Acessar painel
        </Link>
      </section>
    </main>
  );
}
