import { motion } from "framer-motion";
import { agentModes, type AgentMode } from "./agentModes";

interface AgentModeSelectorProps {
  activeMode: string;
  onSelect: (mode: string) => void;
}

const AgentModeSelector = ({ activeMode, onSelect }: AgentModeSelectorProps) => {
  return (
    <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur-sm">
      <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-thin max-w-full">
        {agentModes.map((mode) => {
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              title={mode.description}
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
          );
        })}
      </div>
    </div>
  );
};

export default AgentModeSelector;
