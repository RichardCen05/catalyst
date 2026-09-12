# Catalyst design system

**Product:** Evidence-first IDX research prototype

**Slogan:** “Trace the move. Trust the evidence.”
**Direction:** Graphite Aubergine, dark by default, compact research workspace

## Palette

| Role | Light | Dark | Use |
|---|---:|---:|---|
| Background | `#F7F5FA` | `#0B0A0F` | App canvas |
| Surface | `#FFFFFF` | `#15121B` | Panels and drawers |
| Raised surface | `#F1EDF5` | `#1D1924` | Headers and selected rows |
| Foreground | `#221A29` | `#F4F0F7` | Primary text |
| Muted foreground | `#62576C` | `#ABA3B1` | Supporting text |
| Border | `#D8CEDF` | `#40364D` | Structure |
| Primary | `#6940A5` | `#C4A7FF` | Actions, links, evidence |
| Attention | `#A86100` | `#E4B65A` | Conflict and caution |
| Positive | `#08683B` | `#58C99A` | Corroborated or supported |
| Danger | `#B42334` | `#FF7A85` | Adverse or source conflict |

Color never carries meaning alone. Pair every status color with text and an icon.

## Type and density

- Fira Sans for UI copy; Fira Code for ticker, time, source field, and numeric output.
- Body copy: 14px with 1.5–1.7 line height. Labels: 10–11px, uppercase only for short metadata.
- Desktop sidebar: 224px. Main content remains fluid. Copilot is collapsible and 390px only while open.
- Use compact panels and one clear hierarchy. Technical trace belongs in Audit, not the default page.

## Product hierarchy

1. Show what changed.
2. Show the evidence state and contradiction.
3. Expose the four pillars, formulas, and linked sources on demand.
4. Keep missing evidence visible but concise.
5. Put trace, gates, and exhaustive inputs in Audit or disclosure panels.

## Interaction rules

- Minimum target size: 44px for primary controls; compact 36px controls are allowed in dense toolbars.
- Every interactive control has a visible focus ring and pointer cursor.
- Respect `prefers-reduced-motion`; no decorative entrance animation.
- Charts need tooltip, legend, keyboard focus, and an accessible data table.
- Causal chains label reported input, hypothesis, aggregation, and observed correlation. They also show confidence, lag, and counter-evidence.
- Sources open their direct provider or documentation link in a new tab. Fixture links must be labeled as simulated.

## Do not add

- Radar charts, sentiment donuts, gauges, gamification, portfolio P/L, or target prices.
- Combined attraction scores.
- Decorative gradients, sparkle/robot motifs, or generic AI copy.
- Permanent desktop Copilot rail.
- Unverified claims presented as causal facts.

## Responsive checks

- Verify 375, 768, 1024, and 1440px.
- Tables become cards or use a contained accessible scroll region.
- No page-level horizontal overflow and no fixed element covering content.
- Onboarding and Copilot use full-screen treatment on small screens.
