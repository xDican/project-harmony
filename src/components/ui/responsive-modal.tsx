import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Drawer mobile a pantalla completa (forms largos) vs alto variable hasta 90dvh (listas/detalle cortos). Default false. */
  mobileFullScreen?: boolean;
  /** Clase Tailwind de ancho maximo del Dialog desktop. Default "max-w-lg". */
  desktopMaxWidth?: string;
}

/**
 * ResponsiveModal — Drawer (mobile) / Dialog (desktop) con cierre explicito.
 *
 * Base del patron "Hub + Drawer" (ver CLAUDE.md, Fase 3). `dismissible={false}`
 * + `repositionInputs={false}` siempre en el Drawer: vaul cierra por swipe con
 * velocidad minima sin importar `closeThreshold` (VELOCITY_THRESHOLD interno,
 * no configurable) y redimensiona en vivo con el teclado abierto — pensado
 * para bottom-sheets cortos, no para nuestros forms de pantalla completa.
 * Cierre 100% predecible solo con la X del header (fix original en
 * Calendario.tsx, Drawer "Nueva cita"). El Dialog desktop no necesita X manual:
 * `DialogContent` ya trae la suya nativa via Radix.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  mobileFullScreen = false,
  desktopMaxWidth = "max-w-lg",
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible={false}
        repositionInputs={false}
      >
        <DrawerContent
          className={cn(
            mobileFullScreen
              ? "mt-0 h-[100dvh] max-h-[100dvh] rounded-none"
              : "max-h-[90dvh] rounded-t-lg",
          )}
        >
          <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
            <div>
              <DrawerTitle>{title}</DrawerTitle>
              {subtitle ? (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          {footer ? <DrawerFooter className="border-t pt-3">{footer}</DrawerFooter> : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(desktopMaxWidth, "max-h-[90vh] flex flex-col p-0 gap-0")}>
        <DialogHeader className="p-6 border-b border-border">
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </DialogHeader>
        <div className="p-6 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <DialogFooter className="p-6 border-t border-border">{footer}</DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
