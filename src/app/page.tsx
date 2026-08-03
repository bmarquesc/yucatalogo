import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { isPublicCatalogHost } from "@/lib/domains";

export default function HomePage() {
  if (isPublicCatalogHost(headers().get("host"))) {
    return (
      <main className="neutral-catalog-page">
        <section className="neutral-catalog-message">
          <p className="page-kicker">Catalogo</p>
          <h1>Abra o link completo do catalogo</h1>
          <p>
            O endereco precisa ter o nome do catalogo depois da barra, como
            /nome-da-marca.
          </p>
        </section>
      </main>
    );
  }

  redirect("/entrar");
}
