import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'How do the 2 free deliveries work?',
    a: 'Every new Droply user gets 2 deliveries on us. The sender pays ₹0; we pay the rider the normal fare on your behalf. The free credit is applied automatically on your first 2 orders.',
  },
  {
    q: 'How is the delivery price calculated?',
    a: 'It\'s simple: ₹30 base fee + ₹8 per km. So a 5 km delivery costs ₹70. You can offer a higher price for faster pickup during peak hours.',
  },
  {
    q: 'How do I pay?',
    a: 'For v1, payment is Cash on Delivery — pay the rider directly when they pick up. Online payments are coming soon.',
  },
  {
    q: 'What can I send? What is prohibited?',
    a: 'You can send documents, food parcels, clothes, small electronics, and similar items under ₹20,000 in value. Prohibited: cash, jewellery, alcohol, illegal substances, fragile items without packaging, and anything dangerous or perishable beyond a few hours.',
  },
  {
    q: 'Can I cancel? Will I get my free delivery back?',
    a: 'Yes — you can cancel any order before the rider picks it up. If it was a free promo order, your free delivery credit is automatically refunded.',
  },
  {
    q: 'How do I contact support?',
    a: 'Tap the Help icon on the Rider Dashboard, or email support@droply.in. We respond within a few hours.',
  },
];

interface FAQProps {
  variant?: 'page' | 'compact';
}

export function FAQ({ variant = 'page' }: FAQProps) {
  return (
    <section className={variant === 'page' ? 'py-16 bg-muted/40' : 'py-8'}>
      <div className="container max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm">
            Quick answers to the things people ask most
          </p>
        </div>

        <Accordion type="single" collapsible className="bg-card rounded-xl border border-border px-4 sm:px-6">
          {FAQS.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
