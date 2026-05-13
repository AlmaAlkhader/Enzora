import React from "react";
import { 
  Home, 
  Bandage, 
  History, 
  Bot, 
  Bell, 
  User, 
  Thermometer, 
  Droplets, 
  Activity,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Lightbulb,
  ChevronRight
} from "lucide-react";

export function HeroLed() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#e2e8f0' }} className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8">
      {/* Phone Frame */}
      <div className="w-[390px] h-[844px] bg-[#F4F8FF] rounded-[40px] shadow-2xl overflow-hidden relative shadow-[#1B2A6B]/20 border-8 border-white flex flex-col">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-[90px] hide-scrollbar">
          
          {/* Header */}
          <header className="px-6 pt-14 pb-4 flex items-center justify-between z-10 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-[#E4EAF5] flex items-center justify-center overflow-hidden">
                <img src="/__mockup/images/enzora-logo.png" alt="Enzora" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#6B7FA3]">Good morning,</p>
                <h1 className="text-[20px] font-bold text-[#1B2A6B] leading-tight">Sarah</h1>
              </div>
            </div>
            <button className="flex items-center bg-white rounded-full p-1 shadow-sm border border-[#E4EAF5]">
              <span className="bg-[#6E75BF] text-white text-[11px] font-bold px-3 py-1 rounded-full">EN</span>
              <span className="text-[#6B7FA3] text-[11px] font-bold px-3 py-1">AR</span>
            </button>
          </header>

          <main className="px-5 flex flex-col gap-5 pb-6">
            
            {/* Hero Wound Status Card */}
            <div className="bg-gradient-to-b from-[#C9C3F4] to-[#DFF3FF] rounded-[28px] p-6 shadow-sm border border-white/50 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#6E75BF]/10 rounded-full blur-xl -ml-5 -mb-5"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h2 className="text-[#1B2A6B] font-bold text-[18px]">Current Status</h2>
                  <p className="text-[#6B7FA3] text-[13px] font-medium mt-1">Last check: 2 min ago</p>
                </div>
                <div className="bg-[#7BC47F]/20 text-[#7BC47F] px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[#7BC47F]/30 bg-white">
                  <div className="w-2 h-2 rounded-full bg-[#7BC47F]"></div>
                  <span className="text-[12px] font-bold">Healing well</span>
                </div>
              </div>

              {/* Big Circular Progress */}
              <div className="flex justify-center mb-8 relative z-10 mt-4">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* Outer glow */}
                  <div className="absolute inset-0 rounded-full bg-white/40 blur-md"></div>
                  
                  {/* SVG Circle */}
                  <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="white" strokeWidth="8" className="opacity-60" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6E75BF" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="80.38" strokeLinecap="round" />
                  </svg>
                  
                  {/* Center Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <span className="text-[44px] font-black text-[#1B2A6B] leading-none tracking-tight">68<span className="text-[24px] text-[#6E75BF]">%</span></span>
                    <span className="text-[13px] font-bold text-[#8879B8] uppercase tracking-wider mt-1">Healed</span>
                  </div>
                </div>
              </div>

              {/* Sensor Readings Pills */}
              <div className="flex justify-between gap-2 relative z-10">
                <div className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-2 border border-white">
                  <div className="w-7 h-7 rounded-full bg-[#FFB703]/20 text-[#FFB703] flex items-center justify-center shrink-0">
                    <Thermometer size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7FA3] uppercase tracking-wide">Temp</p>
                    <p className="text-[14px] font-black text-[#1B2A6B]">36.7°</p>
                  </div>
                </div>
                <div className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-2 border border-white">
                  <div className="w-7 h-7 rounded-full bg-[#4A90E2]/20 text-[#4A90E2] flex items-center justify-center shrink-0">
                    <Droplets size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7FA3] uppercase tracking-wide">Humid</p>
                    <p className="text-[14px] font-black text-[#1B2A6B]">42%</p>
                  </div>
                </div>
                <div className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-2 border border-white">
                  <div className="w-7 h-7 rounded-full bg-[#8879B8]/20 text-[#8879B8] flex items-center justify-center shrink-0">
                    <Activity size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7FA3] uppercase tracking-wide">pH</p>
                    <p className="text-[14px] font-black text-[#1B2A6B]">6.8</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Supporting Stat Cards Row */}
            <div className="flex gap-3">
              <div className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-[#E4EAF5] flex flex-col items-center justify-center text-center">
                <span className="text-[20px] font-bold text-[#1B2A6B]">12</span>
                <span className="text-[11px] font-medium text-[#6B7FA3] mt-1 leading-tight">Days<br/>Monitored</span>
              </div>
              <div className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-[#E4EAF5] flex flex-col items-center justify-center text-center">
                <span className="text-[20px] font-bold text-[#1B2A6B]">2h</span>
                <span className="text-[11px] font-medium text-[#6B7FA3] mt-1 leading-tight">Next<br/>Check</span>
              </div>
              <div className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-[#E4EAF5] flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-[#BFEBD8]/30 rounded-bl-full"></div>
                <span className="text-[20px] font-bold text-[#7BC47F]">0</span>
                <span className="text-[11px] font-medium text-[#6B7FA3] mt-1 leading-tight">New<br/>Alerts</span>
              </div>
            </div>

            {/* Care tips today */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E4EAF5]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#6E75BF]/10 flex items-center justify-center text-[#6E75BF]">
                  <Lightbulb size={16} strokeWidth={2.5} />
                </div>
                <h3 className="text-[16px] font-bold text-[#1B2A6B]">Care Tips Today</h3>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6E75BF] mt-2 shrink-0"></div>
                  <p className="text-[14px] text-[#6B7FA3] leading-snug">Keep the wound area dry during your shower today.</p>
                </div>
                <div className="w-full h-px bg-[#E4EAF5]/50"></div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6E75BF] mt-2 shrink-0"></div>
                  <p className="text-[14px] text-[#6B7FA3] leading-snug">Remember to drink at least 8 glasses of water to promote healing.</p>
                </div>
              </div>
            </div>

            {/* What the colors mean */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E4EAF5]">
              <h3 className="text-[16px] font-bold text-[#1B2A6B] mb-4">Status Guide</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 bg-[#F4F8FF] p-3 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-[#7BC47F]/20 text-[#7BC47F] flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#1B2A6B]">Green</h4>
                    <p className="text-[12px] text-[#6B7FA3]">Healing normally, no action needed.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[#F4F8FF] p-3 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-[#FFB703]/20 text-[#FFB703] flex items-center justify-center shrink-0">
                    <AlertCircle size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#1B2A6B]">Yellow</h4>
                    <p className="text-[12px] text-[#6B7FA3]">Watch closely, minor changes detected.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[#F4F8FF] p-3 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-[#4A90E2]/20 text-[#4A90E2] flex items-center justify-center shrink-0">
                    <PhoneCall size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#1B2A6B]">Blue</h4>
                    <p className="text-[12px] text-[#6B7FA3]">Please contact your doctor for a review.</p>
                  </div>
                </div>
              </div>
            </div>

          </main>
        </div>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 w-full bg-white border-t border-[#E4EAF5] px-6 py-4 pb-8 flex justify-between items-center z-50">
          <button className="flex flex-col items-center gap-1 group">
            <div className="text-[#6E75BF]">
              <Home size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-[#6E75BF]">Home</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 group">
            <div className="text-[#6B7FA3] group-hover:text-[#8879B8] transition-colors">
              <Bandage size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium text-[#6B7FA3] group-hover:text-[#8879B8]">Wounds</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 group">
            <div className="text-[#6B7FA3] group-hover:text-[#8879B8] transition-colors">
              <History size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium text-[#6B7FA3] group-hover:text-[#8879B8]">History</span>
          </button>

          <button className="flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FFB703] rounded-full border-2 border-white"></div>
            <div className="text-[#6B7FA3] group-hover:text-[#8879B8] transition-colors">
              <Bot size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium text-[#6B7FA3] group-hover:text-[#8879B8]">Ask AI</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 group">
            <div className="text-[#6B7FA3] group-hover:text-[#8879B8] transition-colors">
              <Bell size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium text-[#6B7FA3] group-hover:text-[#8879B8]">Alerts</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 group">
            <div className="text-[#6B7FA3] group-hover:text-[#8879B8] transition-colors">
              <User size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium text-[#6B7FA3] group-hover:text-[#8879B8]">Profile</span>
          </button>
        </div>
        
        {/* Hide scrollbar styling */}
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}} />
      </div>
    </div>
  );
}
