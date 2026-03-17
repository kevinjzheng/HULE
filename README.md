# 胡了 HULE — Hong Kong Mahjong

A browser-based Hong Kong Mahjong (廣東麻雀) game built with React, TypeScript, and the Web Audio API. Play as one human against three AI-controlled bots with authentic fan-based scoring, configurable house rules, and a fully animated table.

---

## What is Hong Kong Mahjong?

Hong Kong Mahjong (廣東麻雀) is the most widely played variant of mahjong, using a 144-tile set (136 numbered tiles + 8 flower/season bonus tiles). Players build a winning hand of 14 tiles through a cycle of drawing and discarding. Hands are evaluated by their **fan** value — a point multiplier system where different combinations each contribute a number of fans. Points are settled between all players after each winning hand.

Scoring reference: [Hong Kong Mahjong Scoring — Wikipedia](https://en.wikipedia.org/wiki/Hong_Kong_mahjong_scoring)

---

## Features

### Gameplay
- **1 human player vs. 3 bots** — play at the bottom seat (South by default); the three bots play automatically
- **Half Game** — 8 rounds (East + South prevailing winds)
- **Full Game** — 16 rounds (East, South, West, North prevailing winds)
- **Tile actions** — Pung (碰), Kong (槓), Chow (吃), and Win (胡) off any discard; Self-draw (自摸) win on your drawn tile
- **Kong replacement draw** — drawing a kong replacement pulls from the end of the wall (no dead wall), as per HK rules
- **Dealer retention** — the dealer retains the seat when they win a hand
- **Flower/Season tiles** — bonus tiles are drawn immediately and replaced; a fan is only awarded when the bonus tile's number matches the player's seat wind (e.g. Plum/Spring #1 for East seat)
- **Multiple winners** — when multiple players can win on the same discard, all eligible players collect points from the discarder simultaneously
- **Last tile awareness** — the last tile from the wall triggers Last Tile Draw (海底摸月) or Last Tile Claim (河底撈魚) fan bonuses

### House Rules (configurable before each game)
| Setting | Options | Default |
|---|---|---|
| Minimum Fan to Win | None / 1 Fan / 3 Fan | 3 Fan |
| Turn Time Limit | Off / 15s / 30s / 45s / 60s | 45s |
| Points Per Fan | 0.5 / 1 / 2 / Custom | 1 |
| Seven Pairs (七對子) | On / Off | On |
| Flowers & Seasons (花牌) | On / Off | On |
| Multiple Winners (多家胡) | On / Off | On |

**Points formula:** `Total Fan × Points Per Fan` — no base points, no lookup table.

### Recognized Winning Hands

| Hand | 番數 | Fan |
|---|---|---|
| Thirteen Orphans 十三么 | Limit | 10 |
| Nine Gates 九蓮寶燈 | Limit | 10 |
| Four Concealed Pungs 四暗刻 | Limit | 10 |
| All Honors 字一色 | Limit | 10 |
| All Terminals 么九刻 | Limit | 10 |
| Full Flush 清一色 | — | 7 |
| Seven Pairs 七對子 | — | 4 |
| All Pungs 對對胡 | — | 3 |
| Half Flush 混一色 | — | 3 |
| Mixed Terminals 混么九 | — | 2 |
| All Chows 平胡 | — | 1 |
| Self Draw 自摸 | — | 1 |
| Concealed Self Draw 門前清自摸 | — | 1 |
| All Concealed 門前清 | — | 1 |
| Dragon Pung/Kong 箭刻 | per set | 1 |
| Seat Wind Pung 門風 | — | 1 |
| Prevailing Wind Pung 圈風 | — | 1 |
| Last Tile Draw 海底摸月 | — | 1 |
| Last Tile Claim 河底撈魚 | — | 1 |
| Win on Kong 嶺上開花 | — | 1 |
| Robbing the Kong 搶槓 | — | 1 |
| Flower/Season (matching seat) 花牌 | per tile | 1 |

**Scoring payment:**
- **Discard win** — the discarder pays the winner the full point value
- **Self-draw win** — all three other players each pay equally; the dealer pays double when the dealer wins by self-draw

### UI & Visual
- **Animated shuffle sequence** — tiles scatter and collect before each deal
- **Live discard piles** — all four players' discards are displayed in the center of the table, organized by player position
- **Last discard highlight** — the most recently discarded tile is highlighted with a red ring for quick identification
- **Meld display** — declared combinations (pungs, kongs, chows) and collected bonus tiles are shown next to each player's hand
- **Cross-tile hover highlight** — hovering any tile in your hand or the discard piles highlights all matching tiles across the entire board
- **Turn timer** — a countdown bar with a pulsing red indicator and tick sounds in the final 10 seconds; auto-discards when time expires
- **Score modal** — after each hand a breakdown shows each fan scored, total points, and point transfers between all players
- **Win animation** — visual celebration effect on a winning hand
- **Game over screen** — final scoreboard after all rounds complete

### Audio
- **Draw sound** — ivory tile clack (mid-frequency click) on each tile draw
- **Discard sound** — light tile thump on each discard
- **Action sound** — distinct audio cue when a claim action becomes available (Pung, Kong, Chow, Win)
- **Tick sound** — repeating tick in the final 10 seconds of a turn timer
- **Shuffle sound** — tile shuffling noise during the shuffle animation
- **Win sound** — celebratory audio on a winning hand

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 2 (Node 14 compatible) |
| State | Zustand 4 (pure reducer pattern) |
| Styling | Tailwind CSS 3 |
| Animation | Framer Motion 10 |
| Audio | Web Audio API (oscillators + noise buffers) |
| Tile graphics | Unicode Mahjong block (🀇–🀣) |

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Project Structure

```
src/
├── components/
│   ├── board/          # GameBoard, PlayerArea, CenterArea, TurnTimer
│   ├── tiles/          # TileComponent (hover, tooltip, highlight)
│   ├── actions/        # ActionBar (Pung / Kong / Chow / Win buttons)
│   ├── scoring/        # ScoreModal
│   ├── animation/      # ShuffleAnimation, WinAnimation
│   └── screens/        # LandingScreen, GameOverScreen
├── engine/
│   ├── stateMachine.ts # Core game reducer (all game actions)
│   ├── deck.ts         # Tile deck, shuffling, dealing
│   ├── handAnalyzer.ts # Meld grouping and hand resolution
│   └── winConditions.ts
├── rulesets/
│   └── hongkong/
│       ├── scoring.ts  # Fan calculation and payment computation
│       └── winConditions.ts
├── store/
│   ├── gameStore.ts    # Zustand game store
│   └── uiStore.ts      # UI state (hover, modals, animations)
├── constants/
│   └── tiles.ts        # Tile definitions, Unicode glyphs, Chinese labels
├── types/
│   └── index.ts        # All TypeScript interfaces
└── utils/
    └── sounds.ts       # Web Audio API sound synthesis
```
