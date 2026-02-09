import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, RotateCcw, Search, Info, MapPin, ShieldCheck, FileText, Clock, HelpCircle } from 'lucide-react';

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
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with a welcoming greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    
    // Only set initial message if empty
    if (messages.length === 0) {
      setMessages([{
        text: `👋 **${greeting}!** I'm your **uLost AI Assistant**.\n\nI can help you search for lost items, guide you through reporting, or answer questions about the process.\n\nTry typing **"Keys"**, **"How to report"**, or **"Where is the office"**.`, 
        sender: 'bot', 
        timestamp: new Date()
      }]);
    }
  }, []);

  // Combined FAQ Options
  const faqOptions = [
    { label: "Report Lost Item", icon: <FileText size={14}/> },
    { label: "How to claim?", icon: <ShieldCheck size={14}/> },
    { label: "Check Status", icon: <Clock size={14}/> },
    { label: "Guidance Location", icon: <MapPin size={14}/> }
  ];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleReset = () => {
    if (window.confirm("Clear conversation history?")) {
      setMessages([]);
      window.location.reload(); // Simple reload to reset state cleanly
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

  // --- MERGED BRAIN: FAQs, INSTRUCTIONS & DATABASE SEARCH ---
  const getResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase().trim();
    
    // Date Normalization
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const isToday = (date: any) => date && new Date(date).toISOString().split('T')[0] === todayISO;

    // --- 1. SYSTEM & LOCATION (Static FAQs) ---
    if (msg.includes('about') || msg.includes('system') || msg.includes('what is')) {
      return "🏢 **About uLost**\n\nManaged by the **Guidance Office**, uLost is a digital system designed to reunite SINHS students with their lost belongings quickly and securely. All items listed here are physically held by school staff.";
    }
    
    if (msg.includes('location') || msg.includes('office') || msg.includes('where')) {
      return "📍 **Guidance Office Location**\n\nThe Guidance Office is located on the **Ground Floor of the Main Building**, right beside the Principal's Office.\n\n**Office Hours:** 7:30 AM - 4:30 PM (Mon-Fri).";
    }

    // --- 2. INSTRUCTIONAL RESPONSES (Restored from Old Code) ---
    // Reporting Lost Items
    if (msg.includes('report lost') || msg.includes('lost item') || msg.includes('i lost')) {
      return "📝 **How to Report a Lost Item**\n\n1. Click **\"Report Lost\"** at the top of the homepage.\n2. Provide the item's **name, description**, and **last known location**.\n3. Submit the report.\n\nThe Guidance Office will review it and contact you if a match is found.";
    }

    // Reporting Found Items
    if (msg.includes('report found') || msg.includes('found item')) {
      return "🤝 **Report a Found Item**\n\nThank you for your honesty!\n\n1. Click **\"Report Found\"** at the top of the homepage.\n2. Fill in the details and upload a photo if possible.\n3. Please **keep the item with you** until the rightful owner claims it or turn it over to the Guidance Office.";
    }

    // Claiming Items
    if (msg.includes('claim') || msg.includes('how to claim')) {
      return "🔑 **How to Claim an Item**\n\n1. Locate the item in the feed behind this chat.\n2. Click the **'Claim'** button on the post.\n3. Visit the **Guidance Office** for verification.\n\n**Proof Required:** You must provide clear details (photo, receipt, or specific description) to verify ownership.";
    }

    // Verification & Status
    if (msg.includes('status') || msg.includes('check') || msg.includes('verify') || msg.includes('how long')) {
      return "📊 **Status & Verification**\n\n**Check Status:** Go to your Menu Bar Matches to see if your report is Pending, Verified, or Resolved.\n\n**Timeframe:** Most claims are reviewed within **1-3 days**. If urgent, please visit the Guidance Office directly.";
    }

    // Proof/Editing
    if (msg.includes('proof') || msg.includes('edit') || msg.includes('change')) {
      return "✏️ **Editing & Proof**\n\nYou cannot edit reports directly once submitted. Please visit the Guidance Office to make changes.\n\n**For Proof:** A photo, receipt, or unlocking the device in front of staff counts as valid proof.";
    }

    // --- 3. DATABASE SEARCH LOGIC (New Code Feature) ---
    // Extract potential keywords by removing common stopwords
    const filters = ['is', 'there', 'any', 'was', 'found', 'lost', 'search', 'item', 'searching', 'for', 'where', 'my', 'how', 'to', 'can', 'i'];
    const searchword = msg.split(' ').filter(w => !filters.includes(w)).join(' ').trim();

    // Only search if we have a valid keyword left
    if (searchword.length > 2) {
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
        
        res += `💡 **Next Step:** Check the main feed to see photos. If one matches, tap **"Claim"**.`;
        return res;
      }
      
      return `❌ **No matches found for "${searchword}"**\n\nI couldn't find that specific item. Try a broader category like **"Electronics"** or **"Bag"**, or ask me **"How to report lost item"**.`;
    }

    // --- 4. DEFAULT FALLBACK ---
    return "❓ **I didn't quite catch that**\n\nYou can ask me things like:\n• **\"I lost my ID\"** (to search)\n• **\"How to claim?\"**\n• **\"Where is the office?\"**\n•Or type a keyword like **\"Umbrella\"**.";
  };

  const handleAction = useCallback((text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { text, sender: 'user', timestamp: new Date() }]);
    setIsTyping(true);
    
    // Simulate thinking delay
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
                  <p className={`text-[10px] mt-2 opacity-60 ${m.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
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
          <div className="px-5 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50 border-t border-slate-100/50">
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
                  placeholder="Type an item name or question..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-100/80 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                />
              </div>
              <button 
                disabled={!input.trim()}
                type="submit"
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
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </>
  );
}