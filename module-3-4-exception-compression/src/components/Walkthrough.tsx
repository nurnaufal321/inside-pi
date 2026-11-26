interface Props {
  currentStep: number;
  onStepChange: (step: number) => void;
}

const STEPS = [
  {
    title: 'Raw Scan Data',
    description: 'The interface node scans the field device at a fixed scan rate (e.g. every 1 second). Every scan produces a raw value. Without any filtering, ALL of these values would be sent to the PI server.',
    highlight: 'Watch the grey dots appear — each is one scan.',
    piConcept: 'The scan class defines how often the interface reads the source device.',
  },
  {
    title: 'Exception Reporting',
    description: 'The exception test runs on the INTERFACE node. It compares each new scan to the last reported value. If the absolute deviation exceeds ExcDev, the new value AND the previous held value are both forwarded as "snapshot" events to the PI server.',
    highlight: 'Blue dots pass the deadband. Red dots are discarded. Purple dots are "previous value" reports.',
    piConcept: 'ExcDev acts as a deadband filter. ExcMax forces a report after a timeout even if the value hasn\'t changed. ExcMin prevents rapid-fire reports.',
  },
  {
    title: 'Swinging-Door Compression',
    description: 'Compression runs on the PI DATA SERVER (pisnapss). It takes snapshots that passed exception and decides which to archive. The algorithm maintains a "slope corridor" — max and min slopes from the last archived point through the current snapshot ± CompDev.',
    highlight: 'Green dots are archived. The faint green dashed lines show the slope corridor. When a new value\'s slope falls outside the corridor, the PREVIOUS snapshot is archived.',
    piConcept: 'Key rule: slopes can only NARROW (tighten), never widen. When Step=1, swinging-door is replaced by a simple deadband comparison.',
  },
  {
    title: 'Full Pipeline Results',
    description: 'See the complete data flow: raw scans → exception filter → compression → archived values. The stats show how much data was eliminated at each stage. A well-tuned PI point typically archives 2-5% of raw scan data.',
    highlight: 'Compare the grey raw signal to the green archived path. Good compression preserves the signal shape while eliminating redundant data.',
    piConcept: 'Gotcha: CompMax does NOT create values on its own — it only checks elapsed time when a new snapshot event arrives from the exception test.',
  },
];

export default function Walkthrough({ currentStep, onStepChange }: Props) {
  const step = STEPS[currentStep];

  return (
    <div className="flex flex-col gap-3">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-blue-400">Step {currentStep + 1} of {STEPS.length}</span>
        <div className="flex gap-1 ml-auto">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => onStepChange(i)}
              className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
                i === currentStep
                  ? 'bg-blue-600 text-white scale-110'
                  : i < currentStep
                  ? 'bg-blue-900 text-blue-400'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div>
        <h3 className="text-base font-semibold text-slate-100 mb-1">{step.title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
      </div>

      {/* Highlight box */}
      <div className="bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-2">
        <p className="text-xs text-blue-300 leading-relaxed">
          <span className="font-semibold">Look for: </span>{step.highlight}
        </p>
      </div>

      {/* PI concept callout */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">PI Concept: </span>{step.piConcept}
        </p>
      </div>

      {/* Nav buttons */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="flex-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onStepChange(Math.min(STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === STEPS.length - 1}
          className="flex-1 px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next Step
        </button>
      </div>
    </div>
  );
}
