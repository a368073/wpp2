import React from 'react';

const Sidebar = ({ currentUser, onCommand }) => {
  return (
    <div className="w-80 h-full bg-white border-r-2 border-black flex flex-col flex-shrink-0">
      <div className="p-8 border-b-2 border-black flex flex-col space-y-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-black">
          whatsapp 2
        </h2>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Usuario</span>
          <h3 className="text-xl font-bold text-black truncate">{currentUser}</h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-black rounded-full"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-black">En linea</span>
          </div>
        </div>
      </div>
      
      <div className="p-8 flex-1 flex flex-col">
         <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Commandos</h3>
         <div className="flex flex-col space-y-5">
            <button 
               onClick={() => onCommand('/list')}
               className="text-left text-lg font-bold text-black hover:underline decoration-2 underline-offset-4 transition-all w-fit uppercase"
            >
               /list
            </button>
            <button 
               onClick={() => onCommand('/historial')}
               className="text-left text-lg font-bold text-black hover:underline decoration-2 underline-offset-4 transition-all w-fit uppercase"
            >
               /historial
            </button>
            <button 
               onClick={() => onCommand('/quit')}
               className="text-left text-lg font-bold text-gray-400 hover:text-black hover:underline decoration-2 underline-offset-4 transition-all w-fit uppercase mt-8"
            >
               /quit
            </button>
         </div>
         
         <div className="mt-auto pt-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Mensaje privado</h3>
            <div className="border-2 border-black p-4">
               <code className="text-sm font-bold text-black block mb-2">@username msg</code>
               <p className="text-xs text-gray-600 font-medium">Envia mensajes privados a tus amigos</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Sidebar;
