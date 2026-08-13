# Interface baseline

`collect` is a mobile-first field application. The user interface prioritizes clarity, legibility in bright sunlight, large touch targets, and strict accessibility.

---

## Design principles

1. **Focused hierarchy**: The primary action is always visually dominant and easy to reach with one hand.
2. **Monochrome contrast**: Contributor views use high-contrast light monochrome; administrator views use dark monochrome.
3. **Generous touch targets**: All interactive elements have at least a $44\times44\text{ pt}$ hit area ($52\text{ pt}$ for primary mobile actions).
4. **Text-based state**: Status is conveyed with clear words and shapes, never by color alone.
5. **Progressive disclosure**: Secondary technical details stay collapsed in expandable disclosure sections.
6. **Calm background systems**: Background sync, telemetry, and health probes stay quiet unless an error requires human action.

---

## Mobile keyboard integration

The software keyboard is part of the mobile viewport, not an obstruction:

- The app tracks viewport resizing using `visualViewport` events.
- Primary action buttons remain positioned above the active keyboard.
- Users can tap **Skip** or **Continue** without dismissing the keyboard.
- Empty optional fields never autofocus or trigger unwanted keyboard popups.

---

## Guided capture flow

The collector presents questions one field at a time:

- **Single-choice & dates**: May advance automatically upon selection.
- **Text, numbers, & media**: Wait for explicit user confirmation (**Continue**).
- **Required fields**: Block advancement until answered, showing an inline explanation.
- **Optional fields**: Display a clear **Skip** button.
- **Pause & Resume**: Tapping **Home** saves the draft in IndexedDB. Users can resume later or discard with confirmation.

---

## Design tokens and color system

| Token                  | Contributor theme       | Administrator theme       |
| :--------------------- | :---------------------- | :------------------------ |
| **Canvas**             | `#f5f5f7` (light gray)  | `#000000` (deep black)    |
| **Paper / Card**       | `#ffffff` (pure white)  | `#1c1c1e` (elevated dark) |
| **Primary Text**       | `#1d1d1f` (near black)  | `#f5f5f7` (near white)    |
| **Secondary Text**     | `#636366`               | `#aeaeb2`                 |
| **Tertiary Text**      | `#707075`               | `#8e8e93`                 |
| **Accent Action**      | `#000000` (solid black) | `#ffffff` (solid white)   |
| **Accent Text**        | `#ffffff` (white)       | `#000000` (black)         |
| **Destructive Action** | Semantic red            | Semantic red              |

---

## Typography and spacing

- **Font family**: System native stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Scale roles**:
  - Title: $24\text{ pt}$ / Semi-bold
  - Headline: $20\text{ pt}$ / Semi-bold
  - Body: $17\text{ pt}$ / Regular ($1.4$ line height)
  - Subheadline: $15\text{ pt}$ / Regular
  - Footnote / Caption: $13\text{ pt}$ – $12\text{ pt}$
- **Spacing scale**: Strict 4-point grid (`4, 8, 12, 16, 20, 24, 32, 40, 48px`).

---

## Accessibility requirements

1. **Screen readers**: Every button, input, and icon includes explicit accessible labels (`aria-label` or `<label>`).
2. **Keyboard navigation**: Logical tab order across all views; focus traps inside modal sheets and dialogs.
3. **High contrast**: Meets WCAG 2.1 AA ($4.5:1$ text contrast ratio).
4. **Reduced motion**: Respects `prefers-reduced-motion` by disabling transitions and animations.

---

## Related documentation

- [User and system flows](flows.md)
- [Privacy and data handling](privacy.md)
- [Architecture](architecture.md)
- [Contributing](../CONTRIBUTING.md)
