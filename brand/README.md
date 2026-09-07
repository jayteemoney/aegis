# Brand assets

The mark is a **shield** — *aegis* is the shield of Zeus — split down the middle
into the project's two halves: **amber for what stays private, blue for what
reaches the public ledger.** That is the same pairing the interface uses on
every screen, with no exceptions, so the logo teaches the design system before a
word is read.

The diamond is *cut out* of the shield rather than drawn on top, which keeps the
split legible down to 16px. It is the `◈` used as the brand mark in the app.

| File | Use |
|---|---|
| `aegis-icon.svg` | Source. Square, dark ground, rounded corners |
| `aegis-icon-{512,256,128,64,32}.png` | Rasterised icons — **512 is the one to upload** |
| `aegis-icon-transparent.svg` / `-512-transparent.png` | For surfaces that supply their own background |
| `aegis-wordmark-dark.{svg,png}` | Lockup for dark backgrounds — decks, README |
| `aegis-wordmark-light.{svg,png}` | Lockup for light backgrounds |
| `aegis-og.{svg,png}` | 1200×630 social preview |

Palette, from `ui/src/styles.css`:

| Token | Hex | Means |
|---|---|---|
| `--private` | `#f0b429` | Never leaves the device |
| `--public` | `#4c9fff` | On the ledger, visible to everyone |
| `--bg` | `#080b10` | Ground |
| `--text` | `#e8eef6` | Primary text |
| `--muted` | `#8695a8` | Secondary text |

Regenerate the PNGs from source with [`rsvg-convert`](https://wiki.gnome.org/Projects/LibRsvg):

```bash
cd brand
for s in 512 256 128 64 32; do rsvg-convert -w $s -h $s aegis-icon.svg -o "aegis-icon-${s}.png"; done
```
