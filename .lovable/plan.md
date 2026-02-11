
## Plan: Actualizar página de Uso y Mensajes

### Resumen del cambio
Reescribir completamente la página `/configuracion/uso-mensajes` para usar la función `get_monthly_billing_summary` en lugar de las funciones actuales, mostrando el costo real de facturación de forma clara y transparente para el cliente.

---

### Cambios en `src/pages/UsoMensajes.tsx`

#### 1. Actualizar interfaces de datos

**Antes:**
```typescript
interface MonthlyUsage {
  period_start: string;
  period_end: string;
  billable_outbound: number;
  unit_price: number;
  estimated_cost: number;
}
```

**Después:**
```typescript
interface BillingSummary {
  month_key: string;
  base_fee: number;
  messages_total: number;
  usage_total: number;
  total_due: number;
  avg_cost_per_message: number;
  inbound_msgs: number;
  inbound_cost: number;
  in_window_msgs: number;
  in_window_cost: number;
  outside_window_template_msgs: number;
  outside_window_template_cost: number;
}
```

---

#### 2. Cambiar fuente de datos

**Antes:**
- Llamada a `get_message_usage_current_month()` (sin parámetros)
- Llamada a `get_message_usage_daily()` para el detalle

**Después:**
- Usar `useCurrentUser()` para obtener `doctorId`
- Llamada a `get_monthly_billing_summary(p_doctor_id, p_month)`:
```typescript
const currentMonth = new Date().toISOString().slice(0, 10); // "2026-01-31" -> usar primer día del mes
const { data } = await supabase.rpc('get_monthly_billing_summary', {
  p_doctor_id: user.doctorId,
  p_month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
});
```

---

#### 3. Nueva estructura visual

**Card 1: Resumen del mes (bloque principal)**

Diseño con 3 métricas grandes:

| Métrica | Valor | Texto auxiliar |
|---------|-------|----------------|
| **Total a pagar** | `total_due` | "Incluye plan base + consumo de mensajes" |
| **Plan base** | `base_fee` (USD 35.00) | - |
| **Consumo de mensajes** | `usage_total` | "Uso real del mes" |

Eliminar:
- "Precio por mensaje" (`unit_price`)
- Cualquier cálculo manual de `mensajes * precio`

---

**Card 2: Detalle de consumo (tabla corta)**

Nueva tabla con 3 filas:

| Tipo de mensaje | Cantidad | Costo |
|-----------------|----------|-------|
| Mensajes recibidos | `inbound_msgs` | `inbound_cost` |
| Mensajes dentro de ventana | `in_window_msgs` | `in_window_cost` |
| Mensajes fuera de ventana | `outside_window_template_msgs` | `outside_window_template_cost` |

---

**Card 3: Métricas informativas (pequeño, secundario)**

Mostrar como texto auxiliar debajo del resumen:
- Mensajes totales: `messages_total`
- Costo promedio por mensaje: `avg_cost_per_message`

---

**Card 4: Detalle por día (colapsable)**

- Mantener sección existente usando `get_message_usage_daily`
- Hacer el detalle colapsable (cerrado por defecto)
- Usar componente `Collapsible` de Radix

---

#### 4. Agregar import de `useCurrentUser`

```typescript
import { useCurrentUser } from '@/context/UserContext';
```

---

#### 5. Agregar import de componente Collapsible

```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
```

---

#### 6. Actualizar textos (copy)

**Header principal:**
- Título: "Resumen del mes"
- Descripción: "Este es un resumen de tu consumo real de mensajes durante el mes."

**Nota al pie:**
- "El costo final incluye tu plan base y el uso de mensajes enviados y recibidos. Los montos se calculan según el uso real del servicio."

---

### Notas técnicas

1. **Tipado**: Como `get_monthly_billing_summary` no está en los tipos generados de Supabase, usaremos type assertion o definiremos la interfaz manualmente.

2. **Manejo de doctor sin mensajes**: Si no hay datos, mostrar mensaje amigable.

3. **Formato de moneda**: Mantener `formatCurrency` existente con 2-4 decimales según corresponda.

4. **Acceso**: La página solo es accesible para doctores (desde `/configuracion`), por lo que `user.doctorId` siempre debería estar disponible.

---

### Archivos a modificar
- `src/pages/UsoMensajes.tsx` (reescritura completa de la lógica y UI)

### Archivos que NO se modifican
- Funciones SQL en Supabase (ya existen)
- Componentes UI base (`Card`, `Table`, `Collapsible`)
- Contexto de usuario (`UserContext`)
