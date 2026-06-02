import * as React from "react";

interface LoaderProps {
  size?: number;
  // text is intentionally locked to "Generating" — do not expose as a prop
}

export const Component: React.FC<LoaderProps> = ({ size = 200 }) => {
  const text = "Generating"; // LOCKED: do not change
  const letters = text.split("");
  const orbitDots = 8;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer conic gradient ring */}
      <div
        className="absolute inset-0 rounded-full animate-aiSpin"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, #38bdf8 90deg, #005dff 180deg, #a855f7 270deg, transparent 360deg)",
          WebkitMask:
            "radial-gradient(circle, transparent 58%, black 60%, black 70%, transparent 72%)",
          mask:
            "radial-gradient(circle, transparent 58%, black 60%, black 70%, transparent 72%)",
          filter: "drop-shadow(0 0 12px rgba(56,189,248,0.45))",
        }}
      />

      {/* Mid dashed ring counter-rotates */}
      <div
        className="absolute rounded-full border border-dashed border-primary/40 animate-aiSpinReverse"
        style={{ width: size * 0.78, height: size * 0.78 }}
      />

      {/* Pulsing inner glow core */}
      <div
        className="absolute rounded-full animate-aiPulse"
        style={{
          width: size * 0.55,
          height: size * 0.55,
          background:
            "radial-gradient(circle at 50% 50%, rgba(56,189,248,0.35), rgba(0,93,255,0.15) 50%, transparent 75%)",
          boxShadow:
            "0 0 24px 4px rgba(56,189,248,0.25), inset 0 0 30px rgba(0,93,255,0.35)",
        }}
      />

      {/* Orbiting particles */}
      <div
        className="absolute animate-aiSpin"
        style={{ width: size * 0.9, height: size * 0.9 }}
      >
        {Array.from({ length: orbitDots }).map((_, i) => {
          const angle = (i / orbitDots) * 360;
          return (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: i % 2 === 0 ? "#38bdf8" : "#a855f7",
                boxShadow: `0 0 8px ${i % 2 === 0 ? "#38bdf8" : "#a855f7"}`,
                transform: `rotate(${angle}deg) translate(${size * 0.42}px) translate(-50%, -50%)`,
                transformOrigin: "0 0",
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>

      {/* Scanning sweep */}
      <div
        className="absolute inset-0 rounded-full animate-aiSweep overflow-hidden"
        style={{
          WebkitMask: "radial-gradient(circle, black 60%, transparent 62%)",
          mask: "radial-gradient(circle, black 60%, transparent 62%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, transparent 48%, rgba(56,189,248,0.55) 50%, transparent 52%, transparent 100%)",
          }}
        />
      </div>

      {/* Center text */}
      <div className="relative flex gap-[2px] text-[11px] font-semibold tracking-[0.2em] uppercase text-foreground/90 z-10">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="animate-loaderLetter inline-block"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            {letter}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes aiSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes aiSpinReverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes aiPulse {
          0%, 100% { transform: scale(0.92); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes aiSweep {
          to { transform: rotate(360deg); }
        }
        @keyframes loaderLetter {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          20% { opacity: 1; transform: scale(1.2); color: #38bdf8; }
          40% { opacity: 0.7; transform: translateY(0); }
        }
        .animate-aiSpin { animation: aiSpin 6s linear infinite; }
        .animate-aiSpinReverse { animation: aiSpinReverse 9s linear infinite; }
        .animate-aiPulse { animation: aiPulse 2.4s ease-in-out infinite; }
        .animate-aiSweep { animation: aiSweep 3s linear infinite; }
        .animate-loaderLetter { animation: loaderLetter 2.6s infinite; }
      `}</style>
    </div>
  );
};

export default Component;
