import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, RotateCcw, Search, FileText, MapPin, ShieldCheck, Bell, ChevronRight } from 'lucide-react';

// 1. Updated Interface to include 'type' (Lost vs Found)
interface ReportItem {
  id: number | string;
  type: 'Lost' | 'Found' | string; // Added this field
  itemName: string;
  description: string;
  category: string;
  date: string;
  location?: string;
  status?: string;
  image?: string;
}

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportItem[]; 
}

export default function Chatbot({ isOpen, onClose, reports = [] }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- INITIAL GREETING ---
  useEffect(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    
    if (messages.length === 0) {
      setMessages([{
        text: `👋 **${greeting}!** I'm your **uLost AI Assistant**.\n\nI can help you report items or search the database.\n\nTry typing **"Keys"**, **"I lost my ID"**, or tap a button below.`, 
        sender: 'bot', 
        timestamp: new Date()
      }]);
    }
  }, []);

  // --- AUTO SCROLL ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // --- AUTO FOCUS ---
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleReset = () => {
    if (window.confirm("Clear conversation history?")) {
      setMessages([]);
      window.location.reload(); 
    }
  };

  // Helper to render bold text
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i} className="block mb-1 last:mb-0">
        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="font-extrabold text-blue-900">{part}</strong> : part
        )}
      </span>
    ));
  };

  // --- THE BRAIN: LOGIC & DATABASE SEARCH ---
  const getResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase().trim();
    
    // Helper: Check if date is today
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const isToday = (dateStr: string) => dateStr && new Date(dateStr).toISOString().split('T')[0] === todayISO;

    // 1. SYSTEM & LOCATION INFO
    if (msg.includes('about') || msg.includes('system')) {
      return "🏢 **About uLost**\n\nManaged by the **Guidance Office**, uLost connects students with their lost belongings.";
    }
    
    if (msg.includes('location') || msg.includes('office') || msg.includes('where')) {
      return "📍 **Guidance Office Location**\n\nLocated at **ACG Building, Ground Floor**, beside the Principal's Office.\n\n**Hours:** 7:30 AM - 4:30 PM (Mon-Fri).";
    }

    // 2. INSTRUCTIONS (How-to)
    if (msg.includes('get notified') || msg.includes('notified') || msg.includes('notification bell') || msg.includes('notify me')) {
      return "**Get Notified**\n\nCheck the **notification bell** in the upper right.\nIclick ang **Enable Alerts** para magkaroon ng notification doon kapag may bagong na-report na **lost** o **found** item.";
    }

    if (msg.includes('report lost') || msg.includes('how to report')) {
      return "📝 **To Report a Lost Item:**\n\nGo to the **Guidance Office**, submit a description of an item, and where did u lose it.";
    }

    if (msg.includes('report found') || msg.includes('found item')) {
      return "🤝 **To Report a Found Item:**\n\nGo to the **Guidance Office**, submit a description of an item, and where did u found it. When did u lose it";
    }

    if (msg.includes('claim') || msg.includes('how to claim')) {
      return "🔑 **How to Claim:**\n\nGo to Guidance Office located at ACG building ground floor beside Principals office.";
    }

    // 3. DATABASE SEARCH LOGIC
    // Remove common words
    const stopWords = ['is', 'there', 'any', 'was', 'found', 'lost', 'search', 'item', 'searching', 'for', 'where', 'my', 'how', 'to', 'can', 'i', 'a', 'the', 'an'];
    const keywords = msg.split(' ').filter(w => !stopWords.includes(w) && w.length > 2);
    
    if (keywords.length > 0) {
      const searchword = keywords.join(' ');
      
      const matches = reports.filter(item => 
        (item.itemName || "").toLowerCase().includes(searchword) || 
        (item.category || "").toLowerCase().includes(searchword) || 
        (item.description || "").toLowerCase().includes(searchword)
      );

      const foundToday = matches.filter(item => isToday(item.date));
      const foundOlder = matches.filter(item => !isToday(item.date));

      if (matches.length > 0) {
        let response = `🔍 **I found ${matches.length} possible match(es) for "${searchword}":**\n\n`;
        
        // Helper to format item line with Status Indicator
        const renderItem = (item: ReportItem) => {
          // Determine icon/label based on type
          const isFound = item.type === 'Found';
          const badge = isFound ? '🟢 FOUND' : '🔴 LOST';
          return `• ${badge}: **${item.itemName}**\n  AT: ${item.location || 'Unknown loc'}\n`;
        };

        if (foundToday.length > 0) {
          response += `✨ **Posted Today:**\n`;
          foundToday.slice(0, 3).forEach(item => {
            response += renderItem(item);
          });
          response += `\n`;
        }
        
        if (foundOlder.length > 0) {
          response += `📜 **Older Records:**\n`;
           foundOlder.slice(0, 3).forEach(item => {
            response += renderItem(item);
          });
          if (foundOlder.length > 3) response += `...and ${foundOlder.length - 3} more.\n`;
        }
        
        response += `\n💡 **Tip:** Close this chat and check the **Main Feed** to see the details and claim them!`;
        return response;
      }
      
      return `❌ **I couldn't find that item.**\n\nIt looks like no one has reported a **"${searchword}"** yet.\n\nYou should **Report it as Lost** so we can alert you as soon as someone finds it!`;
    }

    // 4. FALLBACK
    return "❓ **I didn't quite catch that.**\n\nTry asking simply:\n• **\"Wallet\"** (to search)\n• **\"How to claim\"**\n• **\"Where is the office\"**";
  };

  const translateBotTextToTagalog = (text: string): string => {
    if (text.includes("I'm your **uLost AI Assistant**")) {
      return "Kamusta! Ako ang **uLost AI Assistant** mo.\n\nMatutulungan kitang mag-report ng item o maghanap sa database.\n\nSubukan mong i-type ang **\"Keys\"** o **\"Nawala ang ID ko\"**.";
    }
    if (text.includes('Guidance Office Location')) {
      return "Narito ang lokasyon ng Guidance Office:\nNasa ACG Building, Ground Floor, katabi ng Principal's Office.\nOras: 7:30 AM - 4:30 PM (Mon-Fri).";
    }
    if (text.includes('About uLost')) {
      return "Tungkol sa uLost:\nPinamamahalaan ito ng **Guidance Office**. Tinutulungan ng uLost ang mga estudyante na maibalik ang kanilang nawawalang gamit.";
    }
    if (text.includes('Get Notified')) {
      return "Para maabisuhan ka:\nTingnan ang notification bell sa upper right.\nIclick ang Enable Alerts para magkaroon ng notification doon kapag may bagong na-report na lost o found item.";
    }
    if (text.includes('To Report a Lost Item')) {
      return "Paano mag-report ng nawawalang gamit:\n1. I-click ang Report Lost sa menu.\n2. Ilagay ang item name, detalye, at huling lokasyon.\n3. I-submit.\nAabisuhan ka namin kapag may match.";
    }
    if (text.includes('To Report a Found Item')) {
      return "Paano mag-report ng nahanap na gamit:\n1. I-click ang Report Found sa menu.\n2. Mag-upload ng larawan at detalye.\n3. Isuko ang item sa Guidance Office para sa safekeeping.";
    }
    if (text.includes('How to Claim')) {
      return "Paano mag-claim:\n1. Hanapin ang item sa Feed.\n2. I-click ang Claim.\n3. Pumunta sa Guidance Office.\nPaalala: Magdala ng patunay ng pagmamay-ari.";
    }
    if (text.includes("I didn't quite catch that")) {
      return "Hindi ko masyadong naintindihan.\nSubukan: \"Wallet\", \"How to claim\", o \"Where is the office\".";
    }
    if (text.includes("I couldn't find that item")) {
      return "Hindi ko nakita ang item na iyan.\n\nMukhang wala pang nag-uulat ng item na ito.\n\nI-report mo ito bilang **Lost** para maabisuhan ka namin agad kapag may nakahanap.";
    }

    if (text.includes('I found') && text.includes('possible match')) {
      return text
        .replace('I found', 'May nahanap akong')
        .replace('possible match(es)', 'posibleng tugma')
        .replace('Posted Today', 'Nai-post Ngayon')
        .replace('Older Records', 'Mas Lumang Rekord')
        .replace('Tip:', 'Tip:')
        .replace('Close this chat and check the **Main Feed** to see the details and claim them!', 'Isara ang chat at tingnan ang **Main Feed** para makita ang mga larawan at mag-claim.');
    }

    const fallback = text
      .replaceAll('Please', 'Pakiusap')
      .replaceAll('report', 'i-report')
      .replaceAll('item', 'gamit')
      .replaceAll('found', 'nahanap')
      .replaceAll('lost', 'nawala')
      .replaceAll('Guidance Office', 'Guidance Office');
    return `Salin sa Tagalog:\n${fallback}`;
  };

  const handleAction = useCallback((text: string) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { text, sender: 'user', timestamp: new Date() }]);
    setInput('');
    setIsTyping(true);
    
    setTimeout(() => {
      const botResponse = getResponse(text);
      setMessages(prev => [...prev, { text: botResponse, sender: 'bot', timestamp: new Date() }]);
      setIsTyping(false);
    }, 800);
  }, [reports, messages]);

  const handleTranslateMessage = (messageText: string) => {
    const translated = translateBotTextToTagalog(messageText);
    setMessages((prev) => [...prev, { text: translated, sender: 'bot', timestamp: new Date() }]);
  };

  // --- UPDATED BUTTONS (Removed Check Status) ---
  const faqOptions = [
    { label: "Get Notified", icon: <Bell size={14}/> },
    { label: "Report Lost", icon: <FileText size={14}/> },
    { label: "Report Found", icon: <FileText size={14}/> }, // Added specific Report Found button
    { label: "How to claim?", icon: <ShieldCheck size={14}/> },
    { label: "Office Location", icon: <MapPin size={14}/> }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* OVERLAY */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" onClick={onClose} />

      {/* CHAT WINDOW */}
      <div className="fixed inset-0 z-[70] flex items-end justify-center pointer-events-none p-0 sm:p-4 md:justify-end">
        <div className="w-full h-full sm:h-[600px] md:w-[400px] bg-white flex flex-col pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-10 duration-300 sm:rounded-3xl overflow-hidden border border-white/20">
          
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white shadow-lg shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/30 shadow-lg">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight leading-none">uLost AI</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={handleReset} className="p-2 hover:bg-white/10 rounded-full transition-colors"><RotateCcw size={18} /></button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] px-4 py-3 shadow-sm leading-relaxed text-sm ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none font-medium'
                    : 'bg-white text-gray-700 rounded-2xl rounded-tl-none border border-gray-100'
                }`}>
                  {formatText(m.text)}
                  {m.sender === 'bot' && (
                    <button
                      type="button"
                      onClick={() => handleTranslateMessage(m.text)}
                      className="mt-2 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                    >
                      Isalin sa Tagalog
                    </button>
                  )}
                  <p className={`text-[10px] mt-1.5 opacity-70 ${m.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center shadow-sm">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK ACTIONS */}
          <div className="relative shrink-0">
            <div className="px-5 py-3 bg-white border-t border-gray-100 overflow-x-auto no-scrollbar flex gap-2">
              {faqOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(opt.label)}
                  className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-bold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all"
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            {/* Mobile hint: sideways scroll */}
            <div className="pointer-events-none absolute right-0 top-0 h-full flex items-center pr-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-gradient-to-l from-white via-white/95 to-transparent pl-8 py-1">
                <span>Scroll</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* INPUT */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleAction(input); }}
              className="flex gap-2 items-center"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type 'Wallet', 'ID'..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-[16px] sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-gray-700 placeholder:text-gray-400"
                />
              </div>
              <button 
                disabled={!input.trim()}
                type="submit"
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95"
              >
                <Send size={18} />
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
