import { useId, useState } from 'react';

type AccordionItem = { id: string; question: string; answer: string };

export function Accordion({ items }: { items: AccordionItem[] }) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-slate-300 border border-slate-300 bg-white">
      {items.map((item) => {
        const expanded = openId === item.id;
        const panelId = `${baseId}-${item.id}-panel`;
        const buttonId = `${baseId}-${item.id}-button`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-base font-semibold text-navy hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-saffron"
                onClick={() => setOpenId(expanded ? null : item.id)}
              >
                <span>{item.question}</span>
                <span aria-hidden="true" className="text-xl">
                  {expanded ? '−' : '+'}
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!expanded} className="px-4 pb-4 text-sm leading-relaxed text-slate-700">
              {expanded ? item.answer : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
