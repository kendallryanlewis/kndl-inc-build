# GitHub Pages SPA Routing Fix

## Problem
When deploying an Angular single-page application (SPA) to GitHub Pages, direct navigation to routes like `/dashboard` results in a 404 error with the message:
```
The site configured at this address does not contain the requested file.
```

## Root Cause
GitHub Pages is a static file server that looks for actual HTML files at the requested path. When you navigate to `https://www.kndl-inc.com/dashboard`, GitHub Pages looks for a file at `/dashboard/index.html` or `/dashboard.html`, which doesn't exist because Angular handles routing client-side.

## Solution
We implement a redirect strategy that:
1. Serves a custom `404.html` when GitHub Pages can't find a file
2. The `404.html` contains JavaScript that converts the path into a query parameter
3. Redirects back to `index.html` with the path as a query parameter
4. `index.html` extracts the path and uses `history.replaceState()` to restore the original URL
5. Angular router then handles the navigation

## Implementation

### 1. Created `/src/404.html`
This file is served by GitHub Pages when a route is not found. It contains:
- A copy of the main `index.html` structure (to ensure consistency)
- JavaScript that captures the current path and redirects to `index.html` with the path as a query parameter

### 2. Updated `/src/index.html`
Added a script in the `<head>` that:
- Checks for the redirect query parameter (`p`)
- Extracts the original path
- Uses `history.replaceState()` to restore the correct URL
- Allows Angular router to take over

### 3. Updated `angular.json`
Added `"src/404.html"` to the assets array so it gets copied to the dist folder during build.

## How It Works

### Example Flow:
1. User navigates to `https://www.kndl-inc.com/dashboard`
2. GitHub Pages can't find `/dashboard/index.html`, serves `404.html`
3. JavaScript in `404.html` redirects to `/?p=/dashboard`
4. GitHub Pages serves `index.html`
5. JavaScript in `index.html` detects `?p=/dashboard`
6. Uses `history.replaceState()` to change URL back to `/dashboard`
7. Angular app loads and router navigates to the dashboard component

## Testing
After deploying, test these scenarios:
- ✅ Direct navigation to `/dashboard` should work
- ✅ Refreshing the page on `/dashboard` should work
- ✅ Deep links like `/dashboard?tab=customers` should work
- ✅ Root URL `/` should still work normally
- ✅ Browser back/forward buttons should work correctly

## Build & Deploy
```bash
# Build for production
npm run build

# The 404.html will be automatically copied to dist/kndl/404.html

# Deploy to GitHub Pages (automatic via GitHub Actions or manual)
```

## Important Notes
- The `404.html` must be in the root of your GitHub Pages site (dist folder)
- The redirect is instant and seamless to users
- This solution is recommended by GitHub for SPAs
- Works with Angular, React, Vue, and other SPA frameworks

## References
- [GitHub Pages SPA Solution](https://github.com/rafrex/spa-github-pages)
- [Angular Deployment Documentation](https://angular.io/guide/deployment)
- [GitHub Pages Custom 404](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)

## Troubleshooting

### If routes still don't work:
1. Verify `404.html` is in the root of your deployed site
2. Check browser console for JavaScript errors
3. Ensure `base href="/"` is set in index.html
4. Clear browser cache and try again
5. Check that the Angular router is configured with `useHash: false`

### If you see infinite redirects:
- Make sure both scripts (in 404.html and index.html) are identical
- Check for conflicts with other routing scripts

### Cache Issues:
- GitHub Pages caches aggressively - wait 5-10 minutes after deployment
- Use incognito/private browsing to test
- Add `?v=timestamp` to URL to bypass cache
