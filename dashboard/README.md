# OnTrak MDM Dashboard

Next.js 14 Dashboard for OnTrak MDM System.

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript
- ✅ TailwindCSS
- ✅ shadcn/ui components
- ✅ React Hook Form + Zod validation
- ✅ WebSocket realtime updates
- ✅ Responsive design
- ✅ Dark mode support

## Getting Started

### 1. Install Dependencies

```bash
cd dashboard
npm install
```

### 2. Setup Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Pages

- `/login` - Login page
- `/dashboard` - Main dashboard (tablet list)
- `/dashboard/device/[id]` - Device detail page
- `/dashboard/settings` - Settings page

## Components

- `src/components/ui/` - shadcn/ui components
- `src/components/` - Custom components

## API Integration

- `src/lib/api.ts` - Axios client with auth
- `src/lib/websocket.ts` - WebSocket client hook

## Next Steps

- Complete tablet list page
- Add device detail page with map
- Add control panel
- Add borrow/return UI
- Add settings page

