import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { FaqItem } from '@/lib/game-schema';
import type { ReactNode } from 'react';

export function GameFaq({
  faqs,
  renderAnswer,
}: {
  faqs: FaqItem[];
  renderAnswer?: (item: FaqItem, index: number) => ReactNode;
}) {
  return (
    <Accordion className="mt-5 grid gap-2.5" defaultValue={['faq-1']}>
      {faqs.map((item, index) => (
        <AccordionItem
          key={item.question}
          value={`faq-${index + 1}`}
          className="rounded-xl border border-border bg-card px-4"
        >
          <AccordionTrigger className="text-left font-bold hover:no-underline">
            {item.question}
          </AccordionTrigger>
          <AccordionContent>
            <div className="text-sm leading-6 text-muted-foreground">
              {renderAnswer?.(item, index) ?? <p>{item.answer}</p>}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
