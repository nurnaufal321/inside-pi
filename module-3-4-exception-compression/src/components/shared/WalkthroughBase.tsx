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

/** Scenario picker for a Try-it simulation; the long narrative lives in the walkthrough. */
export default function WalkthroughBase({ steps, currentStep, onStepChange }: Props) {
  const step = steps[currentStep];
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow" style={{ color: 'var(--muted)' }}>Scenario</span>
      <div className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.title}
            onClick={() => onStepChange(i)}
            className={`btn-pop${i === currentStep ? ' is-green' : ''}`}
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '5px 10px', fontSize: 12, fontWeight: i === currentStep ? 700 : 600, boxShadow: i === currentStep ? undefined : '0 1.5px 0 var(--line-strong)', borderColor: i === currentStep ? undefined : 'var(--line-strong)' }}
          >
            <span style={{ color: 'var(--muted)', minWidth: 16 }}>{i + 1}</span>
            {s.title}
          </button>
        ))}
      </div>
      <p className="callout callout--tip" style={{ margin: '4px 0 0', fontSize: 11.5, lineHeight: 1.55, display: 'block' }}>
        <b>Look for: </b>{step.highlight}
      </p>
    </div>
  );
}
