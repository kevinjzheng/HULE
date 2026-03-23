# 胡了 HULE — Hong Kong Mahjong

A browser-based Hong Kong Mahjong (廣東麻雀) game built with React, TypeScript, and the Web Audio API. Play as one human against three AI-controlled bots with authentic fan-based scoring, configurable house rules, and a fully animated table.

## Play Online

**https://hule.vercel.app/**

Single-player (vs bots) runs entirely in the browser. For online multiplayer with up to 4 players, open the link above, go to the **Multiplayer** tab, and share the room code with friends.

---

## What is Hong Kong Mahjong?

Hong Kong Mahjong (廣東麻雀) is the most widely played variant of mahjong, using a 144-tile set (136 numbered tiles + 8 flower/season bonus tiles). Players build a winning hand of 14 tiles through a cycle of drawing and discarding. Hands are evaluated by their **fan** value — a point multiplier system where different combinations each contribute a number of fans. Points are settled between all players after each winning hand.

Scoring reference: 
[Hong Kong Mahjong Scoring — Wikipedia](https://en.wikipedia.org/wiki/Hong_Kong_mahjong_scoring)
[Hong Kong Mahjong Scoring Guide](https://docs.google.com/document/d/1NBE6n6PjTUZTOovkKI3vujHYXhTNVJRMZgKoo4tElM4/edit?tab=t.0)

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

## Local Development

### Prerequisites

- Node.js 18 (the server uses `--experimental-specifier-resolution=node`, which is available in Node 18 and removed in Node 20+)
- npm

### Single-player only (no server required)

Install root dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Single-player mode (1 human vs 3 bots) runs entirely in the browser — no backend server needed.

### Multiplayer (WebSocket server + Vite dev server)

The multiplayer WebSocket server lives in `server/` and has its own `package.json`. Open two terminals:

**Terminal 1 — WebSocket server**
```bash
cd server
npm install
npm run dev
```

The server starts on port 8080. You should see:
```
[server] HULE WebSocket server listening on ws://0.0.0.0:8080
```

**Terminal 2 — Vite dev server (from repo root)**
```bash
npm run dev
```

Vite proxies `/ws` and `/tts` requests to `localhost:8080` automatically (configured in `vite.config.ts`), so the frontend connects to the backend without any additional configuration.

Open `http://localhost:5173` in multiple browser tabs to test multiplayer:

1. Tab 1: **Multiplayer → Create Room** — note the 6-character room code
2. Tabs 2–4: **Multiplayer → Join Room** — enter the code and a unique player name
3. Tab 1: press **Start Game** once all players have joined

To test with fewer than 4 humans, start the game early — empty seats are filled by bots automatically.

### Cantonese TTS (optional)

The game uses Google Cloud Text-to-Speech for Cantonese action announcements (吃, 碰, 槓, 花, 胡牌). This requires an API key and the backend server to be running.

**Without a key:** the game falls back to the browser's Web Speech API (any installed Chinese voice, or English phonetics). All audio still works — only the TTS quality differs.

**To enable Google Cloud TTS locally:**

1. Create a Google Cloud project and enable the [Cloud Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)
2. Create an API key (or a service account with the Text-to-Speech User role)
3. Set the environment variable before starting the server:

```bash
# Using an API key
GOOGLE_CLOUD_TTS_API_KEY=your_key_here npm run dev

# Or using a service account credentials file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npm run dev
```

When the key is valid, the server pre-caches all five game terms at startup:
```
[tts] Google Cloud TTS client initialised
[tts] Pre-cached 5/5 terms
```

### Running tests

```bash
npm test
```

Runs the Jest test suite covering win conditions and fan scoring. Tests are in `src/rulesets/hongkong/__tests__/`.

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
