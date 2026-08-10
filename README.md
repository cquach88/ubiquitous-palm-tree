# Bài Tứ Sắc

A browser-playable implementation of **Tứ Sắc** (Four-Color Cards), the Vietnamese
melding card game — you against three AI opponents, with a fully portable rules
engine designed to be reused on iOS and Android.

The UI defaults to **English** (toggle to Tiếng Việt in the header); cards always
show their Chinese character and Vietnamese name, with the suit as the card's
background color. A built-in **tutorial** teaches the rules and can start a
practice game with per-turn hints from a coach.

![Gameplay screenshot](docs/screenshot.png)

## Play it

Deployed via GitHub Pages (see below):
**https://cquach88.github.io/ubiquitous-palm-tree/**

Or run locally:

```bash
npm install
npm run dev        # local dev server with hot reload
```

or build a static bundle you can host anywhere (GitHub Pages, Netlify, S3…):

```bash
npm run build      # outputs dist/ — plain static files, relative paths
npm run preview    # serve the production build locally
```

The UI works with mouse or touch and is responsive down to phone-sized screens.
Session scores, language, and hint preferences persist in `localStorage`.

## Tutorial mode

The **Tutorial** button (auto-opened on first visit) walks through the deck, the
valid groups, the turn flow, and scoring with rendered example cards — in either
language. Its last step starts a **practice game with hints on**: every turn the
coach highlights a suggested move (discard, capture, or pass) and explains it in
one line. Hints can be toggled any time with the 🎓 button.

![Tutorial screenshot](docs/tutorial.png)

## The game

The deck has **112 cards**: 7 ranks (Tướng 將, Sĩ 士, Tượng 象, Xe 車, Pháo 砲,
Mã 馬, Tốt 卒) × 4 colors (đỏ/red, xanh/green, vàng/yellow, trắng/white) × 4
copies. The dealer gets 21 cards, everyone else 20. The goal is to arrange your
entire hand into valid groups ("bộ"):

| Group | Cards |
| --- | --- |
| Đôi / ba / quằn | 2 / 3 / 4 identical cards (same rank **and** color) |
| Tướng-Sĩ-Tượng | one of each, same color |
| Xe-Pháo-Mã | one of each, same color |
| Tốt khác màu | 3 or 4 pawns, all different colors |
| Tướng lẻ | a lone General stands on its own |

Each turn a card is on offer (the previous discard, or a card flipped from the
wall). You may **capture it ("ăn")** into a face-up meld of 3+ cards and then
discard, or pass. The first player whose full hand is completed by an offered
card **wins ("tới")** — the engine detects this automatically for every seat.
If the wall runs out, the round is a draw.

Scoring uses a common **lệnh** table (pair 0 · run / 3 pawns / lone general 1 ·
4 pawns 4 · concealed triple "khạp" 6 / exposed 1 · quad "quằn" 8 concealed /
6 exposed · +3 for winning); each loser pays the winner the full lệnh count.

### Simplifications vs. traditional table rules

To keep play flowing in a single-device, turn-based UI, a few traditional
priority rules are simplified (all rule logic lives in `src/core`, so tightening
these is localized work):

- Forced captures (phải ăn đôi/khạp) are not enforced — capturing is always the
  player's choice, except that winning claims resolve automatically.
- A flipped wall card that the flipper declines is offered to the next player
  only, rather than being contested by all seats (winning claims *are* checked
  for all four seats on every offered card).
- Khạp/quằn declarations are implicit: concealed sets simply score their full
  value at the end.

## Architecture — built to be ported

```
src/
├── core/          ← pure TypeScript, ZERO platform dependencies
│   ├── types.ts   cards, colors, ranks, deck, display metadata
│   ├── rng.ts     seeded PRNG (games are reproducible from a seed)
│   ├── melds.ts   meld validity, hand decomposition, capture options
│   ├── scoring.ts lệnh scoring + best-scoring decomposition
│   ├── engine.ts  the game state machine (pure reducer)
│   ├── ai.ts      heuristic AI (leftover-count minimization)
│   └── index.ts   public API surface
└── web/           ← thin browser layer (DOM + CSS only)
    ├── main.ts    renders GameState, dispatches Actions, paces the AI
    ├── cards.ts   card face rendering
    ├── i18n.ts    UI strings (English default, Vietnamese toggle)
    ├── tutorial.ts illustrated rule walkthrough
    └── style.css
```

The core is a **pure reducer**: `newGame({seed})` produces a `GameState`, and
`applyAction(state, action)` returns the next state without mutating the input.
There are no timers, no randomness outside the seeded deal, no DOM, no Node
APIs — `src/core` compiles anywhere TypeScript runs. The engine's game log is a
list of structured events (not strings), so each UI localizes them however it
likes. The entire contract between UI and rules is:

```ts
let state = newGame({ seed });
render(state);                          // draw whatever you like
state = applyAction(state, action);     // discard / eat / pass
const options = legalEats(state);       // what the responder may capture
const bot = aiChooseAction(state);      // let the AI move
```

The web layer (`src/web`) is ~400 lines that render state to HTML and translate
clicks into actions. That's the only part you replace per platform.

## Porting to iOS / Android

Two natural paths, in increasing order of effort:

1. **Capacitor (fastest)** — the production build is a self-contained static
   bundle with relative paths and touch-friendly, responsive UI, so it wraps
   directly:

   ```bash
   npm i -D @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
   npx cap init "Tu Sac" com.example.tusac --web-dir dist
   npm run build && npx cap add ios && npx cap add android && npx cap sync
   ```

2. **React Native / native UI** — publish `src/core` as a package (it has no
   dependencies; point `package.json` `exports` at it or copy the folder) and
   write native screens that render `GameState` and dispatch `Action`s. Game
   logic, AI, and scoring come along unchanged, and the vitest suite keeps
   guarding them. The same core would also drop into a server for online
   multiplayer, since games are deterministic given a seed and action list.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds, tests, and publishes `dist/` to GitHub
Pages on every push to `main` (and to the development branch), or on demand via
*Actions → Deploy to GitHub Pages → Run workflow*. The site URL is
`https://<owner>.github.io/ubiquitous-palm-tree/`.

Notes:

- If the first run fails at the *configure-pages* step, enable Pages once by
  hand: **Settings → Pages → Source: GitHub Actions**, then re-run.
- GitHub Pages on a **private** repository requires a paid GitHub plan; on a
  free plan, make the repository public to publish.

## Development

```bash
npm test           # 28 unit + property tests, incl. 200 full simulated games
npm run typecheck  # strict TS, no emit
```

The simulation test (`src/core/sim.test.ts`) plays 200 seeded AI-vs-AI games to
completion, asserting card-conservation and hand-size invariants at every step
and validating every winning hand — a good safety net when experimenting with
rule changes.
