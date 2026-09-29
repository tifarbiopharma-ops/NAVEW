import { ChevronRight } from "lucide-react";

const TopBar = ({ title, userName }) => (
  <header className="flex h-16.5 shrink-0 items-center justify-between border-b border-[#e3e9f0] bg-white px-6 md:px-8">
    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#718098]">{title}</p>
    <div className="flex items-center gap-2 text-xs font-bold text-[#17243d]">
      <span className="h-2.5 w-2.5 rounded-full bg-[#17243d]" />
      {userName}
      <ChevronRight size={14} className="text-slate-400" />
    </div>
  </header>
);

export default TopBar;