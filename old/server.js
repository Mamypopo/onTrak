const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0' // Allow external access
const port = parseInt(process.env.PORT || '3001', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  // Make io available globally
  global.io = io

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, hostname, () => {
      const os = require('os')
      const networkInterfaces = os.networkInterfaces()
      let localIP = 'localhost'
      
      // Find local IP address
      for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName]
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address
            break
          }
        }
        if (localIP !== 'localhost') break
      }
      
      console.log(`> Ready on http://localhost:${port}`)
      console.log(`> Network: http://0.0.0.0:${port}`)
      console.log(`> Local IP: http://${localIP}:${port}`)
      console.log(`> Access from external devices using: http://${localIP}:${port}`)
      if (process.env.NEXT_PUBLIC_BASE_URL) {
        console.log(`> Using BASE_URL from env: ${process.env.NEXT_PUBLIC_BASE_URL}`)
      } else {
        console.log(`> ⚠️  Consider setting NEXT_PUBLIC_BASE_URL=http://${localIP}:${port} in .env for mobile access`)
      }
    })
})

