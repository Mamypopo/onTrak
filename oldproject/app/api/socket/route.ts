// This route is for Next.js to handle Socket.io
// The actual Socket.io server will be initialized in a custom server file
export async function GET() {
  return new Response('Socket.io endpoint', { status: 200 })
}

