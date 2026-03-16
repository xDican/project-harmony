import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { FAQ_CATEGORIES, FAQ_TEMPLATES } from '@/data/faqTemplates';
import type { FAQTemplate, BotFAQ } from '@/types/bot.types';

interface FAQTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: FAQTemplate) => void;
  existingFaqs: BotFAQ[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasSimilarFaq(template: FAQTemplate, existingFaqs: BotFAQ[]): boolean {
  for (const faq of existingFaqs) {
    const existingKeywords = (faq.keywords || []).map(normalize);
    const templateKeywords = template.keywords.map(normalize);
    let matches = 0;
    for (const tk of templateKeywords) {
      if (existingKeywords.some((ek) => ek === tk)) {
        matches++;
      }
    }
    if (matches >= 2) return true;
  }
  return false;
}

export default function FAQTemplatePicker({
  open,
  onOpenChange,
  onSelect,
  existingFaqs,
}: FAQTemplatePickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results = FAQ_TEMPLATES;

    if (selectedCategory) {
      results = results.filter((t) => t.category === selectedCategory);
    }

    if (search.trim()) {
      const q = normalize(search.trim());
      results = results.filter(
        (t) =>
          normalize(t.question).includes(q) ||
          t.keywords.some((k) => normalize(k).includes(q))
      );
    }

    return results;
  }, [search, selectedCategory]);

  // Group by category for display
  const grouped = useMemo(() => {
    const map = new Map<string, FAQTemplate[]>();
    for (const t of filtered) {
      const list = map.get(t.category) || [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [filtered]);

  const handleSelect = (template: FAQTemplate) => {
    onSelect(template);
    setSearch('');
    setSelectedCategory(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setSearch('');
          setSelectedCategory(null);
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Catalogo de preguntas frecuentes</DialogTitle>
          <DialogDescription>
            Selecciona una pregunta y solo tendras que escribir tu respuesta
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por pregunta o palabra clave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={selectedCategory === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            Todas
          </Badge>
          {FAQ_CATEGORIES.map((cat) => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() =>
                setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
              }
            >
              {cat.label}
            </Badge>
          ))}
        </div>

        {/* Template list */}
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No se encontraron templates
            </p>
          ) : (
            <div className="space-y-6 pb-4">
              {Array.from(grouped.entries()).map(([catId, templates]) => {
                const category = FAQ_CATEGORIES.find((c) => c.id === catId);
                return (
                  <div key={catId}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      {category?.label || catId}
                    </h3>
                    <div className="space-y-2">
                      {templates.map((t) => {
                        const similar = hasSimilarFaq(t, existingFaqs);
                        return (
                          <div
                            key={t.id}
                            className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{t.question}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {t.keywords.map((kw) => (
                                  <Badge
                                    key={kw}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {kw}
                                  </Badge>
                                ))}
                                {similar && (
                                  <Badge variant="secondary" className="text-xs">
                                    Ya tienes una similar
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSelect(t)}
                            >
                              Usar
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
