import { HttpErrorResponse } from '@angular/common/http';

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly payload: unknown;

  constructor(
    message: string,
    init: { status: number; statusText: string; payload: unknown },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = init.status;
    this.statusText = init.statusText;
    this.payload = init.payload;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function extractNestMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const root = payload as Record<string, unknown>;
  const object = root['object'];
  if (object && typeof object === 'object') {
    const msg = (object as Record<string, unknown>)['response_message'];
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
  }
  return null;
}

export function fromHttpErrorResponse(err: HttpErrorResponse): ApiError {
  const status = err.status;
  const statusText = err.statusText ?? '';
  const payload = err.error;
  let message: string;
  if (status === 0) {
    message = 'Erreur réseau : impossible de joindre le serveur.';
  } else {
    message =
      extractNestMessage(payload) ??
      (typeof err.error === 'string' && err.error ? err.error : null) ??
      err.message ??
      `HTTP ${String(status)} ${statusText}`.trim();
  }
  return new ApiError(message, { status, statusText, payload });
}
