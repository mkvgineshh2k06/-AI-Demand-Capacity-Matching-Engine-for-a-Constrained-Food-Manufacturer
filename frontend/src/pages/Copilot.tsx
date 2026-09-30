import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, Sparkles, CheckCircle2,
  TrendingUp, AlertTriangle, BarChart2, Activity, Target,
  RefreshCw, Lightbulb, FileText
} from 'lucide-react';
import { OperationalPlan, CopilotSource, CopilotHealthResponse } from '../api/types';
import { api } from '../api/client';
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

export const Copilot: React.FC<CopilotProps> = ({ plan }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [, setHealth] = useState<CopilotHealthResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: `Hello. I am the **BioKraft AI Operations Copilot** — connected to your active decision engine for **${plan.target_period}**.\n\nI answer operational queries using verified company documentation and live decision engine parameters.\n\nSelect a prompt below or type your inquiry.`,
      groundedSource: 'Verified RAG Vector Store + Active Engine State',
      confidence: 'HIGH'
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
          ? `Document Store (${res.sources.length} sources) + Engine Context`
          : 'Live Engine Context',
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('RAG Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **System Notice**: Offline mode fallback to active plan parameters:\n\n• **Forecast Demand**: ${plan.summary.forecast_demand_kg.toLocaleString()} kg\n• **Usable Capacity**: ${plan.summary.usable_capacity_kg.toLocaleString()} kg\n• **Shortage Gap**: ${plan.summary.shortage_kg.toLocaleString()} kg\n• **Fulfillment**: ${plan.summary.fulfillment_pct.toFixed(1)}%`,
          confidence: 'FALLBACK',
          groundedSource: 'Deterministic Plan Context',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto">
      {/* Editorial Header */}
      <div className="bg-white border border-[#DEDED8] rounded-[2px] p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-[#64645F] uppercase font-mono">
              07 / RAG OPERATIONS COPILOT
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-[#111111] tracking-tight mt-1">
              Grounded intelligence assistant.
            </h1>
            <p className="text-sm text-[#64645F] max-w-xl mt-1">
              Natural language queries grounded in vector document stores and live optimization engine data.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-mono">
            <Badge variant="teal" icon={<Sparkles className="w-3 h-3" />}>
              RAG GROUNDED
            </Badge>
            <Badge variant="neutral" icon={<Activity className="w-3 h-3" />}>
              {plan.strategy.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        {[
          { label: 'Demand', value: `${plan.summary.forecast_demand_kg.toLocaleString()} kg` },
          { label: 'Fulfillment', value: `${plan.summary.fulfillment_pct.toFixed(1)}%` },
          { label: 'Shortage Gap', value: `${plan.summary.shortage_kg.toLocaleString()} kg` },
          { label: 'Est. Revenue', value: `₹${(plan.summary.projected_revenue_inr / 100000).toFixed(2)}L` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-[2px] border border-[#DEDED8] p-4">
            <span className="text-[10px] text-[#64645F] uppercase font-bold tracking-wider block font-sans">{label}</span>
            <span className="text-lg font-bold text-[#111111] mt-1 block">{value}</span>
          </div>
        ))}
      </div>

      {/* Chat Box Interface */}
      <div style={{ height: '520px' }} className="flex flex-col overflow-hidden rounded-[2px] border border-[#DEDED8] bg-white">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F7F2]/50 scroll-smooth">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-[2px] bg-[#324C3A] flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-[2px] text-xs space-y-3 font-sans ${
                msg.sender === 'user'
                  ? 'bg-[#324C3A] text-white p-4 font-medium'
                  : 'bg-white border border-[#DEDED8] text-[#111111] p-4'
              }`}>
                {/* Intent Badge */}
                {msg.intent && msg.sender === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1 font-mono">
                    <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider rounded-[2px] bg-[#F7F7F2] text-[#324C3A] border border-[#DEDED8] uppercase">
                      Intent: {msg.intent}
                    </span>
                    {msg.confidence && (
                      <span className="text-[9px] font-semibold text-[#64645F]">
                        Confidence: {msg.confidence}
                      </span>
                    )}
                  </div>
                )}

                {/* Main Text */}
                <div className="leading-relaxed whitespace-pre-wrap">
                  {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
                      : part
                  )}
                </div>

                {/* Sources & Grounding */}
                {msg.sender === 'assistant' && (
                  <div className="pt-3 border-t border-[#DEDED8] space-y-2 font-mono">
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-[#64645F] font-bold mr-1 flex items-center gap-1 font-sans">
                          <FileText className="w-3 h-3 text-[#324C3A]" /> Sources:
                        </span>
                        {msg.sources.map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-[#F7F7F2] text-[#111111] rounded-[2px] text-[9px] border border-[#DEDED8]">
                            {s.source} (p.{s.page})
                          </span>
                        ))}
                      </div>
                    )}

                    {msg.groundedSource && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] text-[#324C3A] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#324C3A]" /> {msg.groundedSource}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-[2px] bg-[#111111] text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold font-mono">
                  YOU
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-7 h-7 rounded-[2px] bg-[#324C3A] flex items-center justify-center text-white shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-white border border-[#DEDED8] rounded-[2px] p-4 text-xs">
                <div className="flex items-center gap-2 font-mono text-[#324C3A]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#324C3A] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#324C3A] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#324C3A] animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[11px] font-bold ml-1">
                    Retrieving knowledge & generating response...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="px-4 py-3 bg-white border-t border-[#DEDED8]">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#64645F] mb-2 flex items-center gap-1 font-mono">
            <Lightbulb className="w-3 h-3 text-[#111111]" /> Quick Operations Queries
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono">
            {QUICK_PROMPTS.map(({ label, text }) => (
              <button
                key={label}
                onClick={() => handleSend(text)}
                disabled={isTyping}
                className="px-3 py-1.5 bg-[#F7F7F2] hover:bg-[#324C3A] hover:text-white text-[#111111] rounded-[2px] text-[11px] font-semibold transition-colors border border-[#DEDED8] cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="p-4 bg-white border-t border-[#DEDED8] flex items-center gap-3 font-sans"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            disabled={isTyping}
            placeholder="Ask anything about capacity, demand, risk, revenue or strategy..."
            className="flex-1 px-4 py-2.5 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] text-xs font-semibold text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#324C3A] disabled:opacity-60"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={isTyping ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
            disabled={isTyping}
          >
            {isTyping ? 'Searching…' : 'Ask Copilot'}
          </Button>
        </form>
      </div>
    </div>
  );
};


