import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  if (error instanceof Error && error.message === "SLUG_IN_USE") {
    return jsonError("Este slug já está em uso.", 409);
  }

  console.error(error);
  return jsonError("Não foi possível concluir a solicitação.", 500);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("JSON_INVALIDO");
  }
}
