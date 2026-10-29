import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message);
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message);
  }
}

export function jsonError(message: string, status: number, code?: string): NextResponse {
  return NextResponse.json(code ? { error: message, code } : { error: message }, { status });
}

/** Turns thrown HttpErrors into JSON responses so handlers can stay linear. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.message, err.status, err.code);
      console.error(err);
      return jsonError("Terjadi kesalahan di server. Coba lagi sebentar.", 500);
    }
  };
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Body harus berupa JSON yang valid");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Body harus berupa JSON object");
  }
  return body as Record<string, unknown>;
}
