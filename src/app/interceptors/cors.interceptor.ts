import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class CorsInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only add CORS headers for local development and kndl-inc.com
    const currentOrigin = window.location.origin;
    const isLocal = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');
    const isKndlDomain = currentOrigin.includes('kndl-inc.com');

    if (isLocal || isKndlDomain) {
      // Clone the request and add CORS headers
      const corsRequest = req.clone({
        setHeaders: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Content-Type': 'application/json'
        }
      });

      return next.handle(corsRequest);
    }

    // For other origins, proceed without modification
    return next.handle(req);
  }
}