# Web UI Consistency (web-manager)

Rules for **every** new or updated UI in `apps/web-manager`. Follow existing patterns; do not invent one-off loaders, buttons, or alert styles.

## Loading

### Route transitions (Server Components / navigation)
Add a colocated `loading.tsx` that reuses the shared skeleton:

```tsx
import TableSkeleton from "../../../components/table-skeleton";
export default TableSkeleton;
```

Examples: `app/dashboard/tenants/loading.tsx`, `app/dashboard/documents/loading.tsx`.

List/detail admin pages under `/admin/*` must do the same when they are table-style screens.

### In-flight mutations (client forms / actions)
Use the platform loader overlay — **not** inline `…` / `Enregistrement…` button text as the only busy signal:

```tsx
import UniversalLoadingState from "./universal-loading-state";

{busy ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
    <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
  </div>
) : null}
```

- Keep the primary button label stable (e.g. `Créer`, `Enregistrer`, `Ajouter`).
- Disable the button while `busy`.
- Compact inline waits (small panels only):  
  `<UniversalLoadingState minHeightClassName="min-h-28" size="compact" />`

Do **not** introduce spinners, skeleton hacks, or custom loaders when these exist.

## Buttons and CTAs

Brand colors ([brand.md](./brand.md)):

| Role | Color | Usage |
|------|--------|--------|
| Primary action | `#0063fe` | Dashboard create/save/submit CTAs |
| Hover primary | `#0052d4` / `#0050d0` | Primary hover |
| Dark admin primary | `#010a19` (light) / white inverse (dark) | Admin shell actions that already use this pattern |
| Danger | red-600 family | Suspend / delete |

Match the surrounding surface (dashboard vs admin) — copy an existing sibling page, do not invent a third button style.

## Feedback (errors / success)

Prefer bordered alert blocks used across create panels:

```tsx
<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
  {error}
</div>
```

```tsx
import CreateSuccessBanner from "./create-success-banner";

<CreateSuccessBanner
  message={message}
  links={[
    { href: `/dashboard/.../${createdId}`, label: "Voir la fiche" },
    { href: "/dashboard/...", label: "Retour à la liste" }
  ]}
/>
```

Avoid bare unstyled `text-red-600` paragraphs as the only error treatment on forms.

## Create / upload success UX

For **create** and **upload** flows (new property, unit, tenant, owner, expense, document, prestataire, etc.):

1. **Stay on the create page** — do not auto-redirect after success.
2. **Clear the form** so the user can add another immediately.
3. **Show a green success banner** via `CreateSuccessBanner` with a short confirmation message.
4. **Optional links** in the banner (not forced navigation): e.g. “Voir la fiche”, “Retour à la liste”, “Assigner des biens”, “Lancer un emménagement”.
5. **Exception — onboarding / guided wizards:** keep the existing continue redirect (e.g. first property → `/onboarding`, first tenant → lease move-in). Edit flows may still navigate to the detail page after save.

Reuse `CreateSuccessBanner` instead of inventing a one-off green alert + links block.

Already aligned examples: expense create, document upload panels, admin prestataire create, property/unit/tenant/owner create (non-onboarding).

## Layout and tables

- Page shell: title + short subtitle, then filters, then content.
- Tables: `rounded-xl border border-slate-200 bg-white` (+ dark variants on admin).
- List pages stay **list-only**; create/edit live on nested routes (see tenants / Prestataires).
- Landlord Prestataires uses nested routes under `/dashboard/prestataires` with an **in-page** subnav (Par bien / Catalogue / Mes prestataires) — do not add nested sidebar items for this.
- Reuse shared inputs (`CitySelect`, `PhoneInput`, etc.) instead of one-off controls.

## Language and copy

- French-first UI labels ([brand.md](./brand.md)).
- Keep trust/status vocabulary consistent where a feature already defined it.

## Checklist before shipping UI

1. `loading.tsx` present for new dashboard/admin list routes that fetch server data.
2. Mutations show `UniversalLoadingState` overlay (or compact loader for tiny panels).
3. Primary/danger buttons match sibling screens in the same shell.
4. Errors/success use the shared alert pattern; create/upload success stays on page, clears fields, and uses `CreateSuccessBanner` with optional links (except onboarding continue redirects).
5. No new loader/spinner component without an explicit product decision.
