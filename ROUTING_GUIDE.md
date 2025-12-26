# Multi-Page Routing Guide

This project uses **wouter** for client-side routing. All pages are accessible through the navigation bar.

## Available Routes

### Main Pages
- `/` - Landing page (Home)
- `/dao` - DAO Governance page
- `/nft` - NFT Marketplace page
- `/demo` - Live Demo page
- `/p2p` - P2P Demo page
- `/tokens` - Token Ecosystem page
- `/verychain` - Verychain page

### Other Routes
- `/checkout/success` - Checkout success page
- `/checkout/cancel` - Checkout cancel page
- `/404` - Not found page

## Navigation

All pages include:
- **Navbar** - Fixed navigation bar at the top with links to all main pages
- **Footer** - Footer component at the bottom
- **Error Boundaries** - Each page has error handling

## How to Access Pages

1. **Via Navigation Bar**: Click on any link in the navbar (visible on all pages)
2. **Direct URL**: Navigate directly to `/dao` or `/nft` in your browser
3. **Programmatic Navigation**: Use wouter's `useLocation` hook:
   ```tsx
   import { useLocation } from 'wouter';
   const [, setLocation] = useLocation();
   setLocation('/dao');
   ```

## Page Structure

Each page follows this structure:
```tsx
<div className="min-h-screen bg-background text-foreground">
  <Navbar />
  <main>
    {/* Page content */}
  </main>
  <Footer />
</div>
```

## Testing Routes on Lovable

1. Make sure the app is running
2. Click on "DAO" or "NFT Marketplace" in the navbar
3. Or navigate directly to `/dao` or `/nft` in the URL bar
4. All routes should work with client-side routing (no page refresh)

## Troubleshooting

If routes aren't working:
1. Check that `App.tsx` has all routes defined in the `<Switch>` component
2. Verify that pages import and use `<Navbar />` and `<Footer />` components
3. Ensure wouter is properly installed: `npm list wouter`
4. Check browser console for any routing errors

