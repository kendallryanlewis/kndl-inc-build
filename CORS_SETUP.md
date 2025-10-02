# CORS Bypass Configuration for kndl-inc.com

## Overview
This configuration allows your Angular application to bypass CORS issues when running locally or on kndl-inc.com domains.

## What's Been Configured

### 1. Firebase Functions CORS (functions/stripe-products.js)
- Updated CORS origin list to include:
  - All localhost variations (http/https, any port)
  - All 127.0.0.1 variations (http/https, any port)
  - kndl-inc.com and www.kndl-inc.com
  - All kndl-inc.com subdomains
  - Firebase hosting URLs
- Added regex patterns for flexible localhost/127.0.0.1 port matching
- Enabled credentials and legacy browser support

### 2. CORS Storage Rules (cors.json)
- Updated Firebase Storage CORS to include:
  - localhost:4200 (http/https)
  - 127.0.0.1:4200
  - kndl-inc.com domains
  - Firebase hosting URLs

### 3. Angular HTTP Interceptor (src/app/interceptors/cors.interceptor.ts)
- Automatically adds CORS headers for local development
- Detects localhost and kndl-inc.com domains
- Adds necessary Access-Control headers

### 4. Angular Module Configuration (src/app/app.module.ts)
- Added CorsInterceptor to HTTP_INTERCEPTORS
- Automatically applies to all HTTP requests

## How to Use

### Option 1: Use the custom script
```bash
npm run dev
# or
./dev-serve.sh
```

### Option 2: Use the npm script
```bash
npm run start:cors
```

### Option 3: Manual start with CORS options
```bash
ng serve --host 0.0.0.0 --port 4200 --disable-host-check --proxy-config proxy.conf.json
```

## What Each Option Does

- `--host 0.0.0.0`: Allows connections from any IP
- `--port 4200`: Uses standard Angular port
- `--disable-host-check`: Disables Angular's host checking for development
- `--proxy-config proxy.conf.json`: Uses your existing proxy configuration

## Troubleshooting

If you still encounter CORS issues:

1. **Clear browser cache** - CORS policies can be cached
2. **Try incognito/private mode** - Eliminates extension interference
3. **Check browser console** - Look for specific CORS error messages
4. **Verify domain** - Ensure you're accessing via localhost:4200 or kndl-inc.com
5. **Firebase Functions** - Ensure functions are deployed with updated CORS settings

## Security Note

The CORS interceptor only adds permissive headers when:
- Running on localhost/127.0.0.1 (development)
- Running on kndl-inc.com domains (your production domain)

This ensures security is maintained for other environments.

## Firebase Storage CORS

To apply the cors.json configuration to Firebase Storage:
```bash
gsutil cors set cors.json gs://your-bucket-name
```

Replace `your-bucket-name` with your actual Firebase Storage bucket name.