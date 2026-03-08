import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import MessageBubble from './MessageBubble';

const ChatWindow = ({ messages, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full relative">
      {/* Header */}
      <div className="h-24 border-b-2 border-black flex items-center justify-between px-8 bg-white z-10 sticky top-0 flex-shrink-0">
        <div>
          <h2 className="text-black font-black text-3xl uppercase tracking-tighter">Global Lounge</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">Public TCP Channel</p>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-8 scroll-smooth bg-white space-y-6 flex flex-col">
        <div className="mb-4 border-l-4 border-black pl-4 flex-shrink-0">
           <h3 className="text-xl font-bold text-black uppercase tracking-tighter">Welcome to the TCP Chat</h3>
           <p className="text-sm text-gray-600 font-medium mt-1">Connected to raw Python Socket server via Node Proxy.</p>
        </div>

        {messages.length === 0 && (
           <div className="animate-pulse flex flex-col space-y-6 opacity-40 mt-8 flex-shrink-0">
              <div className="h-16 bg-gray-200 w-3/4 border-2 border-black border-dashed"></div>
              <div className="h-24 bg-gray-200 w-1/2 self-end border-2 border-black border-dashed"></div>
              <div className="h-12 bg-gray-200 w-2/3 border-2 border-black border-dashed"></div>
           </div>
        )}

        <div className="flex flex-col space-y-6 flex-1">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-8 bg-white flex-shrink-0">
        <div className="flex items-end max-w-5xl mx-auto group">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="TYPE A MESSAGE..."
            className="flex-1 bg-transparent text-black text-lg py-4 placeholder-gray-300 resize-none outline-none border-b-2 border-black focus:border-b-4 focus:border-black transition-all max-h-32 min-h-[60px]"
            rows="1"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="ml-6 w-14 h-14 flex-shrink-0 bg-black text-white flex items-center justify-center hover:bg-white hover:text-black border-2 border-black disabled:bg-gray-100 disabled:text-gray-300 disabled:border-transparent transition-all group-focus-within:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
          >
            <ArrowRight strokeWidth={3} size={24} className={inputText.trim() ? "translate-x-1 transition-transform" : "transition-transform"} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
