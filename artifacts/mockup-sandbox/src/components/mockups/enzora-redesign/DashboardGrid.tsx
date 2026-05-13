import React from "react";
import { 
  Home, 
  Activity, 
  History, 
  MessageSquare, 
  Bell, 
  User, 
  Thermometer, 
  Droplets, 
  TestTube, 
  CalendarDays, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronRight
} from "lucide-react";

export function DashboardGrid() {
  return (
    <div 
      className="min-h-screen bg-[#F4F8FF] flex justify-center w-full"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="w-[390px] bg-[#F4F8FF] min-h-screen pb-24 relative overflow-x-hidden shadow-2xl">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-12 pb-6">
          <div className="flex flex-col">
            <img 
              src="/__mockup/images/enzora-logo.png" 
              alt="Enzora" 
              className="h-6 object-contain mb-2"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-[#1B2A6B] text-2xl font-bold tracking-tight">Good morning, Sarah</h1>
          </div>
          <div className="flex items-center bg-white rounded-full p-1 border border-[#E4EAF5] shadow-sm">
            <button className="px-3 py-1 bg-[#6E75BF] text-white text-xs font-semibold rounded-full">EN</button>
            <button className="px-3 py-1 text-[#6B7FA3] text-xs font-semibold rounded-full">AR</button>
          </div>
        </header>

        <div className="px-5 space-y-6">
          
          {/* Hero Status Card */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E4EAF5] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#7BC47F]"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#7BC47F]"></div>
                  <span className="text-[#7BC47F] font-bold text-sm uppercase tracking-wider">Healing Well</span>
                </div>
                <p className="text-[#6B7FA3] text-xs">Last check: 2 min ago</p>
              </div>
              
              {/* Circular Progress */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle 
                    cx="32" cy="32" r="28" 
                    fill="none" 
                    stroke="#F4F8FF" 
                    strokeWidth="6" 
                  />
                  <circle 
                    cx="32" cy="32" r="28" 
                    fill="none" 
                    stroke="#7BC47F" 
                    strokeWidth="6" 
                    strokeDasharray="175.9" 
                    strokeDashoffset={175.9 - (175.9 * 68) / 100}
                    strokeLinecap="round" 
                  />
                </svg>
                <span className="absolute text-[#1B2A6B] font-bold text-lg">68%</span>
              </div>
            </div>

            <button className="w-full py-3 bg-[#F4F8FF] hover:bg-[#DFF3FF] transition-colors rounded-xl text-[#6E75BF] font-semibold text-sm flex items-center justify-center gap-2">
              View Detailed Scan
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2-Column Grid */}
          <div>
            <h2 className="text-[#1B2A6B] text-lg font-bold mb-3 px-1">Current Readings</h2>
            <div className="grid grid-cols-2 gap-4">
              
              {/* Temp */}
              <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#E4EAF5] flex flex-col justify-between aspect-square">
                <div className="w-8 h-8 rounded-full bg-[#DFF3FF] flex items-center justify-center">
                  <Thermometer className="w-4 h-4 text-[#4A90E2]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1B2A6B]">36.7</span>
                    <span className="text-[#6B7FA3] text-sm">°C</span>
                  </div>
                  <span className="text-[#6B7FA3] text-xs font-medium">Temperature</span>
                </div>
              </div>

              {/* Humidity */}
              <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#E4EAF5] flex flex-col justify-between aspect-square">
                <div className="w-8 h-8 rounded-full bg-[#DFF3FF] flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-[#4A90E2]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1B2A6B]">42</span>
                    <span className="text-[#6B7FA3] text-sm">%</span>
                  </div>
                  <span className="text-[#6B7FA3] text-xs font-medium">Humidity</span>
                </div>
              </div>

              {/* pH */}
              <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#E4EAF5] flex flex-col justify-between aspect-square">
                <div className="w-8 h-8 rounded-full bg-[#C9C3F4] bg-opacity-30 flex items-center justify-center">
                  <TestTube className="w-4 h-4 text-[#8879B8]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1B2A6B]">6.8</span>
                  </div>
                  <span className="text-[#6B7FA3] text-xs font-medium">pH Level</span>
                </div>
              </div>

              {/* Days Monitored */}
              <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#E4EAF5] flex flex-col justify-between aspect-square">
                <div className="w-8 h-8 rounded-full bg-[#BFEBD8] bg-opacity-40 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-[#7BC47F]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1B2A6B]">12</span>
                    <span className="text-[#6B7FA3] text-sm">days</span>
                  </div>
                  <span className="text-[#6B7FA3] text-xs font-medium">Monitored</span>
                </div>
              </div>

              {/* Next Check */}
              <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#E4EAF5] flex flex-col justify-between aspect-square">
                <div className="w-8 h-8 rounded-full bg-[#F4F8FF] flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[#6E75BF]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1B2A6B]">2</span>
                    <span className="text-[#6B7FA3] text-sm">h</span>
                  </div>
                  <span className="text-[#6B7FA3] text-xs font-medium">Next check</span>
                </div>
              </div>

              {/* Alerts */}
              <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#E4EAF5] flex flex-col justify-between aspect-square">
                <div className="w-8 h-8 rounded-full bg-[#FFB703] bg-opacity-10 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-[#FFB703]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1B2A6B]">0</span>
                  </div>
                  <span className="text-[#6B7FA3] text-xs font-medium">New Alerts</span>
                </div>
              </div>

            </div>
          </div>

          {/* Care Tips */}
          <div className="bg-[#6E75BF] rounded-[24px] p-6 shadow-lg text-white">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#C9C3F4]" />
              Care tips today
            </h3>
            <ul className="space-y-4">
              <li className="flex gap-3 text-sm leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-[#BFEBD8] mt-2 shrink-0" />
                <span>Keep the patch dry during your shower this evening.</span>
              </li>
              <li className="flex gap-3 text-sm leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-[#BFEBD8] mt-2 shrink-0" />
                <span>Drink an extra glass of water to support skin healing.</span>
              </li>
            </ul>
          </div>

          {/* Color Meaning */}
          <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#E4EAF5]">
            <h3 className="text-[#1B2A6B] font-bold mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#6B7FA3]" />
              Status Colors Guide
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#7BC47F]"></div>
                <span className="text-[#6B7FA3] text-sm"><strong className="text-[#1B2A6B]">Green:</strong> Checking & Healing well</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#FFB703]"></div>
                <span className="text-[#6B7FA3] text-sm"><strong className="text-[#1B2A6B]">Yellow:</strong> Watch closely</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#4A90E2]"></div>
                <span className="text-[#6B7FA3] text-sm"><strong className="text-[#1B2A6B]">Blue:</strong> Call doctor</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Tab Bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] bg-white border-t border-[#E4EAF5] pb-safe pt-2 px-6 flex justify-between items-center shadow-[0_-4px_20px_rgb(0,0,0,0.03)] rounded-t-3xl pb-8">
          <button className="flex flex-col items-center gap-1 p-2">
            <Home className="w-6 h-6 text-[#6E75BF]" />
            <span className="text-[10px] font-semibold text-[#6E75BF]">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2">
            <Activity className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">Wounds</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2">
            <History className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">History</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 relative">
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#8879B8] rounded-full border-2 border-white"></div>
            <MessageSquare className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">Ask AI</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2">
            <Bell className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">Alerts</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2">
            <User className="w-6 h-6 text-[#6B7FA3]" />
            <span className="text-[10px] font-medium text-[#6B7FA3]">Profile</span>
          </button>
        </div>

      </div>
    </div>
  );
}
