"use client";

import { useState } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  CircleHelp,
  Download,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeft,
  Play,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { TradingDashboard } from "@/components/trading-dashboard";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Strategies", icon: Bot },
  { label: "Backtests", icon: BarChart3 },
  { label: "Activity log", icon: Terminal },
];

export default function Home() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [paperMode, setPaperMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#101828]">
      <header className="flex h-16 items-center justify-between border-b border-[#e4e7ec] bg-white px-4 lg:hidden">
        <div className="flex items-center gap-3"><Logo /><span className="font-semibold tracking-tight">SignalForge</span></div>
        <button className="rounded-lg p-2 hover:bg-[#f2f4f7]" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      <div className="flex min-h-screen lg:min-h-0">
        <aside className={`${sidebarOpen ? "fixed inset-0 z-30 flex" : "hidden"} w-64 shrink-0 flex-col border-r border-[#e4e7ec] bg-[#111827] text-white lg:sticky lg:top-0 lg:flex lg:h-screen`}>
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><Logo light /><div><p className="font-semibold tracking-tight">SignalForge</p><p className="text-[10px] uppercase tracking-[0.18em] text-[#98a2b3]">Trading lab</p></div></div>
          <div className="flex-1 px-3 py-6">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#667085]">Workspace</p>
            <nav className="space-y-1">
              {navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActiveNav(label); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${activeNav === label ? "bg-white/10 font-medium text-white" : "text-[#98a2b3] hover:bg-white/5 hover:text-white"}`}><Icon size={17} />{label}{label === "Activity log" && <span className="ml-auto rounded-full bg-[#344054] px-1.5 py-0.5 text-[10px]">12</span>}</button>)}
            </nav>
            <p className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#667085]">Controls</p>
            <nav className="space-y-1"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#98a2b3] hover:bg-white/5 hover:text-white"><SlidersHorizontal size={17} />Risk settings</button><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#98a2b3] hover:bg-white/5 hover:text-white"><Settings2 size={17} />Integrations</button></nav>
          </div>
          <div className="border-t border-white/10 p-4"><div className="mb-3 flex items-center gap-2 text-xs text-[#98a2b3]"><span className="h-2 w-2 rounded-full bg-[#12b76a]" />All systems operational</div><div className="flex items-center gap-3 rounded-lg bg-white/5 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#475467] text-xs font-semibold">AA</div><div className="min-w-0"><p className="truncate text-xs font-medium">Paper account</p><p className="truncate text-[10px] text-[#98a2b3]">Local workspace</p></div><CircleHelp size={14} className="ml-auto text-[#667085]" /></div></div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
            <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#667085]"><span>Workspace</span><span>/</span><span className="text-[#344054]">{activeNav}</span></div><h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#101828] sm:text-[30px]">Good morning, Alex <span className="text-[#98a2b3]">·</span> <span className="text-[#667085]">paper trading overview</span></h1><p className="mt-2 text-sm text-[#667085]">Your strategies are screened by rules, risk gates, and an AI confidence check before any simulated order.</p></div><div className="flex items-center gap-3"><button className="hidden items-center gap-2 rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-sm font-medium text-[#344054] shadow-sm hover:bg-[#f9fafb] sm:flex"><Download size={15} />Export report</button><div className="flex items-center gap-2 rounded-lg border border-[#d0d5dd] bg-white p-1.5 pl-3 shadow-sm"><span className="text-xs font-medium text-[#667085]">Paper mode</span><button onClick={() => setPaperMode(!paperMode)} aria-label="Toggle paper mode" className={`relative h-5 w-9 rounded-full transition ${paperMode ? "bg-[#12b76a]" : "bg-[#98a2b3]"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${paperMode ? "left-[18px]" : "left-0.5"}`} /></button></div></div></div>
            <TradingDashboard paperMode={paperMode} activeNav={activeNav} />
          </div>
        </main>
      </div>
    </div>
  );
}

function Logo({ light = false }: { light?: boolean }) { return <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${light ? "bg-[#1d2939]" : "bg-[#111827]"}`}><Zap size={18} className="text-[#32d583]" fill="currentColor" /></div>; }
