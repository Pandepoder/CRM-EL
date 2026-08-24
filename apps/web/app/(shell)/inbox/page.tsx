import { getDatabaseClient } from "@/lib/db-client";
import { createInboxDependencies } from "@/lib/inbox-deps";
import { MessageCircle, Phone, User, Send, CheckCheck, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ chatId?: string }> }) {
  const db = getDatabaseClient();
  const { repository } = await createInboxDependencies(db);

  const conversations = await repository.getConversations();
  const resolvedSearchParams = await searchParams;
  
  // If no chatId selected but we have conversations, default to first
  const activeChatId = resolvedSearchParams.chatId || (conversations.length > 0 ? conversations[0]?.id : null);
  
  const activeChat = conversations.find(c => c.id === activeChatId);
  const messages = activeChatId ? await repository.getMessages(activeChatId) : [];

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-gray-50 border-t border-gray-200">
      
      {/* COLUMN 1: Chat List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Bandeja Unificada
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No hay mensajes.</div>
          ) : (
            conversations.map(conv => (
              <Link 
                key={conv.id} 
                href={`/inbox?chatId=${conv.id}`}
                className={`block p-4 border-b border-gray-100 cursor-pointer transition-colors ${activeChatId === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-gray-900 text-sm truncate">{conv.contactName || conv.externalId}</h4>
                  <span className="text-[10px] text-gray-400 font-medium shrink-0">
                    {new Date(conv.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] uppercase font-bold tracking-wider">
                    {conv.channel}
                  </span>
                  <span className="truncate">{conv.status === 'open' ? 'Pendiente' : 'Cerrado'}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 2: Messages Area */}
      <div className="flex-1 flex flex-col bg-[#e5ddd5] relative">
        {/* Chat Background Pattern */}
        <div className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none" style={{ backgroundImage: "url('https://camo.githubusercontent.com/9788107297f6c6d0cc9d970982c7ceea0c7333bb7591e1d0cddb0f1604a56a64/68747470czovL3dlYi53aGF0c2FwcC5jb20vaW1nL2JnaS1jaGF0LXRpbGVfZGFya183MTIxMTUwNTBlMTE1MWUzZjJjZWZkZTA2ZTRiNjI2MS5wbmc')", backgroundSize: "400px" }}></div>
        
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 relative z-10 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 leading-tight">{activeChat.contactName || 'Desconocido'}</h3>
                <p className="text-xs text-gray-500">{activeChat.externalId}</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
              {messages.map(msg => {
                const isMe = msg.direction === 'outbound';
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm relative ${isMe ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
                      <p className="text-[14px] leading-snug">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-gray-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {isMe && <CheckCheck size={14} className="text-blue-500" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <div className="bg-gray-100 p-4 shrink-0 relative z-10">
              <div className="flex items-end gap-2 bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
                <textarea 
                  rows={1}
                  placeholder="Escribe un mensaje..." 
                  className="flex-1 max-h-32 bg-transparent outline-none resize-none px-2 py-1 text-sm"
                ></textarea>
                <button className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors">
                  <Send size={18} className="ml-1" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative z-10">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-300 mb-4 shadow-sm">
              <MessageCircle size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Bandeja Vacía</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-sm">Selecciona una conversación para ver los mensajes o configurar canales.</p>
          </div>
        )}
      </div>

      {/* COLUMN 3: CRM Context */}
      <div className="w-80 bg-white border-l border-gray-200 shrink-0 flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-gray-900 text-lg">Contexto Ciudadano</h2>
        </div>
        
        {activeChat ? (
          <div className="p-6">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-24 h-24 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <User size={48} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{activeChat.contactName || 'Desconocido'}</h3>
              <p className="text-gray-500 text-sm mt-1">{activeChat.contactPhone || activeChat.externalId}</p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Información</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID Contacto:</span>
                    <span className="font-mono font-medium text-gray-900">{activeChat.contactId?.slice(0,8) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Canal:</span>
                    <span className="font-medium text-gray-900 capitalize">{activeChat.channel}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Acciones Rápidas</h4>
                <div className="space-y-2">
                  <Link href={`/crm/${activeChat.contactId}`} className="block w-full text-center bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-700 font-semibold py-2 rounded-lg text-sm transition-colors">
                    Ver Perfil CRM Completo
                  </Link>
                  <button className="w-full bg-white border border-gray-200 hover:border-red-300 hover:text-red-600 text-gray-700 font-semibold py-2 rounded-lg text-sm transition-colors">
                    Marcar como Resuelto
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400 text-sm">
            Selecciona un chat para ver el contexto.
          </div>
        )}
      </div>

    </div>
  );
}
