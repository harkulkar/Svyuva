export type StepDef = { id: string; title: string };

export function Stepper({ steps, current, errorStep }: { steps: StepDef[]; current: number; errorStep?: number | null }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-2" aria-label="Form steps">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const errored = errorStep === index;
        return (
          <li
            key={step.id}
            aria-current={active ? 'step' : undefined}
            className={`min-h-11 flex-1 border px-2 py-2 text-center text-xs sm:text-sm ${
              errored ? 'border-red-700 bg-red-50 text-red-800' : active ? 'border-navy bg-navy text-white' : done ? 'border-indiaGreen bg-white text-indiaGreen' : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            <span className="block font-semibold">Step {index + 1}</span>
            <span className="block">{step.title}</span>
            {done && !active ? <span className="sr-only">Completed</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
