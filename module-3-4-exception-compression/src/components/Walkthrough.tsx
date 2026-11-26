import WalkthroughBase, { type WalkthroughStep } from './shared/WalkthroughBase';

interface Props {
  currentStep: number;
  onStepChange: (step: number) => void;
}

const STEPS: WalkthroughStep[] = [
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
  return <WalkthroughBase steps={STEPS} currentStep={currentStep} onStepChange={onStepChange} />;
}
