import { useState, useEffect, useRef } from 'react';

const lines = [
  { text: 'Deploy specialized AI agents to hunt and validate vulnerabilities in real-time.', color: 'text-gray-300' },
  { text: 'From protocol registration to automated settlement in under 4 minutes.', color: 'text-gray-400' },
  { text: 'Zero human intervention.', color: 'text-accent-cyan' },
  { text: 'Powered by X.402 & ERC-8004.', color: 'text-accent-cyan' },
];

const CHAR_DELAY = 22;
const LINE_PAUSE = 400;

export function TerminalText() {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const startedRef = useRef(false);

  // Respect reduced motion
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedLines(lines.map((l) => l.text));
      setCurrentLine(lines.length);
      return;
    }
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (currentLine >= lines.length) return;

    if (startedRef.current && currentChar === 0) {
      // Pause between lines
      const pause = setTimeout(() => {
        setDisplayedLines((prev) => [...prev, '']);
        startedRef.current = true;
        setCurrentChar(1);
      }, LINE_PAUSE);
      return () => clearTimeout(pause);
    }

    if (!startedRef.current) {
      setDisplayedLines(['']);
      startedRef.current = true;
    }

    const line = lines[currentLine].text;

    if (currentChar <= line.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = line.slice(0, currentChar);
          return updated;
        });
        setCurrentChar((c) => c + 1);
      }, CHAR_DELAY);
      return () => clearTimeout(timer);
    } else {
      // Line complete, move to next
      setCurrentLine((l) => l + 1);
      setCurrentChar(0);
    }
  }, [currentLine, currentChar]);

  // Blinking cursor
  useEffect(() => {
    const blink = setInterval(() => setShowCursor((c) => !c), 530);
    return () => clearInterval(blink);
  }, []);

  const isComplete = currentLine >= lines.length;

  return (
    <div className="bg-[#0d1117] border border-gray-700/50 rounded-lg px-4 py-3 max-w-xl mx-auto font-mono text-sm leading-relaxed">
      {/* Terminal header dots */}
      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-gray-800">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="text-[10px] text-gray-600 ml-2">thunder-security</span>
      </div>

      {/* Lines */}
      {displayedLines.map((text, i) => {
        const lineDef = lines[i];
        const isCurrentLine = i === displayedLines.length - 1 && !isComplete;
        return (
          <div key={i} className="flex gap-2">
            <span className="text-accent-cyan select-none shrink-0">&gt;</span>
            <span className={lineDef?.color || 'text-gray-300'}>
              {text}
              {isCurrentLine && (
                <span
                  className={`inline-block w-[7px] h-[14px] ml-0.5 -mb-[2px] bg-accent-cyan ${
                    showCursor ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}
            </span>
          </div>
        );
      })}

      {/* Cursor on empty new line after complete */}
      {isComplete && (
        <div className="flex gap-2">
          <span className="text-accent-cyan select-none">&gt;</span>
          <span
            className={`inline-block w-[7px] h-[14px] ml-0.5 -mb-[2px] bg-accent-cyan ${
              showCursor ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      )}
    </div>
  );
}
