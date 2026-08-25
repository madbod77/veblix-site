# Velira — brand and web direction

Status: approved by owner references supplied on 2026-08-20.

## Big idea

Velira keeps the line between a business and its next client open. The red telephone cable is the recurring metaphor: a site explains, a Telegram bot answers, and automation carries the request to the team.

## Visual system

- Paper: `#F4E8C5` — the dominant page field.
- Navy: `#303647` — headings, navigation and readable body copy.
- Teal: `#668C8F` — secondary labels only; never for small low-contrast copy.
- Signal red: `#C80D0A` — cable, CTA and active states; keep it scarce.
- Peach: `#E8C3A8` — offset display shadow and quiet surfaces.
- Ink: `#101114`; cream-white: `#FFF9EA`.
- Type: Onest, with a wide weight range and full Cyrillic support.
- Grid: 12 columns on desktop, four columns on mobile, oversized editorial type and generous negative space.

## Signature assets and motion

- Hero object: the approved glossy red rotary telephone in `assets/img/velira-phone-hero.jpg`.
- Logo source of truth: the owner-supplied original in `brand/velira-logo-original.jpg`. Do not redraw, reshape or reinterpret it; responsive use may only crop/scale the original presentation.
- A single SVG signal line travels through the narrative and draws with scroll. One focused route scene may echo that signal to explain `site → bot → team`; avoid parallel decorative motion systems.
- Reveals use masks, opacity and transforms only. Hover feedback stays within 160–260 ms.
- No scroll hijacking, no generic gradients, no stock icons and no decorative WebGL.
- `prefers-reduced-motion` receives the complete static story, with all content visible.

## Narrative

The homepage is deliberately conversion-first. A visitor should understand the offer before seeing proof or process detail.

1. Hero — do not lose clients after the click.
2. One route — the site explains, the bot responds, the system delivers the lead to the team.
3. Contact — diagnose the real break before selling a full stack.
4. Supporting detail — a concise three-step process.
5. Proof at the end — exactly three selected works, without invented metrics.
6. Final CTA and footer.

Do not reintroduce separate problem cards, a manifesto, a moving services marquee or three long service demos on the homepage. Their ideas are already expressed by the hero and route scene; deeper examples belong on focused pages.

## Runtime rules

- Static semantic HTML/CSS/JS; no framework or motion dependency.
- Production lead delivery remains server-side through `/.netlify/functions/submit-lead`.
- Local preview never sends a real lead.
- Responsive QA targets: 360×800, 390×844, 768×1024, 932×430, 1440×900.
- Public deploy, DNS and external messages require separate owner approval.
