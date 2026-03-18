# Mahjong Tile Assets — Final Clean Version

## Tile specifications
- **Format**: RGBA PNG with transparent rounded corners (radius 12 px)
- **Size**: 128 × 182 px (all 45 tiles)
- **Edges**: every visible edge pixel is pure cream ivory (251,243,218);
  blank_jade uses jade green edges (72,140,100)
- **Corners**: anti-aliased transparent rounded corners (4× supersampled mask)

## File structure (45 tiles)

| Folder    | Files                        | Suit / Category                   |
|-----------|------------------------------|-----------------------------------|
| man/      | man1 – man9                  | Characters 萬字                   |
| bamboo/   | bamboo1 – bamboo9            | Bamboo 索子                       |
| circle/   | circle1 – circle9            | Circles / Dots 筒子               |
| honor/    | wind_east, wind_south, wind_west, wind_north | Wind tiles 風牌  |
| honor/    | dragon_red (中), dragon_green (發), dragon_white (白板) | Dragons |
| flower/   | flower1 – flower4            | 梅 蘭 菊 竹 (numbered 1–4)       |
| season/   | season1 – season4            | 春 夏 秋 冬 (numbered 1–4)       |
| special/  | back, blank, blank_jade      | Tile back · ivory blank · jade blank |

## Flower & Season tile layout
Each bonus tile shows: number corner · CJK character · divider · illustrated icon · label
- flower1 梅 Plum        → plum blossom (teal)
- flower2 蘭 Orchid      → orchid (teal)
- flower3 菊 Chrysanthemum → radiating chrysanthemum (gold)
- flower4 竹 Bamboo      → bamboo stalks with leaves (teal)
- season1 春 Spring      → cherry blossom branch (red)
- season2 夏 Summer      → lotus flower (teal)
- season3 秋 Autumn      → maple leaf (gold)
- season4 冬 Winter      → snowflake (teal)

## Number label colours
- 1–2: red (180, 60, 60) · 3–4: green (60, 110, 70)

## Usage

```html
<img src="mahjong_tiles/man/man1.png" alt="1 Man" width="64">
```

```css
.tile {
  width: 64px; height: auto;
  filter: drop-shadow(2px 3px 4px rgba(0,0,0,0.35));
  transition: transform 0.15s ease, filter 0.15s ease;
  cursor: pointer;
}
.tile:hover   { transform: translateY(-4px) scale(1.06);
                filter: drop-shadow(3px 6px 8px rgba(0,0,0,0.45)); }
.tile.selected { filter: drop-shadow(0 0 6px rgba(255,200,50,0.9));
                 transform: translateY(-6px); }
```

```js
const SUITS  = { man:9, bamboo:9, circle:9 };
const HONORS = ['wind_east','wind_south','wind_west','wind_north',
                'dragon_red','dragon_green','dragon_white'];
const BONUS  = [...Array(4)].flatMap((_,i) => [`flower${i+1}`,`season${i+1}`]);
const SPECIAL = ['back','blank','blank_jade'];

function tileImg(folder, name) {
  const img = document.createElement('img');
  img.src = `mahjong_tiles/${folder}/${name}.png`;
  img.className = 'tile';
  return img;
}
```

## Technical notes
- Extracted tiles: cropped from original stock image. A per-edge cream scan detects
  where the genuine tile face begins and paints only that zone cream, preserving all
  artwork right up to the natural boundary.
- Flower/season tiles: rendered at 4× resolution using Noto Serif CJK Bold, with
  programmatic icons, then LANCZOS downsampled. A single-pixel edge repaint ensures
  no sub-pixel bleed on any visible edge.
- blank_jade: jade green (72,140,100) rounded tile matching traditional mahjong
  back-of-tile color, with decorative inner border and subtle cross motif.
