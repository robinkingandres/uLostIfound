import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
import chatbotIcon from '../assets/chatbot.png';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I'm your helpful assistant for the Lost & Found system. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chatbot opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyword matching function
  const getResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase().trim();

    // System/about questions
    if (
      lowerMessage.includes('system') ||
      lowerMessage.includes('about') ||
      lowerMessage.includes('what is') ||
      lowerMessage.includes('what does') ||
      lowerMessage.includes('explain') ||
      lowerMessage.includes('tell me about')
    ) {
      return "This system is designed to help students, teachers, and staff of San Isidro National High School easily report lost items and return found ones. It provides a secure way to submit reports, verify item ownership, and track updates—making sure lost items are returned quickly and efficiently.";
    }

    // Report found item
    if (
      lowerMessage.includes('report found') ||
      lowerMessage.includes('found item') ||
      lowerMessage.includes('how to report found') ||
      lowerMessage.includes('reporting found') ||
      lowerMessage.includes('submit found')
    ) {
      return "Thank you for helping keep our school community safe! To report a found item, click \"Report Found\" at the top of the homepage. Fill in the item details such as its name, description, and where it was found, then submit the form. Please keep the item with you until the rightful owner claims it. Your honesty and cooperation are greatly appreciated!";
    }

    // Report lost item
    if (
      lowerMessage.includes('report lost') ||
      lowerMessage.includes('lost item') ||
      lowerMessage.includes('how to report lost') ||
      lowerMessage.includes('reporting lost') ||
      lowerMessage.includes('submit lost') ||
      lowerMessage.includes('i lost')
    ) {
      return "To report a lost item, simply click \"Report Lost\" at the top of the homepage. Provide the item's name, description, and the location where you last saw it, then submit the report. The Guidance Office will review your submission and contact you if a matching item is found.";
    }

    // Claim item
    if (
      lowerMessage.includes('claim') ||
      lowerMessage.includes('how to claim') ||
      lowerMessage.includes('claiming') ||
      lowerMessage.includes('claim item')
    ) {
      return "To claim an item, click the \"Claim\" button and provide proof of ownership, such as a clear description or photo of the item. Once submitted, the Guidance Office will verify your claim before releasing the item to you.";
    }

    // Verification time
    if (
      lowerMessage.includes('how long') ||
      lowerMessage.includes('verification') ||
      lowerMessage.includes('verify') ||
      lowerMessage.includes('time') ||
      lowerMessage.includes('when') ||
      lowerMessage.includes('how soon')
    ) {
      return "Verification times can vary depending on the number of requests, but most claims are usually reviewed within a few days. I'll make sure your claim is moving along and the Guidance Office will complete the final check.";
    }

    // After submitting report
    if (
      lowerMessage.includes('after submit') ||
      lowerMessage.includes('after submitting') ||
      lowerMessage.includes('what happens') ||
      lowerMessage.includes('next step') ||
      lowerMessage.includes('after i submit')
    ) {
      return "Once you submit a report, I'll keep track of it and update you if a matching item is found. The Guidance Office will handle the final review and confirmation.";
    }

    // Edit report
    if (
      lowerMessage.includes('edit') ||
      lowerMessage.includes('change') ||
      lowerMessage.includes('modify') ||
      lowerMessage.includes('update report') ||
      lowerMessage.includes('correct')
    ) {
      return "You can't edit the report directly, but you can contact the Guidance Office to update your information or make corrections.";
    }

    // Proof of ownership
    if (
      lowerMessage.includes('proof') ||
      lowerMessage.includes('upload') ||
      lowerMessage.includes('evidence') ||
      lowerMessage.includes('document') ||
      lowerMessage.includes('photo') ||
      lowerMessage.includes('receipt') ||
      lowerMessage.includes('what kind of proof')
    ) {
      return "You can upload a photo, receipt, or description that clearly shows the item belongs to you. Anything that helps verify ownership is great!";
    }

    // Check status
    if (
      lowerMessage.includes('status') ||
      lowerMessage.includes('check status') ||
      lowerMessage.includes('where can i check') ||
      lowerMessage.includes('view status') ||
      lowerMessage.includes('see my report') ||
      lowerMessage.includes('my report status') ||
      (lowerMessage.includes('check') && (lowerMessage.includes('report') || lowerMessage.includes('claim'))) ||
      (lowerMessage.includes('where') && (lowerMessage.includes('check') || lowerMessage.includes('status')))
    ) {
      return "Just go to your Menu Bar Matches and check the status beside your report or profile. It'll show if it's pending, verified, or resolved.";
    }

    // Contact/help
    if (
      lowerMessage.includes('contact') ||
      lowerMessage.includes('help') ||
      lowerMessage.includes('support') ||
      lowerMessage.includes('who') ||
      lowerMessage.includes('email') ||
      lowerMessage.includes('reach out')
    ) {
      return "You can reach out directly to the Guidance Office for assistance they handle verifications and item releases. You can also email Admin@edu.gov.ph for support.";
    }

    // Default response for unrecognized queries
    return "I'm here to help with questions about reporting lost or found items, claiming items, verification processes, and checking report status. Could you please rephrase your question? I can help you with information about the system, how to report items, how to claim items, verification times, and more!";
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      text: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate bot thinking delay for more natural feel
    setTimeout(() => {
      const botResponse: Message = {
        text: getResponse(userMessage.text),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Chatbot Window */}
      <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-[70] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Support Assistant</h3>
              <p className="text-xs text-blue-100">Online • Ready to help</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-200'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.text}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Ask me about reporting items, claiming, verification, or status checks
          </p>
        </form>
      </div>
    </>
  );
}
