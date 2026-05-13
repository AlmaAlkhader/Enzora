import React from "react";
import { 
  Home, 
  Activity, 
  History, 
  MessageCircleQuestion, 
  BellRing, 
  UserCircle,
  Thermometer,
  Droplets,
  TestTube,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle
} from "lucide-react";

export function SoftMinimal() {
  return (
    <div 
      className="flex justify-center bg-gray-50 min-h-screen py-8"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div 
        className="w-[390px] min-h-[844px] bg-[#F4F8FF] overflow-hidden relative shadow-xl rounded-[40px] border-[8px] border-white flex flex-col"
      >
        {/* Header */}
        <header className="px-6 pt-12 pb-4 flex justify-between items-center bg-[#F4F8FF] z-10 relative">
          <div>
            <img src="/__mockup/images/enzora-logo.png" alt="Enzora" className="h-6 mb-2 object-contain" />
            <h1 className="text-[22px] font-semibold text-[#1B2A6B]">Good morning, Sarah</h1>
          </div>
          <div className="flex items-center bg-white rounded-full p-1 border border-[#E4EAF5] shadow-sm">
            <div className="px-3 py-1 bg-[#6E75BF] text-white text-xs font-medium rounded-full">EN</div>
            <div className="px-3 py-1 text-[#6B7FA3] text-xs font-medium">AR</div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto px-6 pb-24 space-y-6">
          
          {/* Hero Wound Status Card */}
          <section>
            <div className="bg-white rounded-[20px] p-5 border border-[#E4EAF5] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#7BC47F]"></div>
                  <span className="text-[#1B2A6B] font-semibold text-lg">Healing well</span>
                </div>
                <span className="text-[#6B7FA3] text-xs font-medium">Last check: 2 min ago</span>
              </div>

              <div className="flex items-center gap-4 bg-[#DFF3FF]/40 p-4 rounded-2xl mb-4 border border-[#DFF3FF]">
                <div className="relative w-16 h-16 flex-shrink-0">
                  {/* Simple CSS circular progress */}
                  <svg viewBox="0 0 36 36" className="w-16 h-16 transform -rotate-90">
                    <path
                      className="text-[#DFF3FF]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#7BC47F]"
                      strokeWidth="3.5"
                      strokeDasharray="68, 100"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[#1B2A6B] font-bold text-sm">68%</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col items-center">
                    <Thermometer className="w-4 h-4 text-[#8879B8] mb-1" />
                    <span className="text-[#1B2A6B] font-semibold text-sm">36.7°</span>
                    <span className="text-[#6B7FA3] text-[10px]">Temp</span>
                  </div>
                  <div className="flex flex-col items-center border-l border-[#E4EAF5]">
                    <Droplets className="w-4 h-4 text-[#8879B8] mb-1" />
                    <span className="text-[#1B2A6B] font-semibold text-sm">42%</span>
                    <span className="text-[#6B7FA3] text-[10px]">Humid</span>
                  </div>
                  <div className="flex flex-col items-center border-l border-[#E4EAF5]">
                    <TestTube className="w-4 h-4 text-[#8879B8] mb-1" />
                    <span className="text-[#1B2A6B] font-semibold text-sm">6.8</span>
                    <span className="text-[#6B7FA3] text-[10px]">pH</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Combined Today Card */}
          <section>
            <h2 className="text-[#1B2A6B] font-semibold text-lg mb-3 px-1">Today's Overview</h2>
            <div className="bg-white rounded-[20px] border border-[#E4EAF5] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#E4EAF5]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#DFF3FF] flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-[#4A90E2]" />
                  </div>
                  <span className="text-[#1B2A6B] font-medium">Days monitored</span>
                </div>
                <span className="text-[#1B2A6B] font-bold text-lg">12</span>
              </div>
              <div className="flex items-center justify-between p-4 border-b border-[#E4EAF5]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#C9C3F4]/30 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#8879B8]" />
                  </div>
                  <span className="text-[#1B2A6B] font-medium">Next check</span>
                </div>
                <span className="text-[#1B2A6B] font-bold text-lg">2h</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#FFF9ED]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFB703]/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-[#FFB703]" />
                  </div>
                  <span className="text-[#1B2A6B] font-medium">Alerts</span>
                </div>
                <span className="text-[#1B2A6B] font-bold text-lg">0</span>
              </div>
            </div>
          </section>

          {/* Care Tips */}
          <section>
            <h2 className="text-[#1B2A6B] font-semibold text-lg mb-3 px-1">Care tips today</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-[20px] p-4 border border-[#E4EAF5] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#7BC47F] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[#1B2A6B] font-medium text-sm">Keep the patch dry while showering</p>
                  <p className="text-[#6B7FA3] text-xs mt-1">Use a waterproof cover to protect the sensor.</p>
                </div>
              </div>
              <div className="bg-white rounded-[20px] p-4 border border-[#E4EAF5] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#7BC47F] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[#1B2A6B] font-medium text-sm">Avoid tight clothing</p>
                  <p className="text-[#6B7FA3] text-xs mt-1">Wear loose fitting clothes around the wound area.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Color Guide */}
          <section>
            <h2 className="text-[#1B2A6B] font-semibold text-lg mb-3 px-1">What the colors mean</h2>
            <div className="flex gap-2">
              <div className="flex-1 bg-white border border-[#E4EAF5] rounded-[16px] p-3 shadow-[0_2px_10px_-5px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center text-center">
                <div className="w-3 h-3 rounded-full bg-[#7BC47F] mb-2"></div>
                <span className="text-[#1B2A6B] text-[11px] font-medium leading-tight">Checking<br/>well</span>
              </div>
              <div className="flex-1 bg-white border border-[#E4EAF5] rounded-[16px] p-3 shadow-[0_2px_10px_-5px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center text-center">
                <div className="w-3 h-3 rounded-full bg-[#FFB703] mb-2"></div>
                <span className="text-[#1B2A6B] text-[11px] font-medium leading-tight">Watch<br/>closely</span>
              </div>
              <div className="flex-1 bg-white border border-[#E4EAF5] rounded-[16px] p-3 shadow-[0_2px_10px_-5px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center text-center">
                <div className="w-3 h-3 rounded-full bg-[#4A90E2] mb-2"></div>
                <span className="text-[#1B2A6B] text-[11px] font-medium leading-tight">Call<br/>doctor</span>
              </div>
            </div>
          </section>

        </main>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 w-full bg-white border-t border-[#E4EAF5] pt-3 pb-6 px-6 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.05)] rounded-b-[32px] flex justify-between items-center z-20">
          <button className="flex flex-col items-center gap-1.5">
            <Home className="w-6 h-6 text-[#6E75BF]" />
            <span className="text-[10px] font-medium text-[#6E75BF]">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1.5">
            <Activity className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">Wounds</span>
          </button>
          <button className="flex flex-col items-center gap-1.5">
            <History className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">History</span>
          </button>
          <button className="flex flex-col items-center gap-1.5">
            <MessageCircleQuestion className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">Ask AI</span>
          </button>
          <button className="flex flex-col items-center gap-1.5">
            <BellRing className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">Alerts</span>
          </button>
          <button className="flex flex-col items-center gap-1.5">
            <UserCircle className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
