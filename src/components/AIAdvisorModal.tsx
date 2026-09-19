import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  TrendingUp,
  RotateCcw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { AIInsight, Category, Debt, Goal, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AIAdvisorModalProps {
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  goals: Goal[];
  currentSavings: number;
  totalIncome: number;
  totalExpenses: number;
  netDebt: number;
  currencySymbol: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export function AIAdvisorModal({
  transactions,
  categories,
  debts,
  goals,
  currentSavings,
  totalIncome,
  totalExpenses,
  netDebt,
  currencySymbol,
}: AIAdvisorModalProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: `Hello! I am your personal budget advisor. I have analyzed your transactions, active debts, and purchase goals. How can I help optimize your spending or savings strategy today?`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Compute category breakdown for context
  const expenseByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)?.name || 'Other';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
    });

  const topCategory = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0]?.[0];

  const financialContext = {
    currentSavings,
    totalIncome,
    totalExpenses,
    netDebt,
    currency: currencySymbol,
    topExpenseCategory: topCategory || 'General',
    expenseBreakdown: expenseByCategory,
    activeDebtsCount: debts.filter((d) => !d.settled).length,
    activeGoals: goals.map((g) => ({
      name: g.name,
      targetPrice: g.targetPrice,
      earmarked: g.earmarkedAmount,
      mode: g.allocationMode,
      date: g.plannedDate,
    })),
  };

  const fetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financialContext }),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.data?.insights) {
          setInsights(data.data.insights);
          setSummary(data.data.summary || '');
        }
      }
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSendingMessage) return;

    const userMsg: ChatMessage = { role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSendingMessage(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          financialContext,
        }),
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: 'I was unable to retrieve an AI response right now. Please check your network or try again shortly.',
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Error communicating with assistant. Please try again.',
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const quickPrompts = [
    'How can I hit my purchase goals faster?',
    'Analyze my top expense categories',
    'Should I prioritize clearing debt or saving?',
    'Give me a daily spending limit recommendation',
  ];

  return (
    <div id="ai-advisor-view" className="space-y-5">
      {/* Top Insights Card */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[3px] bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
                AI Financial Observations & Insights
              </h2>
              <p className="text-xs text-zinc-500">
                Automated pattern analysis generated from your real transactions.
              </p>
            </div>
          </div>

          <button
            onClick={fetchInsights}
            disabled={isLoadingInsights}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3 h-3 ${isLoadingInsights ? 'animate-spin' : ''}`} />
            <span>{isLoadingInsights ? 'Analyzing...' : 'Refresh Insights'}</span>
          </button>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((item, idx) => {
            let badgeStyle = 'bg-zinc-100 text-zinc-700 border-zinc-200';
            let IconComponent = Lightbulb;
            if (item.type === 'alert') {
              badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
              IconComponent = AlertTriangle;
            } else if (item.type === 'milestone') {
              badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              IconComponent = CheckCircle;
            } else if (item.type === 'savings') {
              badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              IconComponent = TrendingUp;
            }

            return (
              <div
                key={idx}
                className="p-3.5 bg-zinc-50/70 border border-zinc-200 rounded-[4px] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                    <IconComponent className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    {item.title}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded-[2px] font-mono text-[10px] uppercase tracking-wider border ${badgeStyle}`}
                  >
                    {item.type}
                  </span>
                </div>
                <p className="text-zinc-600 leading-relaxed">{item.message}</p>
                <div className="pt-1.5 border-t border-zinc-200/60 text-[11px] text-zinc-700 flex items-start gap-1">
                  <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Action:</strong> {item.actionableStep}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Budget Advisor Chat */}
      <div className="bg-white border border-zinc-200 rounded-[5px] p-5 shadow-xs flex flex-col h-[520px]">
        <div className="pb-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-zinc-700" />
            <h3 className="text-sm font-semibold text-zinc-900">Budgeting Q&A Assistant</h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Powered by Gemini
          </span>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="py-2.5 flex flex-wrap gap-1.5 border-b border-zinc-100">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] bg-zinc-50 hover:bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-[3px] border border-zinc-200 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 text-xs max-w-[88%] ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-6 h-6 rounded-[3px] flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-3 h-3" />
                ) : (
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                )}
              </div>
              <div
                className={`p-3 rounded-[4px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-zinc-900 text-white font-medium'
                    : 'bg-zinc-50 border border-zinc-200 text-zinc-800'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isSendingMessage && (
            <div className="flex gap-2.5 text-xs">
              <div className="w-6 h-6 rounded-[3px] bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-indigo-600 animate-spin" />
              </div>
              <div className="p-2.5 rounded-[4px] bg-zinc-50 border border-zinc-200 text-zinc-500 font-mono text-[11px]">
                Analyzing budget & transactions...
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Field */}
        <div className="pt-3 border-t border-zinc-100 flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask anything about your budget, savings rate, or purchase timeline..."
            className="flex-1 bg-zinc-50 border border-zinc-200 text-xs px-3 py-2 rounded-[4px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isSendingMessage || !inputMessage.trim()}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold rounded-[4px] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Send</span>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
