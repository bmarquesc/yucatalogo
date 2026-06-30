import Link from "next/link";

export default function NotFound() {
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
