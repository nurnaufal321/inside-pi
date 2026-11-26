export interface WalkthroughStep {
  title: string;
  description: string;
  highlight: string;
  piConcept: string;
}

interface Props {
  steps: WalkthroughStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

export default function WalkthroughBase({ steps, currentStep, onStepChange }: Props) {
  const step = steps[currentStep];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-blue-400">Step {currentStep + 1} of {steps.length}</span>
        <div className="flex gap-1 ml-auto">
          {steps.map((_, i) => (
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

      <div>
        <h3 className="text-base font-semibold text-slate-100 mb-1">{step.title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
      </div>

      <div className="bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-2">
        <p className="text-xs text-blue-300 leading-relaxed">
          <span className="font-semibold">Look for: </span>{step.highlight}
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">PI Concept: </span>{step.piConcept}
        </p>
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="flex-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          className="flex-1 px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next Step
        </button>
      </div>
    </div>
  );
}
