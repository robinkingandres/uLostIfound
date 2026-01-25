<<<<<<< HEAD
import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
=======
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, ChevronDown, ChevronUp, Sparkles, RotateCcw, BarChart3, Search, Info, MapPin, ShieldCheck } from 'lucide-react';
>>>>>>> origin/kenth

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  reports?: any[]; // Passed from UserHome.tsx
}

export default function Chatbot({ isOpen, onClose, reports = [] }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with a welcoming greeting
  useEffect(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    setMessages([{
      text: `👋 **${greeting}!** I'm your **uLost AI Assistant**.\n\nI can scan our school's live database in seconds. Simply type what you are looking for (e.g., **"Wallet"** or **"ID"**) to get started.`,
      sender: 'bot',
      timestamp: new Date()
    }]);
  }, []);

  const faqOptions = [
    { label: "About uLost", icon: <Info size={14}/> },
    { label: "How to claim?", icon: <ShieldCheck size={14}/> },
    { label: "Guidance Location", icon: <MapPin size={14}/> }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleReset = () => {
    if (window.confirm("Clear conversation?")) {
      window.location.reload(); 
    }
  };

  // Helper to render bold text into styled strong tags
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/\*\*(.*?)\*\*/g).map((part, j) => 
          j % 2 === 1 ? <strong key={j} className="font-extrabold text-blue-900">{part}</strong> : part
        )}
        <br />
      </span>
    ));
  };

  // --- BRAIN: FAQ & DATABASE SEARCH ---
  const getResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase().trim();
    
    // Date Normalization
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0]; 
    const isToday = (date: any) => date && new Date(date).toISOString().split('T')[0] === todayISO;

    // 1. FAQ DETECTION (Prioritized to avoid "No match" bugs)
    if (msg.includes('about')) {
      return "🏢 **uLost Portal**\n\nManaged by the **Guidance Office**, uLost is a digital system designed to reunite SINHS students with their lost belongings quickly and securely. All items listed here are physically held by the school staff.";
    }
    
    if (msg.includes('claim')) {
      return "🔑 **How to Claim an Item**\n\n1. Locate the item in the feed behind this chat.\n2. Click the **'Claim'** button on the post.\n3. Visit the **Guidance Office**.\n4. **Proof Required:** You must provide clear details (like a photo or description of contents) to verify it is yours.";
    }

    if (msg.includes('location') || msg.includes('office') || msg.includes('where is')) {
      return "📍 **Guidance Office Location**\n\nThe Guidance Office is located on the **Ground Floor of the Main Building**, right beside the Principal's Office.\n\n**Office Hours:** 7:30 AM - 4:30 PM (Mon-Fri).";
    }

    // 2. SEARCHWORD EXTRACTION
    const filters = ['is', 'there', 'any', 'was', 'found', 'lost', 'search', 'item', 'searching', 'for', 'where', 'my'];
    const searchword = msg.split(' ').filter(w => !filters.includes(w)).join(' ').trim();

    // 3. DATABASE SEARCH LOGIC
    if (searchword.length > 1) {
      const allMatches = reports.filter(item => 
        (item.itemName || "").toLowerCase().includes(searchword) || 
        (item.category || "").toLowerCase().includes(searchword) ||
        (item.description || "").toLowerCase().includes(searchword)
      );

      const today = allMatches.filter(item => isToday(item.date));
      const older = allMatches.filter(item => !isToday(item.date));

      if (allMatches.length > 0) {
        let res = `🔍 **Results for "${searchword.toUpperCase()}"**\n\n`;
        
        if (today.length > 0) {
          const itemsList = today.map(i => `• ${i.itemName}`).join('\n');
          res += `✨ **Found Today:**\n${itemsList}\n\n`;
        }
        
        if (older.length > 0) {
          res += `📜 **Older Records:**\nI found **${older.length}** historical record(s) matching your search.\n\n`;
        }
        
        res += `💡 **Next Step:** Check the main feed to see the photos of these items. If it matches yours, tap **"Claim"**.`;
        return res;
      }
      return `❌ **No matches found for "${searchword}"**\n\nI couldn't find a record of that item. Try searching for a category like **"Electronics"** or **"Documents"** if you're not sure of the name.`;
    }

    return "❓ **Can you be more specific?**\n\nEnter a keyword like **'ID'** or **'Wallet'**, or tap one of the quick options below.";
  };

  const handleAction = useCallback((text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { text, sender: 'user', timestamp: new Date() }]);
    setIsTyping(true);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { text: getResponse(text), sender: 'bot', timestamp: new Date() }]);
      setIsTyping(false);
    }, 800);
  }, [reports]);

  if (!isOpen) return null;

  return (
    <>
      {/* OVERLAY */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-[60]" onClick={onClose} />

      {/* CHAT CONTAINER */}
      <div className="fixed inset-0 z-[70] flex items-end justify-center pointer-events-none p-0 sm:p-4 md:justify-end">
        <div className="w-full h-full sm:h-[80vh] md:w-[420px] bg-white flex flex-col pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-10 duration-500 sm:rounded-[2rem] overflow-hidden border border-white/20">
          
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-xl">
                  <Bot size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight leading-none">uLost AI</h3>
                  <p className="text-blue-100 text-[11px] font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> SINHS Assistant
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset} title="Reset Chat" className="p-2 hover:bg-white/10 rounded-full transition-colors"><RotateCcw size={18} /></button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={22} /></button>
              </div>
            </div>
          </div>

          {/* MESSAGES AREA */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] px-5 py-4 shadow-sm leading-relaxed text-[14.5px] ${
                  m.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none font-medium' 
                    : 'bg-white text-gray-700 rounded-2xl rounded-tl-none border border-blue-100/50'
                }`}>
                  {formatText(m.text)}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-blue-100 px-5 py-3 rounded-2xl flex gap-1 items-center shadow-sm">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK ACTIONS */}
          <div className="px-5 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50">
            {faqOptions.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handleAction(opt.label)}
                className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2 bg-white border border-blue-100 rounded-full text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          {/* INPUT SECTION */}
          <div className="p-5 bg-white border-t border-slate-100">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleAction(input); setInput(''); }} 
              className="flex gap-3 items-center"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type an item name..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-100/80 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                />
              </div>
              <button 
                disabled={!input.trim()}
                className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95 flex-shrink-0"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </>
  );
}