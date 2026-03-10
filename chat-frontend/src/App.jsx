import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

function App() {
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  // Connection Phase
  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    // Connect to the Node.js Proxy on your local laptop cambiar por la direccion ip del lugar 
    const proxyUrl = `http://localhost:3001`;
    const newSocket = io(proxyUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to Proxy Server!');
      // Force connection to Python
      newSocket.emit('tcp_connect');
    });

    newSocket.on('chat_message', (rawMsg) => {
      // The first thing Python expects is the username.
      // E.g., [SERVIDOR] Bienvenido. Ingresa tu nombre de usuario:
      if (rawMsg.includes('Ingresa tu nombre de usuario:')) {
        // Automatically respond with our username to complete Handshake
        newSocket.emit('send_message', username);
        setIsJoined(true);
        return; // Don't show this raw prompt to the UI natively
      }

      // Handle raw disconnect messages
      if (rawMsg.includes('Ese nombre ya está en uso. Desconectando.')) {
        alert('Ese nombre ya está en uso. Intenta con otro.');
        newSocket.disconnect();
        setIsJoined(false);
        setUsername('');
        return;
      }

      // Add other messages to state
      parseIncomingMessage(rawMsg);
    });

    newSocket.on('server_error', (err) => {
      alert(`Server Error: ${err}`);
      setIsJoined(false);
    });
  };

  const parseIncomingMessage = (rawMsg) => {
    const newMsg = {
      id: Date.now() + Math.random(),
      raw: rawMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Pattern 1: [SERVIDOR] message
    if (rawMsg.startsWith('[SERVIDOR]')) {
      newMsg.type = 'server';
      newMsg.text = rawMsg.replace('[SERVIDOR] ', '');
    }
    // Pattern 2: [PRIVADO] sender: message
    else if (rawMsg.startsWith('[PRIVADO]')) {
      newMsg.type = 'private';
      const parts = rawMsg.split(': ');
      newMsg.sender = parts[0]; // either [PRIVADO] sender or [PRIVADO → target]
      newMsg.text = parts.slice(1).join(': ');
    }
    // Pattern 3: Username: Message 
    // or History Data: Date Time User: Message
    else {
      // Attempt to find the first colon to split sender and message
      const firstColonIdx = rawMsg.indexOf(':');
      if (firstColonIdx > -1 && firstColonIdx < 30) { // arbitrary limit to avoid parsing time as sender
        newMsg.type = 'public';
        newMsg.sender = rawMsg.substring(0, firstColonIdx).trim();
        newMsg.text = rawMsg.substring(firstColonIdx + 1).trim();
        
        // Mark as own message if sender matches our username
        if (newMsg.sender === username) {
             newMsg.isOwn = true;
        }
      } else {
        // Fallback for weird strings
        newMsg.type = 'server';
        newMsg.text = rawMsg;
      }
    }

    setMessages((prev) => [...prev, newMsg]);
  };

  // User input from ChatWindow
  const handleSendMessage = (text) => {
    if (socket) {
      // Optimistic Update for UI only if it matches our commands or regular msg
      // Python's behavior: broadcasts to everyone else, but NOT back to the sender
      if (!text.startsWith('/')) { // Commands don't show explicitly in chat as our own bubbles generally
         const optimisticMsg = {
            id: Date.now(),
            type: 'public',
            sender: username,
            text: text,
            isOwn: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
         };
         setMessages(prev => [...prev, optimisticMsg]);
      }
      
      socket.emit('send_message', text);
      
      // Handle local quit state
      if (text === '/quit') {
         socket.disconnect();
         setIsJoined(false);
         setMessages([]);
      }
    }
  };

  if (!isJoined) {
    return (
      <div className="flex h-screen w-full bg-white items-center justify-center">
        <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-96 text-center">
          <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
             <span className="text-3xl text-white">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-black mb-2 uppercase tracking-tighter">Join TCP Chat</h1>
          <p className="text-gray-600 mb-8 text-sm font-light">Enter your username to connect to the raw socket server.</p>
          
          <form onSubmit={handleJoin} className="flex flex-col gap-6">
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username" 
              className="px-4 py-3 bg-transparent border-b-2 border-black focus:outline-none focus:border-black text-black font-medium placeholder-gray-400"
              required
            />
            <button 
              type="submit"
              className="py-3 bg-black text-white font-bold uppercase tracking-widest hover:bg-white hover:text-black hover:border-black border-2 border-transparent transition-colors shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:shadow-none"
            >
              Connect
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-black">
      <Sidebar 
        currentUser={username} 
        onCommand={handleSendMessage}
      />
      <ChatWindow 
        messages={messages} 
        onSendMessage={handleSendMessage} 
      />
    </div>
  );
}

export default App;
