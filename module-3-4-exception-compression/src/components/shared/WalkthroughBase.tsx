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
        <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>Step {currentStep + 1} of {steps.length}</span>
        <div className="flex gap-1 ml-auto">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => onStepChange(i)}
              className="w-6 h-6 rounded-full text-xs font-bold transition-all"
              style={{
                backgroundColor: i === currentStep ? 'var(--color-accent)' : i < currentStep ? '#f0ebe6' : 'var(--color-surface)',
                color: i === currentStep ? 'white' : i < currentStep ? 'var(--color-accent)' : 'var(--color-label)',
                transform: i === currentStep ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-heading)' }}>{step.title}</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-body)' }}>{step.description}</p>
      </div>

      <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
        <p className="text-xs leading-relaxed" style={{ color: '#2563eb' }}>
          <span className="font-semibold">Look for: </span>{step.highlight}
        </p>
      </div>

      <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-body)' }}>
          <span className="font-semibold" style={{ color: 'var(--color-heading)' }}>PI Concept: </span>{step.piConcept}
        </p>
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-body)' }}
        >
          Previous
        </button>
        <button
          onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          Next Step
        </button>
      </div>
    </div>
  );
}
