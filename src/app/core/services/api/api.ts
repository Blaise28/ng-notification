import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { inject, Service, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { fromHttpErrorResponse } from './api-error';

export interface ApiRequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  context?: HttpContext;
  params?:
    | HttpParams
    | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  reportProgress?: boolean;
  responseType?: 'json';
  withCredentials?: boolean;
}

type HeaderOverrides = HttpHeaders | Record<string, string | string[]>;

@Service()
export class Api {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  isOnline = signal(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline.set(navigator.onLine);
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }
  }

  get<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    const { headerOverrides, httpOptions } = this.splitOptions(options);
    return this.pipeErrors(
      this.http.get<T>(this.buildUrl(path), {
        ...httpOptions,
        headers: this.mergeReadHeaders(headerOverrides),
      }),
    );
  }

  post<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    const { headerOverrides, httpOptions } = this.splitOptions(options);
    return this.pipeErrors(
      this.http.post<T>(this.buildUrl(path), body, {
        ...httpOptions,
        headers: this.mergeWriteHeaders(body, headerOverrides),
      }),
    );
  }

  put<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    const { headerOverrides, httpOptions } = this.splitOptions(options);
    return this.pipeErrors(
      this.http.put<T>(this.buildUrl(path), body, {
        ...httpOptions,
        headers: this.mergeWriteHeaders(body, headerOverrides),
      }),
    );
  }

  patch<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    const { headerOverrides, httpOptions } = this.splitOptions(options);
    return this.pipeErrors(
      this.http.patch<T>(this.buildUrl(path), body, {
        ...httpOptions,
        headers: this.mergeWriteHeaders(body, headerOverrides),
      }),
    );
  }

  delete<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    const { headerOverrides, httpOptions } = this.splitOptions(options);
    return this.pipeErrors(
      this.http.delete<T>(this.buildUrl(path), {
        ...httpOptions,
        headers: this.mergeReadHeaders(headerOverrides),
      }),
    );
  }

  buildUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const base = environment.apiUrl.replace(/\/+$/, '');
    const segment = path.replace(/^\/+/, '');
    if (!base) {
      return `/${segment}`;
    }
    return `${base}/${segment}`;
  }

  private splitOptions(options?: ApiRequestOptions): {
    headerOverrides?: HeaderOverrides;
    httpOptions: Omit<ApiRequestOptions, 'headers'>;
  } {
    const { headers: headerOverrides, ...httpOptions } = options ?? {};
    return { headerOverrides, httpOptions };
  }

  private baseAcceptHeaders(): HttpHeaders {
    return new HttpHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  }

  private mergeReadHeaders(overrides?: HeaderOverrides): HttpHeaders {
    return this.applyHeaderOverrides(this.baseAcceptHeaders(), overrides);
  }

  private mergeWriteHeaders(body: unknown, overrides?: HeaderOverrides): HttpHeaders {
    let h = this.baseAcceptHeaders();
    if (body instanceof FormData) {
      h = h.delete('Content-Type');
    }
    return this.applyHeaderOverrides(h, overrides);
  }

  private applyHeaderOverrides(base: HttpHeaders, overrides?: HeaderOverrides): HttpHeaders {
    if (!overrides) {
      return base;
    }
    if (overrides instanceof HttpHeaders) {
      let result = base;
      for (const key of overrides.keys()) {
        const values = overrides.getAll(key);
        if (values === null) {
          continue;
        }
        result = result.delete(key);
        for (let i = 0; i < values.length; i++) {
          const v = values[i];
          result = i === 0 ? result.set(key, v) : result.append(key, v);
        }
      }
      return result;
    }
    let result = base;
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        continue;
      }
      const values = Array.isArray(value) ? value : [value];
      result = result.delete(key);
      for (let i = 0; i < values.length; i++) {
        result =
          i === 0 ? result.set(key, String(values[i])) : result.append(key, String(values[i]));
      }
    }
    return result;
  }

  private pipeErrors<T>(source: Observable<T>): Observable<T> {
    return source.pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          return throwError(() => fromHttpErrorResponse(error));
        }
        return throwError(() => error);
      }),
    );
  }
}
