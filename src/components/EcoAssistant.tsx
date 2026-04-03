import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { genAI } from '../lib/gemini';
import { cn } from '../lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const EcoAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your EcoRide assistant. Ask me about sustainable travel, carbon savings, carpooling tips, or anything eco-friendly!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }]
      }));

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...history,
          { role: 'user', parts: [{ text }] }
        ],
        config: {
          systemInstruction: 'You are EcoRide\'s AI assistant — a friendly, concise expert on sustainable transportation, carpooling, carbon footprint reduction, and eco-friendly living. Keep responses short (2-4 sentences) unless the user asks for detail. If asked about ride-specific features, explain how EcoRide works. Always encourage sustainable choices.',
        },
      });

      const reply = response.text || 'Sorry, I couldn\'t generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('Gemini error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Please check your API key or try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col"
            style={{ maxHeight: '500px' }}
          >
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-bold">Eco Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-emerald-500 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '350px' }}>
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "px-3 py-2 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-gray-100 text-gray-900 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about eco travel..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors",
          isOpen ? "bg-gray-900 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};

export default EcoAssistant;
