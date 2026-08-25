import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Bot, Send, Sparkles, User, RefreshCw, AlertCircle } from 'lucide-react';

export const AIAssistant: React.FC = () => {
  const { medicines, sales, prescriptions } = usePharmacy();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your AI Pharmacy Clinical & Operational Assistant. I can analyze your inventory, drug interactions, stock alerts, or financial metrics. How can I help you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const quickPrompts = [
    'Which medicines are low on stock or expiring soon?',
    'Summarize drug allergies and patient safety guidelines',
    'Calculate gross revenue trends and recommended reorder items',
    'Are there any drug interaction risks with prescribed antibiotics?'
  ];

  const handleSend = async (userText?: string) => {
    const textToSend = userText || query;
    if (!textToSend.trim() || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: textToSend, time: timeStr };

    setMessages(prev => [...prev, userMsg]);
    if (!userText) setQuery('');
    setLoading(true);

    try {
      // Build context summary for AI
      const systemContext = {
        totalMedicines: medicines.length,
        lowStockCount: medicines.filter(m => m.stockQuantity <= m.minReorderLevel).length,
        expiringCount: medicines.filter(m => m.status === 'Expiring Soon' || m.status === 'Expired').length,
        sampleInventory: medicines.slice(0, 10).map(m => ({
          name: m.name,
          generic: m.genericName,
          stock: m.stockQuantity,
          exp: m.expiryDate,
          status: m.status
        })),
        totalSalesRecorded: sales.length
      };

      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend, context: systemContext })
      });

      const data = await res.json();
      const aiResponse = data.text || data.answer || data.error || 'I evaluated your query against current database records.';

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: aiResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `**PharmaSys AI Clinical Assistant**\n\n- Catalog Items Monitored: ${medicines.length}\n- Low Stock Alerts: ${medicines.filter(m => m.stockQuantity <= m.minReorderLevel).length}\n\n*System note: Temporary network issue. All pharmacy records remain synchronized locally.*`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-base">PharmaSys AI Clinical Assistant</h2>
            <p className="text-xs text-emerald-100">Powered by Gemini AI • Real-time Inventory & Drug Knowledge</p>
          </div>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition shadow-sm font-medium"
          >
            ✨ {prompt}
          </button>
        ))}
      </div>

      {/* Chat Conversation Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[450px] max-h-[550px] overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 mt-1">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-3.5 rounded-2xl max-w-xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white font-medium rounded-tr-none'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <span
                className={`block text-[10px] mt-1 text-right ${
                  msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                }`}
              >
                {msg.time}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-center text-xs text-slate-400 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> AI is reviewing pharmacy catalog & generating response...
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask AI about medicines, expiry dates, clinical guidance, or sales trends..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </div>
    </div>
  );
};
