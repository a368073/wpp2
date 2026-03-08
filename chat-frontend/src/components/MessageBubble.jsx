import React from 'react';

const MessageBubble = ({ message }) => {
  const { type, text, sender, isOwn, timestamp } = message;

  // Server notifications (e.g., someone joined, left, or raw unparseable strings)
  if (type === 'server') {
    return (
      <div className="flex w-full justify-center group my-2">
        <div className="bg-white px-4 py-2 border-2 border-black border-dashed max-w-[85%] text-center relative">
           <span className="text-xs font-bold uppercase tracking-widest text-black">
             {text}
           </span>
           <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
             {timestamp}
           </span>
        </div>
      </div>
    );
  }

  // Private Messages
  if (type === 'private') {
    return (
      <div className={`flex w-full group ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div 
          className="max-w-[75%] px-6 py-4 bg-black text-white relative shadow-[4px_4px_0px_0px_rgba(200,200,200,1)]"
        >
          <div className="flex items-center gap-2 mb-2">
             <span className="text-xs font-bold uppercase tracking-widest text-white">
               [PRIVADO] {sender}
             </span>
          </div>
          <p className="text-lg leading-relaxed break-words font-medium">{text}</p>
          <span className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-16' : '-right-16'} text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity`}>
            {timestamp}
          </span>
        </div>
      </div>
    );
  }

  // Regular Public Messages
  return (
    <div className={`flex w-full group ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[75%] px-6 py-4 relative ${
          isOwn 
            ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
            : 'bg-transparent text-gray-800'
        }`}
      >
        {!isOwn && (
          <div className="text-xs font-bold uppercase tracking-widest text-black mb-2 flex items-center justify-between">
            {sender}
          </div>
        )}
        <p className={`text-lg leading-relaxed break-words ${isOwn ? 'font-bold' : 'font-medium'}`}>{text}</p>
        <span className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-16' : '-right-20 pl-4'} text-[10px] font-bold text-gray-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity`}>
          {timestamp}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
