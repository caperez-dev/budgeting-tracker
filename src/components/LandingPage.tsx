import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Scale,
  Target,
  Zap,
  PiggyBank,
  Sparkles,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Coffee,
  ShoppingCart,
  Laptop,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Particles } from './ui/particles';
import { SpecularButton } from './ui/SpecularButton';
import walloLogo from '../assets/wallo.png';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSignUp?: () => void;
}

export function LandingPage({ onGetStarted, onSignIn, onSignUp }: LandingPageProps) {
  const [mockMetricView, setMockMetricView] = useState<'expense' | 'income'>('expense');
  const handleSignUp = onSignUp || onGetStarted;

  return (
    <div className="relative min-h-screen flex flex-col bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white overflow-x-hidden">
      {/* Ambient Animated Particles (Uniform with Auth & Main Dashboard) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-white" aria-hidden="true">
        <Particles
          color="#666666"
          quantity={120}
          ease={20}
          followCursor={false}
          className="absolute inset-0"
        />
      </div>

      {/* Main Foreground Container */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* 1. Top Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            {/* Logo / Brand Name */}
            <div className="flex items-center shrink-0">
              <img
                src={walloLogo}
                alt="Wallo"
                className="h-8 sm:h-9 w-auto object-contain select-none"
              />
            </div>

            {/* Top Right Actions: Login first, then Sign up */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                id="btn-header-login"
                onClick={onSignIn}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-[4px] transition-colors shadow-2xs cursor-pointer"
              >
                Log in
              </button>
              <SpecularButton
                type="button"
                id="btn-header-signup"
                size="sm"
                radius={4}
                onClick={handleSignUp}
                className="px-3.5 py-1.5 text-xs font-medium text-white shadow-xs"
              >
                Sign up
              </SpecularButton>
            </div>
          </div>
        </header>

        {/* 2. Hero Section */}
        <section className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center flex flex-col items-center">
          {/* Subtle Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-zinc-100/90 text-zinc-700 text-xs font-medium border border-zinc-200/80 mb-5 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
            <span>Clean, intentional personal finance</span>
          </div>

          {/* Headline - Stating the Core Value */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 max-w-3xl leading-[1.12]">
            Know exactly where your money goes
          </h1>

          {/* One-line Subheading */}
          <p className="mt-5 text-base sm:text-lg text-zinc-600 max-w-2xl leading-relaxed">
            Log transactions in seconds, separate your debts from daily spending, stay focused on purchase goals, and watch your real savings update continuously.
          </p>

          {/* Primary CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
            <SpecularButton
              type="button"
              size="lg"
              radius={4}
              onClick={onGetStarted}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium text-sm transition-all shadow-xs hover:shadow cursor-pointer group"
            >
              <span>Get started</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </SpecularButton>
          </div>

          {/* Trust Cue */}
          <p className="mt-3.5 text-xs text-zinc-400">
            Free to use • Simple sign-in • No complex setup
          </p>

          {/* Visual Cue: Realistic Mini Mock of the Budget Tracker UI */}
          <div className="mt-12 sm:mt-16 w-full max-w-4xl text-left">
            <div className="bg-white rounded-xl border border-zinc-200/90 shadow-xl overflow-hidden">
              {/* Mock App Header */}
              <div className="bg-zinc-50/90 border-b border-zinc-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <img
                    src={walloLogo}
                    alt="Wallo"
                    className="h-6 w-auto object-contain select-none"
                  />
                  <span className="hidden sm:inline-block text-[11px] text-zinc-400 bg-zinc-200/60 px-2 py-0.5 rounded-[3px]">
                    October 2026
                  </span>
                </div>

                {/* Interactive Metric Toggle (matches Header behavior) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMockMetricView((prev) => (prev === 'expense' ? 'income' : 'expense'))}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-[4px] border border-zinc-200 bg-white hover:bg-zinc-100 transition-colors cursor-pointer"
                    title="Click to toggle between Expenses and Income"
                  >
                    <span
                      className={`${
                        mockMetricView === 'income' ? 'text-black font-semibold' : 'text-zinc-500 font-medium'
                      }`}
                    >
                      {mockMetricView === 'expense' ? 'Expenses:' : 'Income:'}
                    </span>
                    <span
                      className={`font-semibold ${
                        mockMetricView === 'expense' ? 'text-rose-600' : 'text-black'
                      }`}
                    >
                      {mockMetricView === 'expense' ? '₱14,850.00' : '₱45,000.00'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-[4px] border border-zinc-200 bg-white">
                    <span className="text-zinc-500 font-medium">Savings:</span>
                    <span className="font-semibold text-emerald-600">₱30,150.00</span>
                  </div>
                </div>
              </div>

              {/* Mock Dashboard Body */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 bg-white">
                {/* Left 2 Cols: Transactions Feed */}
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Recent Activity
                    </h3>
                    <span className="text-[11px] text-zinc-400">Auto-timestamped</span>
                  </div>

                  <div className="space-y-2">
                    {/* Item 1 */}
                    <div className="flex items-center justify-between p-2.5 rounded-[6px] border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[4px] bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-zinc-900">Monthly Salary</div>
                          <div className="text-[11px] text-zinc-400">Bank Deposit • Today, 9:00 AM</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">+₱45,000.00</span>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center justify-between p-2.5 rounded-[6px] border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[4px] bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-zinc-900">Supermarket Groceries</div>
                          <div className="text-[11px] text-zinc-400">Cash • Today, 2:15 PM</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-rose-600">-₱1,250.00</span>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center justify-between p-2.5 rounded-[6px] border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[4px] bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Coffee className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-zinc-900">Coffee & Pastry</div>
                          <div className="text-[11px] text-zinc-400">E-Wallet • Today, 11:30 AM</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-rose-600">-₱180.00</span>
                    </div>
                  </div>
                </div>

                {/* Right Col: Debts & Purchase Goals Mock */}
                <div className="space-y-4">
                  {/* Goals Card */}
                  <div className="p-3.5 rounded-[6px] border border-zinc-200/90 bg-zinc-50/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                        <Target className="w-3.5 h-3.5 text-blue-600" />
                        <span>Purchase Goal</span>
                      </div>
                      <span className="text-[11px] font-medium text-blue-600">70% saved</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-600 mb-1">
                        <span className="font-medium text-zinc-800">Emergency Fund</span>
                        <span>₱35k / ₱50k</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full w-[70%]" />
                      </div>
                    </div>
                  </div>

                  {/* Debts Card */}
                  <div className="p-3.5 rounded-[6px] border border-zinc-200/90 bg-zinc-50/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                      <Scale className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Separate Debts</span>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-zinc-600">
                        <span>Owed to you (Alex):</span>
                        <span className="font-semibold text-emerald-600">₱3,500.00</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-600">
                        <span>You owe:</span>
                        <span className="font-semibold text-zinc-500">₱0.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Feature Highlights Section (3-4 items) */}
        <section className="py-16 sm:py-20 bg-zinc-50/70 border-y border-zinc-200/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                Thoughtfully crafted for everyday finances
              </h2>
              <p className="mt-3 text-sm sm:text-base text-zinc-600">
                Every detail is built to remove friction and give you a crystal-clear understanding of your money.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1: Quick-entry */}
              <div className="p-5 bg-white rounded-[6px] border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all space-y-3">
                <div className="w-9 h-9 rounded-[4px] bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-zinc-800" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Quick-entry in seconds
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Log transactions instantly with automatic timestamps and clean categories. No complex forms or extra clicks.
                </p>
              </div>

              {/* Feature 2: Debts tracked separately */}
              <div className="p-5 bg-white rounded-[6px] border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all space-y-3">
                <div className="w-9 h-9 rounded-[4px] bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-zinc-800" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Debts tracked separately
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Money you lent or borrowed stays in its own dedicated space so it never pollutes your day-to-day spending views.
                </p>
              </div>

              {/* Feature 3: Purchase goals */}
              <div className="p-5 bg-white rounded-[6px] border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all space-y-3">
                <div className="w-9 h-9 rounded-[4px] bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <Target className="w-4 h-4 text-zinc-800" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Purchase goals
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Set targets for things you plan to buy. See exactly how much more you need to save to reach each milestone.
                </p>
              </div>

              {/* Feature 4: Always-visible savings */}
              <div className="p-5 bg-white rounded-[6px] border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all space-y-3">
                <div className="w-9 h-9 rounded-[4px] bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4 text-zinc-800" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Always-visible savings
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Your true net savings and expenses stay right at the top of the screen—never hidden away inside buried reports.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. How it works (3 simple steps) */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              How it works
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
              Three simple steps to take full control of your personal budget.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center space-y-3 p-5 rounded-[6px] border border-zinc-200/70 bg-white">
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-semibold">
                1
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">Sign in</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Create an account in seconds or sign in quickly with your preferred method.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center space-y-3 p-5 rounded-[6px] border border-zinc-200/70 bg-white">
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-semibold">
                2
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">Log a transaction</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Type the amount and pick a category in moments, whether you used cash, card, or e-wallet.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-3 p-5 rounded-[6px] border border-zinc-200/70 bg-white">
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-semibold">
                3
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">Watch your savings update</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Your monthly savings, goals, and net figures reflect immediately without manual calculations.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Trust / Privacy Note */}
        <section className="pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
          <div className="p-6 sm:p-8 rounded-[8px] border border-zinc-200 bg-zinc-50/80 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-[6px] bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-zinc-100" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-semibold text-zinc-900">
                Your financial details stay strictly yours
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Your financial information is stored privately and securely on your device. It is never sold, shared, or monitored by third parties.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Footer */}
        <footer className="mt-auto bg-white border-t border-zinc-200 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-3">
              <img
                src={walloLogo}
                alt="Wallo"
                className="h-6 w-auto object-contain select-none"
              />
              <span className="text-zinc-500 text-xs">© 2026 Wallo</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onSignIn}
                className="text-zinc-600 hover:text-zinc-900 transition-colors font-medium cursor-pointer"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                className="text-zinc-600 hover:text-zinc-900 transition-colors font-medium cursor-pointer"
              >
                Sign up
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
