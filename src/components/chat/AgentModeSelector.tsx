import { motion } from "framer-motion";
import { agentModes } from "./agentModes";
import { useState } from "react";

interface AgentModeSelectorProps {
  activeMode: string;
  onSelect: (mode: string) => void;
}

const AgentModeSelector = ({ activeMode, onSelect }: AgentModeSelectorProps) => {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);

  return (
    <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur-sm">
      <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-thin max-w-full">
        {agentModes.map((mode) => {
          const isActive = activeMode === mode.id;
          return (
            <div key={mode.id} className="relative shrink-0">
              <button
                onClick={() => onSelect(mode.id)}
                onMouseEnter={() => setHoveredMode(mode.id)}
                onMouseLeave={() => setHoveredMode(null)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <mode.icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : mode.color}`} />
                {mode.label}
                {isActive && (
                  <motion.div
                    layoutId="agent-indicator"
                    className="absolute inset-0 rounded-lg border border-primary/30 bg-primary/10"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", duration: 0.3 }}
                  />
                )}
              </button>
              {/* Tooltip */}
              {hoveredMode === mode.id && !isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg min-w-[180px]"
                >
                  <p className="text-[11px] font-medium text-foreground">{mode.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{mode.description}</p>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentModeSelector;
