import { ChevronRight } from "lucide-react";

const TopBar = ({ title, userName }) => (
  <header className="flex h-16.5 shrink-0 items-center justify-between border-b border-borde bg-superficie px-6 md:px-8">
    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-texto-muted">{title}</p>
    <div className="flex items-center gap-2 text-xs font-bold text-principal">
      <span className="h-2.5 w-2.5 rounded-full bg-principal" />
      {userName}
      <ChevronRight size={14} className="text-texto-muted" />
    </div>
  </header>
);

export default TopBar;