import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import net from 'net';
import cors from 'cors';

const app = express();
app.use(cors());

// Serve the production React frontend 
app.use(express.static('dist'));

const httpServer = createServer(app);

// Use Socket.io for React clients
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const TCP_PORT = 9999;
const TCP_HOST = '127.0.0.01'; // Default localhost depending on your Python bind
const PROXY_PORT = 3001;

// Keep track of which React client (Socket.io) maps to which Python (TCP) socket
const clients = new Map();

io.on('connection', (socket) => {
  console.log(`[Proxy] React client connected: ${socket.id}`);

  // Create a new raw TCP socket to connect to the Python server for this web user
  const tcpClient = new net.Socket();
  
  // When the Python server sends data, forward it to this specific React app
  tcpClient.on('data', (data) => {
    const rawString = data.toString('utf-8');
    // Raw strings from Python arrive separated by \n, sometimes multiple in one chunk
    const messages = rawString.split('\n').filter(m => m.trim().length > 0);
    
    messages.forEach(msg => {
      console.log(`[Python -> React (${socket.id})]:`, msg);
      socket.emit('chat_message', msg);
    });
  });

  tcpClient.on('error', (err) => {
    console.error(`[Proxy] TCP Connection Error for ${socket.id}:`, err.message);
    socket.emit('server_error', 'Lost connection to Chat Server');
  });

  tcpClient.on('close', () => {
    console.log(`[Proxy] TCP Connection closed for ${socket.id}`);
    socket.emit('server_error', 'Disconnected from Chat Server');
  });

  // When React sends a message, forward it to Python
  socket.on('send_message', (msg) => {
    if (!tcpClient.pending && !tcpClient.destroyed) {
      console.log(`[React (${socket.id}) -> Python]:`, msg);
      tcpClient.write(msg + '\n', 'utf-8');
    }
  });

  // Handle Handshake Connection to python
  // React will explicitly request to "connect" with a username
  socket.on('tcp_connect', () => {
    // We connect to the Python Server AT THIS POINT
    tcpClient.connect(TCP_PORT, '127.0.0.1', () => {
        console.log(`[Proxy] Connected mapping ${socket.id} to TCP Server :9999`);
    });
  });

  // Cleanup when React disconnects
  socket.on('disconnect', () => {
    console.log(`[Proxy] React client disconnected: ${socket.id}`);
    tcpClient.destroy();
  });
});

httpServer.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[Proxy] Socket.io bridge server running on http://0.0.0.0:${PROXY_PORT}`);
  console.log(`[Proxy] Forwarding connections to TCP Python Server on port ${TCP_PORT}`);
});
