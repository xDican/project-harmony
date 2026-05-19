/**
 * QuickReplyPicker — popover con buscador para insertar plantillas en el composer.
 *
 * Sprint 4 (Centro de Atencion).
 *
 * Trigger: icono MessageSquareReply (Button ghost).
 * Contenido: Command (cmdk shadcn) con buscador por titulo + grupos por categoria.
 * Al seleccionar una plantilla, dispara `onPick(content)` y cierra el popover.
 *
 * Solo lista plantillas con is_active=true. La asistente puede ir a gestion
 * con el link de pie ("Gestionar plantillas →").
 */

import { useMemo, useState } from "react";
import { MessageSquareReply, Loader2, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import {
  QUICK_REPLY_CATEGORIES,
  QUICK_REPLY_CATEGORY_LABELS,
  type QuickReply,
  type QuickReplyCategory,
} from "@/lib/quickRepliesApi";

interface QuickReplyPickerProps {
  organizationId: string | undefined;
  disabled?: boolean;
  onPick: (content: string) => void;
}

export function QuickReplyPicker({
  organizationId,
  disabled,
  onPick,
}: QuickReplyPickerProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuickReplies(organizationId, { onlyActive: true });

  // Agrupar por categoria preservando el orden de QUICK_REPLY_CATEGORIES
  const grouped = useMemo(() => {
    const groups: Array<{ category: QuickReplyCategory; items: QuickReply[] }> = [];
    for (const cat of QUICK_REPLY_CATEGORIES) {
      const items = data.filter((qr) => qr.category === cat);
      if (items.length > 0) groups.push({ category: cat, items });
    }
    return groups;
  }, [data]);

  const handleSelect = (content: string) => {
    onPick(content);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-10 w-10"
          disabled={disabled}
          aria-label="Insertar respuesta rápida"
        >
          <MessageSquareReply className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-80" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Buscar plantilla..." autoFocus />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : grouped.length === 0 ? (
              <CommandEmpty>
                <div className="py-2 space-y-2 text-sm">
                  <p>No hay plantillas activas todavía.</p>
                  <Link
                    to="/configuracion/quick-replies"
                    onClick={() => setOpen(false)}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Crear la primera
                  </Link>
                </div>
              </CommandEmpty>
            ) : (
              <>
                <CommandEmpty>Sin resultados.</CommandEmpty>
                {grouped.map(({ category, items }) => (
                  <CommandGroup
                    key={category}
                    heading={QUICK_REPLY_CATEGORY_LABELS[category]}
                  >
                    {items.map((qr) => (
                      <CommandItem
                        key={qr.id}
                        value={`${qr.title} ${qr.content}`}
                        onSelect={() => handleSelect(qr.content)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="font-medium text-sm">{qr.title}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {qr.content}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
          {grouped.length > 0 && (
            <div className="border-t p-2">
              <Link
                to="/configuracion/quick-replies"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Gestionar plantillas
              </Link>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
