import React, { useState, useEffect } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { ArrowRight, Sparkles, HeartPulse, Stethoscope, ClipboardList, MapPin } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';

export default function Auth() {
  const [authMode, setAuthMode] = useState<'splash' | 'signin' | 'signup'>('splash');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (authMode === 'signin' || authMode === 'signup') {
    return (
      <PageWrapper className="bg-slate-900 min-h-screen flex flex-col items-center justify-center p-4 antialiased selection:bg-teal-500/30">
        
        {/* Subtle Ambient Background */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-30" style={{ background: 'radial-gradient(circle, #6D28D9 0%, transparent 70%)' }}></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-20" style={{ background: 'radial-gradient(circle, #14B8A6 0%, transparent 70%)' }}></div>
        </div>

        <div className="z-10 w-full max-w-md mb-6 flex justify-between items-center">
          <button 
            onClick={() => setAuthMode('splash')}
            className="text-slate-400 hover:text-teal-400 transition-colors text-sm flex items-center gap-1 font-medium"
          >
            &larr; Back to Home
          </button>
          
          <div className="bg-slate-800/80 backdrop-blur-md p-1 rounded-xl flex gap-1 border border-white/5">
            <button 
              onClick={() => setAuthMode('signin')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'signin' ? 'bg-slate-700 shadow-md text-white border border-white/10' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setAuthMode('signup')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'signup' ? 'bg-slate-700 shadow-md text-white border border-white/10' : 'text-slate-400 hover:text-white'}`}
            >
              Sign Up
            </button>
          </div>
        </div>

        <div className="z-10 w-full max-w-md flex justify-center drop-shadow-2xl">
          {authMode === 'signin' ? (
            <SignIn routing="hash" appearance={{
              elements: {
                card: "bg-slate-800 border border-white/10 shadow-2xl rounded-2xl",
                headerTitle: "text-white font-heading text-2xl",
                headerSubtitle: "text-slate-400",
                formFieldLabel: "text-slate-300",
                formFieldInput: "bg-slate-900 border-white/10 text-white focus:border-teal-500 focus:ring-teal-500/20 rounded-xl",
                formButtonPrimary: "bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl",
                dividerLine: "bg-white/10",
                dividerText: "text-slate-500",
                socialButtonsBlockButton: "border-white/10 hover:bg-slate-700 text-slate-300",
                socialButtonsBlockButtonText: "text-slate-300",
                footerActionText: "text-slate-400",
                footerActionLink: "text-teal-400 hover:text-teal-300"
              }
            }} />
          ) : (
            <SignUp routing="hash" appearance={{
              elements: {
                card: "bg-slate-800 border border-white/10 shadow-2xl rounded-2xl",
                headerTitle: "text-white font-heading text-2xl",
                headerSubtitle: "text-slate-400",
                formFieldLabel: "text-slate-300",
                formFieldInput: "bg-slate-900 border-white/10 text-white focus:border-teal-500 focus:ring-teal-500/20 rounded-xl",
                formButtonPrimary: "bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl",
                dividerLine: "bg-white/10",
                dividerText: "text-slate-500",
                socialButtonsBlockButton: "border-white/10 hover:bg-slate-700 text-slate-300",
                socialButtonsBlockButtonText: "text-slate-300",
                footerActionText: "text-slate-400",
                footerActionLink: "text-teal-400 hover:text-teal-300"
              }
            }} />
          )}
        </div>
      </PageWrapper>
    );
  }

  // SPLASH SCREEN (Premium Entry Experience)
  return (
    <div 
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden antialiased selection:bg-teal-500/30"
      style={{ backgroundColor: '#0F172A', fontFamily: "'Outfit', sans-serif" }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
          
          .animate-fade-in-up {
            animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          .animate-float-1 { animation: float 6s ease-in-out infinite; }
          .animate-float-2 { animation: float 7s ease-in-out infinite 1s; }
          .animate-float-3 { animation: float 8s ease-in-out infinite 2s; }
          .animate-float-4 { animation: float 6.5s ease-in-out infinite 1.5s; }
          .animate-float-5 { animation: float 7.5s ease-in-out infinite 0.5s; }
          
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          
          .glass-feature-card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2);
          }
        `}
      </style>

      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, #6D28D9 0%, transparent 70%)' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #14B8A6 0%, transparent 70%)' }}></div>

      {/* Subtle Hero Background Pattern / Image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-[0.15] z-0 pointer-events-none mix-blend-luminosity"
        style={{ 
          backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCxy8PD3Uj4ELPHq5AhyjtMGhUPMM0A8AdjsNE8VmBf-BawXvZSPLryo2c4AkaBpuHtsy2EPcfOt3eCpsvM83qVoyc-GtM4XArR4TNBhteIyetFFyYphD1B3e0zMNjtGc2IKKd7k_WP587myZxjTHGUrePBhcxDpkqF1lfYluIP6JcRuE1bcaPpAJZU4CDvqSnXvYXtPS9RWJJ8WGO4XMOQ9XPZ49BuLC9VF61jFvM678Vbky7GkHhcybW67o8KV0tikKclXLEVdKw')", 
          backgroundPosition: 'top center',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
        }}
      ></div>

      {/* Floating Proof Cards (Desktop/Tablet visible, subtly arranged) */}
      <div className="hidden md:block absolute inset-0 z-10 pointer-events-none overflow-hidden max-w-[1200px] mx-auto">
        <div className="absolute top-[20%] left-[5%] animate-float-1 glass-feature-card px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#7C3AED' }}>
            <Sparkles size={16} className="text-white" />
          </div>
          <span style={{ color: '#E2E8F0' }} className="font-medium text-sm">PAW AI guidance</span>
        </div>
        
        <div className="absolute top-[15%] right-[10%] animate-float-2 glass-feature-card px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#14B8A6' }}>
            <HeartPulse size={16} className="text-white" />
          </div>
          <span style={{ color: '#E2E8F0' }} className="font-medium text-sm">Health profile</span>
        </div>

        <div className="absolute bottom-[35%] left-[8%] animate-float-3 glass-feature-card px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B82F6' }}>
            <Stethoscope size={16} className="text-white" />
          </div>
          <span style={{ color: '#E2E8F0' }} className="font-medium text-sm">Vaccine reminders</span>
        </div>

        <div className="absolute bottom-[40%] right-[5%] animate-float-4 glass-feature-card px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6D28D9' }}>
            <ClipboardList size={16} className="text-white" />
          </div>
          <span style={{ color: '#E2E8F0' }} className="font-medium text-sm">Vet-ready reports</span>
        </div>
        
        <div className="absolute top-[45%] right-[15%] animate-float-5 glass-feature-card px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0EA5E9' }}>
            <MapPin size={16} className="text-white" />
          </div>
          <span style={{ color: '#E2E8F0' }} className="font-medium text-sm">Nearby vets</span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`relative z-20 w-full max-w-lg mx-auto px-6 pt-12 pb-8 flex flex-col items-center justify-center flex-grow transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        
        <div className="w-full flex flex-col items-center text-center animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2" style={{ color: '#E2E8F0' }}>
            PAWPHILE
          </h1>
          <h2 className="text-lg md:text-xl font-medium mb-8" style={{ color: '#14B8A6' }}>
            For who you Love.
          </h2>
          
          <h3 className="text-2xl md:text-3xl font-semibold leading-tight mb-4" style={{ color: '#E2E8F0' }}>
            Preventive dog healthcare,<br/>guided by AI.
          </h3>
          
          <p className="text-base md:text-lg leading-relaxed max-w-md mx-auto mb-10" style={{ color: '#94A3B8' }}>
            Track health, understand symptoms, manage reminders, and create vet-ready reports — all in one calm companion.
          </p>
        </div>

        {/* Action Area */}
        <div className="w-full flex flex-col items-center gap-5 max-w-sm animate-fade-in-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <button 
            onClick={() => setAuthMode('signup')}
            className="w-full relative group overflow-hidden rounded-full py-4 px-8 flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)]"
            style={{ backgroundColor: '#14B8A6', color: '#FFFFFF' }}
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span className="font-semibold text-lg relative z-10">Start your dog's health profile</span>
            <ArrowRight size={22} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="text-center mt-2">
            <span style={{ color: '#94A3B8' }} className="text-sm">
              Already have an account?{' '}
            </span>
            <button 
              onClick={() => setAuthMode('signin')}
              className="font-medium hover:underline transition-all outline-none"
              style={{ color: '#3B82F6' }}
            >
              Sign In
            </button>
          </div>
        </div>

      </main>

      {/* Trust Disclaimer Footer */}
      <footer className={`relative z-20 w-full p-6 text-center animate-fade-in-up mt-auto`} style={{ animationDelay: '0.5s', opacity: 0 }}>
        <p className="text-xs max-w-sm mx-auto flex items-center justify-center gap-1.5 opacity-60" style={{ color: '#94A3B8' }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          Awareness and preventive decision-support only. Not a replacement for a veterinarian.
        </p>
      </footer>
      
    </div>
  );
}
