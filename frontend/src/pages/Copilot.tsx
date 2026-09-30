import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, Sparkles, CheckCircle2, ChevronRight,
  TrendingUp, AlertTriangle, BarChart2, Activity, Target,
  RefreshCw, Lightbulb, FileText, Database, ShieldCheck
} from 'lucide-react';
import { OperationalPlan, CopilotSource, CopilotHealthResponse } from '../api/types';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface CopilotProps {
  plan: OperationalPlan;
  onNavigateScreen: (screen: any) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  intent?: string;
  sources?: CopilotSource[];
  confidence?: string;
  ollamaUsed?: boolean;
  groundedSource?: string;
  suggestedActionScreen?: string;
  suggestedScreenLabel?: string;
  isTyping?: boolean;
}

// Quick-prompt chips
const QUICK_PROMPTS = [
  { label: '📊 Summary', text: 'Give me a full status summary' },
  { label: '⚡ Shortage', text: 'How much extra capacity do we need to eliminate the shortage?' },
  { label: '📈 Revenue', text: 'What is the projected revenue breakdown?' },
  { label: '🎯 Strategy', text: 'What is the Balanced allocation strategy?' },
  { label: '📣 Marketing', text: 'Should we increase marketing spend in Pune?' },
  { label: '🔮 Scenario', text: 'What happens if co-manufacturing increases by 40 kg?' },
  { label: '⚠️ Risk', text: 'Why is current operational risk high?' },
  { label: '🤝 B2B', text: 'Can we onboard a new customer requiring 30 kg/month?' },
];

export const Copilot: React.FC<CopilotProps> = ({ plan, onNavigateScreen }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [health, setHealth] = useState<CopilotHealthResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: `Hello! I'm the **BioKraft AI Operations Copilot** — directly connected to your active decision engine for **${plan.target_period}**.\n\nI answer operational questions using verified company knowledge and trusted live backend engines without calculating business numbers.\n\nAsk me anything or pick a prompt below!`,
      groundedSource: 'Knowledge Store + Live Backend Context',
      confidence: 'HIGH'
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check Copilot health on mount
  useEffect(() => {
    api.getCopilotHealth()
      .then(data => setHealth(data))
      .catch(err => console.error('Failed to fetch copilot health:', err));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const query = text || inputMessage;
    if (!query.trim() || isTyping) return;
    if (!text) setInputMessage('');

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await api.chatWithCopilot({
        message: query,
        session_id: 'ui_session',
        strategy: plan.strategy,
        risk_mode: plan.risk_mode,
        target_period: plan.target_period,
      });

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        intent: res.intent,
        sources: res.sources,
        confidence: res.confidence,
        ollamaUsed: res.ollama_used,
        groundedSource: res.sources?.length 
          ? `Doc Knowledge (${res.sources.length} sources) + Backend Data`
          : 'Live Backend Context',
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('RAG Chat error:', err);
      // Fallback message
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **System Notice**: Copilot service connection issue (${err.message || 'Offline'}). Falling back to live plan summary:\n\n• **Forecast Demand**: ${plan.summary.forecast_demand_kg.toLocaleString()} kg\n• **Usable Capacity**: ${plan.summary.usable_capacity_kg.toLocaleString()} kg\n• **Shortage Gap**: ${plan.summary.shortage_kg.toLocaleString()} kg\n• **Fulfillment**: ${plan.summary.fulfillment_pct.toFixed(1)}%`,
          confidence: 'FALLBACK',
          groundedSource: 'Deterministic Plan Summary',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-teal-700" />
            BioKraft AI Operations Copilot
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Grounded Operations Assistant — powered by verified knowledge base & live decision engine data for <span className="font-semibold text-teal-700">{plan.target_period}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="teal" icon={<Sparkles className="w-3 h-3" />}>
            Engine-Grounded
          </Badge>
          <Badge variant="neutral" icon={<Activity className="w-3 h-3" />}>
            {plan.strategy.toUpperCase()} Mode
          </Badge>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: <BarChart2 className="w-4 h-4 text-teal-600" />, label: 'Demand', value: `${plan.summary.forecast_demand_kg.toLocaleString()} kg` },
          { icon: <Target className="w-4 h-4 text-emerald-600" />, label: 'Fulfillment', value: `${plan.summary.fulfillment_pct.toFixed(1)}%` },
          { icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, label: 'Shortage', value: `${plan.summary.shortage_kg.toLocaleString()} kg` },
          { icon: <TrendingUp className="w-4 h-4 text-blue-500" />, label: 'Revenue', value: `₹${(plan.summary.projected_revenue_inr / 100000).toFixed(2)}L` },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2.5 shadow-sm">
            {icon}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
              <p className="text-sm font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Interface */}
      <div style={{ height: '480px' }} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 scroll-smooth">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl text-xs space-y-2.5 ${
                msg.sender === 'user'
                  ? 'bg-teal-700 text-white p-3.5 rounded-tr-none shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-800 p-3.5 rounded-tl-none shadow-sm'
              }`}>
                {/* Intent Badge if available */}
                {msg.intent && msg.sender === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                      Intent: {msg.intent}
                    </span>
                    {msg.confidence && (
                      <span className="text-[9px] font-semibold text-slate-500">
                        Confidence: {msg.confidence}
                      </span>
                    )}
                  </div>
                )}

                {/* Main Markdown Text */}
                <div className="leading-relaxed whitespace-pre-wrap">
                  {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i}>{part.slice(2, -2)}</strong>
                      : part
                  )}
                </div>

                {/* Sources & Grounding */}
                {msg.sender === 'assistant' && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-teal-600" /> Sources:
                        </span>
                        {msg.sources.map((s, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] border border-slate-200 font-medium">
                            {s.source} (p.{s.page})
                          </span>
                        ))}
                      </div>
                    )}

                    {msg.groundedSource && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-teal-700 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" /> {msg.groundedSource}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-white shrink-0 mt-0.5 text-[9px] font-bold shadow-sm">
                  YOU
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none p-3.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[10px] font-semibold text-teal-700 ml-1">
                    Retrieving knowledge & generating grounded response...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="px-3 pt-2.5 pb-1.5 bg-white border-t border-slate-100">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" /> Quick Prompts
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map(({ label, text }) => (
              <button
                key={label}
                onClick={() => handleSend(text)}
                disabled={isTyping}
                className="px-2 py-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 text-slate-700 rounded-md text-[10px] font-medium shrink-0 transition-colors border border-slate-200 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            disabled={isTyping}
            placeholder="Ask anything about capacity, demand, risk, revenue or strategy..."
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={isTyping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            disabled={isTyping}
          >
            {isTyping ? 'Searching…' : 'Ask Copilot'}
          </Button>
        </form>
      </div>
    </div>
  );
};

