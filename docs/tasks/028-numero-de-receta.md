# 028 — Receta: mostrar el número R-000001 en la atención

## Objetivo
El backend (tarea 035, D-35) asigna a cada receta un número correlativo `R-000001` **al emitirla** y lo imprime en
ambas mitades del PDF. `Prescription` trae ahora `prescriptionNumber: string | null` (`null` en DRAFT). El
odontólogo debe verlo en la lista de recetas de la atención para ubicar una receta cuando llamen de la farmacia o
vuelva el paciente con la hoja.

Solo presentación: sin endpoints nuevos ni cambios en el flujo de emitir/imprimir. El historial clínico
(`clinical-summary`) no trae el número y no se toca.

## Archivos a tocar
```
src/app/features/prescriptions/
  models/prescription.models.ts                         Prescription + prescriptionNumber: string | null
  components/prescriptions-section/
    prescriptions-section.component.ts                  «N.º R-000123» en la etiqueta de la emitida
src/app/features/clinical/pages/encounter/
  encounter.page.spec.ts                                aserción en el caso «Emitir e imprimir…» + mocks
```
No exportar nada nuevo en `prescriptions/index.ts`. No tocar `management/` ni `docs/IMPLEMENTATION-PLAN.md`
(hay cambios sin commit de la 023f en esos archivos; el plan lo actualiza Claude al aprobar).

## Criterios de aceptación
1. `Prescription.prescriptionNumber: string | null`. Los mocks de receta del spec lo incluyen (`null` en el
   borrador).
2. En `prescriptions-section`, la etiqueta de una receta emitida pasa de
   `Emitida · 19/10/2026 10:42` a `Emitida N.º R-000123 · 19/10/2026 10:42`; el número en
   `<span class="prescriptions-section__number">` con `font-variant-numeric: tabular-nums` y peso semibold, dentro de
   la misma etiqueta (mismo color que hoy). Si `prescriptionNumber` es `null` (no debería pasar en ISSUED), se omite
   «N.º …» y se ve como hoy.
3. Borrador: sin cambios («Borrador», sin número).
4. Sin otros cambios visuales; `npx ng build` sin errores ni warnings nuevos.

## Responsive
Revisar en 1366, 768 y 375: la etiqueta no se desborda; si no cabe, envuelve antes de la fecha (no corta el número).

## Tests requeridos
Integración: en `encounter.page.spec.ts`, caso existente «Emitir e imprimir un borrador → queda Emitida y abre el
PDF»: la respuesta de `issue` trae `prescriptionNumber: 'R-000123'` y se verifica que `.prescriptions-section`
contiene `R-000123`. No crear casos nuevos.

## Prueba manual
1. Abrir una atención, crear una receta → la lista dice «Borrador», sin número.
2. «Emitir e imprimir» → la etiqueta dice «Emitida N.º R-00000X · fecha hora» y el PDF muestra el mismo número en
   ambas mitades.
3. Recargar la página → el número sigue visible.

## Resultado

**Archivos modificados**
- `src/app/features/prescriptions/models/prescription.models.ts`: `prescriptionNumber: string | null` en `Prescription`.
- `src/app/features/prescriptions/components/prescriptions-section/prescriptions-section.component.ts`: la etiqueta de
  emitida pasa a `Emitida N.º <span class="prescriptions-section__number">R-…</span> · fecha hora`; el `@if` omite
  «N.º …» si el número es `null`. Nueva clase `.prescriptions-section__number` (tabular-nums, semibold, `nowrap`).
- `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: en «Emitir e imprimir un borrador…» la respuesta de
  `issue` trae `prescriptionNumber: 'R-000123'` y se aserta que `.prescriptions-section` contiene `R-000123`. Sin casos nuevos.
- Fuera de la lista (fuera de alcance, cambio mínimo obligatorio): `src/app/features/clinical/testing/fixtures.ts`.
  `mockPrescriptionDraft` está tipado como `Prescription`, así que el campo obligatorio rompía la compilación; se añadió
  `prescriptionNumber: null`. Es el único otro mock de `Prescription`.

**Build**
- `npx ng build`: OK (compila). Hay un warning que no viene de esta tarea:
  `src/app/layout/sidebar/sidebar.component.scss exceeded maximum budget ... 4.10 kB`, archivo que no se tocó.

**Tests** (copiados de la consola)
- Spec de la atención (`--include=src/app/features/clinical/pages/encounter/**/*.spec.ts`):
  `Test Files 1 passed (1)` · `Tests 23 passed (23)`.
- Suite completa (`npx ng test --watch=false`):
  `Test Files 18 passed (18)` · `Tests 84 passed (84)`. Incluye los specs de `management/` sin fallos.

**Responsive**
- No verificado visualmente: no se levantó el navegador en 1366, 768 ni 375. Por diseño, `nowrap` en el número evita
  cortarlo; si la etiqueta no cabe, el texto envuelve en los espacios antes o después de «N.º» o de la fecha.

**Supuestos**
- `N.º` va como texto fuera del span y solo el número dentro del span, según el criterio 2.
- No se hizo commit ni se tocaron `management/`, `docs/IMPLEMENTATION-PLAN.md` ni `prescriptions/index.ts`.

**Prueba manual**: no se ejecutó (requiere backend con la tarea 035 y el PDF real).

## Revisión
Estado: APROBADO

- Criterios 1–4 cumplidos: `prescriptionNumber: string | null`, etiqueta «Emitida N.º R-… · fecha hora» con el número en `.prescriptions-section__number` (tabular-nums, 600, `nowrap`); `null` y borrador quedan como antes.
- Test: el caso existente «Emitir e imprimir…» trae `R-000123` y lo verifica; sin casos nuevos. El cambio en `clinical/testing/fixtures.ts` (`prescriptionNumber: null`) es necesario para compilar.
- `npx ng test --watch=false` (revisor): Test Files 18 passed (18) · Tests 84 passed (84). Responsive y prueba manual pendientes de verificación visual.
