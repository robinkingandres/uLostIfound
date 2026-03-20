import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, RotateCcw, Search, FileText, MapPin, ShieldCheck, Bell, ChevronRight, ArrowDown } from 'lucide-react';

interface ReportItem {
  id: number | string;
  type: 'Lost' | 'Found' | string;
  itemName: string;
  description: string;
  category: string;
  date: string;
  location?: string;
  status?: string;
  publicStatus?: 'Lost' | 'Found' | 'Matched' | 'Claimed' | string;
  isMatched?: boolean;
  personName?: string;
  grade?: string;
  section?: string;
  reporterName?: string;
  reporterUsername?: string;
  reporterRole?: string;
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const CATEGORY_LABELS = [
    'School Supplies',
    'Tech & Gadgets',
    'Books & Modules',
    'Daily Essentials',
    'Food & Clothes',
    'Others',
  ];

  const REPEAT_MENU_TEXT = "What else can I help you find?\n\nTap a **category** below to search again, or type an item name.";

  const isGreetingWithCategories = (text: string) =>
    text.includes("uLost AI Assistant") || 
    text.includes("What else can I help you find?");

  useEffect(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    
    if (messages.length === 0) {
      setMessages([{
        text: `**${greeting}!** I'm your **uLost AI Assistant**.\n\nI can help you report a lost or found item, or search the feed.\n\nTry typing an item name (e.g., **"Green Backpack"**), or tap a category button below to search.`,
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + 150;

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowScrollButton(true);
    }
  }, [messages, isTyping]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

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

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i} className="block mb-1 last:mb-0">
        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="font-extrabold text-blue-900">{part}</strong> : part
        )}
      </span>
    ));
  };

  const getResponse = (userMessage: string): string => {
    const rawMessage = userMessage.trim();
    const msg = rawMessage.toLowerCase();
    const normalizeSearchText = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const msgNormalized = normalizeSearchText(rawMessage);
    
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const isToday = (dateStr: string) => dateStr && new Date(dateStr).toISOString().split('T')[0] === todayISO;

    const getStatusLabel = (item: ReportItem) => {
      if (item.publicStatus) return item.publicStatus;
      if (item.status === 'Claimed') return 'Claimed';
      if (item.isMatched) return 'Matched';
      return item.type || 'Unknown';
    };

    const getDisplayName = (item: ReportItem) => {
      const personName = (item.personName || '').trim();
      if (personName) return personName;
      const reporterName = (item.reporterName || '').trim();
      if (reporterName) return reporterName;
      return item.reporterUsername || 'Unknown';
    };

    const getGradeSection = (item: ReportItem) => {
      const grade = (item.grade || '').trim();
      const section = (item.section || '').trim();
      if (!grade && !section) return 'N/A';
      if (grade && section) return `Grade ${grade} - ${section}`;
      return grade ? `Grade ${grade}` : `Section ${section}`;
    };

    if (msg.includes('about') || msg.includes('system')) {
      return "🏢 **About uLost**\n\nManaged by the **Guidance Office**, uLost connects students with their lost belongings.";
    }
    
    if (msg.includes('location') || msg.includes('office') || msg.includes('where')) {
      return "📍 **Guidance Office Location**\n\nLocated at **ACG Building, Ground Floor**, beside the Principal's Office.\n\n**Hours:** 7:30 AM - 4:30 PM (Mon-Fri).";
    }

    if (msg.includes('notified') || msg.includes('notification')) {
      return "**Get Notified**\n\nCheck the **notification bell** in the upper right.\nClick **Enable Alerts** to receive notifications whenever a new item is reported.";
    }

    if (msg.includes('report lost')) {
      return "📝 **To Report a Lost Item:**\n\nGo to the **Guidance Office**, submit a description of an item, and where you lost it.";
    }

    if (msg.includes('report found')) {
      return "🤝 **To Report a Found Item:**\n\nGo to the **Guidance Office**, submit a description of an item, and where you found it.";
    }

    if (msg.includes('claim')) {
      return "🔑 **How to Claim:**\n\nGo to Guidance Office located at ACG building ground floor beside Principals office.";
    }

    const stopWords = ['is', 'there', 'any', 'was', 'found', 'lost', 'search', 'item', 'searching', 'for', 'where', 'my', 'how', 'to', 'can', 'i', 'a', 'the', 'an'];
    const keywords = msg.split(' ').filter(w => !stopWords.includes(w) && w.length > 2);
    const isCategoryOnly = CATEGORY_LABELS.some((label) => normalizeSearchText(label) === msgNormalized);
    const keywordsToUse = isCategoryOnly ? [msgNormalized] : keywords;
    
    if (keywordsToUse.length > 0) {
      const searchword = isCategoryOnly ? rawMessage : keywordsToUse.join(' ');
      const searchNormalized = normalizeSearchText(searchword);

      const normalizedCategories = CATEGORY_LABELS.map((label) => normalizeSearchText(label));
      const isOthersCategorySearch =
        isCategoryOnly && msgNormalized === normalizeSearchText('Others');

      const matches = reports.filter((item) => {
        const nameNorm = normalizeSearchText(item.itemName || '');
        const categoryNorm = normalizeSearchText(item.category || '');
        const descriptionNorm = normalizeSearchText(item.description || '');
        const locationNorm = normalizeSearchText(item.location || '');

        if (isOthersCategorySearch) {
          return (
            categoryNorm === searchNormalized ||
            (categoryNorm && !normalizedCategories.includes(categoryNorm))
          );
        }

        return (
          nameNorm.includes(searchNormalized) ||
          categoryNorm.includes(searchNormalized) ||
          descriptionNorm.includes(searchNormalized) ||
          locationNorm.includes(searchNormalized)
        );
      });

      if (matches.length > 0) {
        let response = `🔍 **I found ${matches.length} possible match(es) for "${searchword}":**\n\n`;
        const foundToday = matches.filter(item => isToday(item.date));
        const foundOlder = matches.filter(item => !isToday(item.date));

        const renderItem = (item: ReportItem) => {
          const status = getStatusLabel(item);
          return `• **${status.toUpperCase()}**: **${item.itemName}**\n  Name: ${getDisplayName(item)}\n  Grade/Section: ${getGradeSection(item)}\n  Date: ${item.date || 'Unknown'}\n  At: ${item.location || 'Unknown'}\n`;
        };

        if (foundToday.length > 0) {
          response += `✨ **Posted Today:**\n`;
          foundToday.forEach(item => { response += renderItem(item); });
          response += `\n`;
        }
        
        if (foundOlder.length > 0) {
          response += `📜 **Older Records:**\n`;
          foundOlder.forEach(item => { response += renderItem(item); });
        }
        
        response += `\n💡 **Tip:** Close this chat and check the **Main Feed** to see more details!`;
        return response;
      }
      
      return `❌ **I couldn't find that item.**\n\nIt looks like no one has reported a **"${searchword}"** yet.`;
    }

    return "❓ **I didn't quite catch that.**\n\nTry asking simply:\n• **\"Wallet\"**\n• **\"How to claim\"**\n• **\"Where is the office\"**";
  };

  const translateBotTextToTagalog = (text: string): string => {
    if (text.includes("uLost AI Assistant")) {
      return "Kamusta! Ako ang **uLost AI Assistant** mo.\n\nMatutulungan kitang mag-report ng nawawala o nahanap na item, o maghanap sa feed.";
    }
    if (text.includes('What else can I help you find?')) {
      return "Ano pa ang maaari kong itulong?\n\nI-tap ang **kategorya** sa ibaba para maghanap muli.";
    }
    if (text.includes('Location')) return "Nasa ACG Building, Ground Floor, katabi ng Principal's Office.";
    if (text.includes('How to Claim')) return "Pumunta sa Guidance Office sa ACG building ground floor.";

    return `Salin sa Tagalog:\n${text}`;
  };

  const handleAction = useCallback((text: string) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { text, sender: 'user', timestamp: new Date() }]);
    setInput('');
    setIsTyping(true);
    
    setTimeout(() => {
      const botResponse = getResponse(text);
      setMessages(prev => [...prev, { text: botResponse, sender: 'bot', timestamp: new Date() }]);
      
      setIsTyping(true);
      
      setTimeout(() => {
        setMessages(prev => [
          ...prev, 
          { text: REPEAT_MENU_TEXT, sender: 'bot', timestamp: new Date() }
        ]);
        setIsTyping(false);
      }, 3000);

    }, 800);
  }, [reports]);

  const handleTranslateMessage = (messageText: string) => {
    const translated = translateBotTextToTagalog(messageText);
    setMessages((prev) => [...prev, { text: translated, sender: 'bot', timestamp: new Date() }]);
  };

  const faqOptions = [
    { label: "Get Notified", icon: <Bell size={14}/> },
    { label: "Report Lost", icon: <FileText size={14}/> },
    { label: "Report Found", icon: <FileText size={14}/> },
    { label: "How to claim?", icon: <ShieldCheck size={14}/> },
    { label: "Office Location", icon: <MapPin size={14}/> }
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-end justify-center pointer-events-none p-0 sm:p-4 md:justify-end">
        <div className="w-full h-full sm:h-[600px] md:w-[400px] bg-white flex flex-col pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-10 duration-300 sm:rounded-3xl overflow-hidden border border-white/20">
          
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

          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50 custom-scrollbar relative" ref={scrollContainerRef} onScroll={handleScroll}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] px-4 py-3 shadow-sm text-sm ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none font-medium'
                    : 'bg-white text-gray-700 rounded-2xl rounded-tl-none border border-gray-100'
                }`}>
                  {formatText(m.text)}
                  {m.sender === 'bot' && isGreetingWithCategories(m.text) && (
                    <div className="mt-3">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Categories</div>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_LABELS.map((label) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => handleAction(label)}
                            className="px-3.5 py-1.5 text-[11px] font-bold rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all shadow-sm"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-all animate-bounce z-10 pointer-events-auto"
              >
                <ArrowDown size={20} />
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <div className="px-5 py-3 bg-white border-t border-gray-100 overflow-x-auto no-scrollbar flex gap-2">
              {faqOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(opt.label)}
                  className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-bold text-gray-600 hover:bg-blue-50 transition-all"
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full flex items-center pr-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-gradient-to-l from-white via-white/95 to-transparent pl-8 py-1">
                <span>Scroll</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleAction(input); }} className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type 'Wallet', 'ID'..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-[16px] sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-gray-700"
                />
              </div>
              <button disabled={!input.trim()} type="submit" className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50">
                <Send size={18} />
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
