import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeSocket } from './lib/socket'
import open from 'open'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || '0.0.0.0' // เปิดให้เข้าถึงจากภายนอก
const port = parseInt(process.env.PORT || '3007', 10) // เปลี่ยน port เป็น 3001
const shouldOpen = process.env.OPEN !== 'false' // เปิด browser อัตโนมัติ

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.io
  initializeSocket(httpServer)

  httpServer
    .once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use.`)
        console.error('Please use a different port or stop the process using this port.')
        process.exit(1)
      } else {
        console.error(err)
        process.exit(1)
      }
    })
    .listen(port, hostname, () => {
      const url = `http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Local: ${url}`)
      
      // เปิด browser อัตโนมัติ
      if (shouldOpen && dev) {
        open(url).catch((err) => {
          console.error('Failed to open browser:', err)
        })
      }
    })
})

