# Instructor-Portal — MHFA Brand Colour Palette (Codex Reference)

> Source: *Mental Health First Aid Australia – Brand Guidelines 2024 (Colour Palette)*  
> Use **HEX values** for all web/UI work.

---

## Primary Colour Palette (Brand Greens + Core Neutrals)

These colours underpin the MHFA brand and **must be used consistently**.  
Green is the signature brand colour.

| Name | HEX | RGB | Usage Guidance |
|---|---|---|---|
| MHFA Dark Green | `#00573D` | 0, 87, 61 | Primary brand colour. Use for primary buttons, highlights, key accents. |
| MHFA Green | `#00AA52` | 0, 171, 83 | Secondary primary green. Use for hover states, success accents. |
| MHFA Light Green | `#B2D136` | 178, 210, 53 | Accent green. Use sparingly for emphasis, badges. |
| Black | `#000000` | 0, 0, 0 | Primary text on light backgrounds. |
| Cool Grey | `#939597` | 147, 149, 152 | Secondary text, icons, borders. |
| White | `#FFFFFF` | 255, 255, 255 | Backgrounds, reversed text. |

### Recommended UI Mapping (Tailwind / shadcn)
- `--primary`: `#00573D`
- `--primary-foreground`: `#FFFFFF`
- `--secondary`: `#00AA52`
- `--muted`: `#939597`
- `--background`: `#FFFFFF`

---

## Secondary Colour Palette (Supporting Colours)

The secondary palette supports a wide range of applications.  
Colours may be mixed across groups, provided combinations remain harmonious.

### Blues / Teals
| Name | HEX | Notes |
|---|---|---|
| Navy | `#201547` | Deep accent, headings, emphasis |
| Dark Blue | `#004C97` | Links, informational accents |
| Blue | `#0072CE` | Secondary actions, info states |
| Sky Blue | `#71C5E8` | Subtle highlights, charts |
| Teal | `#009CA6` | Informational badges |
| Aqua | `#00B2A9` | Soft accents |
| Light Aqua | `#88DBDF` | Background highlights |

### Greens / Yellows
| Name | HEX | Notes |
|---|---|---|
| Mid Green | `#78BE20` | Success states, positive indicators |
| Lime | `#CEDC00` | Highlights (use sparingly) |
| Yellow | `#F3E500` | Warnings / attention |
| Deep Green | `#00573F` | Dark accents |
| Forest Green | `#007B4B` | Alternative success |
| Bright Green | `#00B140` | Confirmation / active states |

### Oranges / Reds
| Name | HEX | Notes |
|---|---|---|
| Orange | `#E35205` | Warning / alert |
| Amber | `#E57200` | Warning hover / emphasis |
| Light Orange | `#F9E1B` | Highlight |
| Dark Red | `#8A2A2B` | Error / critical |
| Red | `#AF272F` | Error states |
| Bright Red | `#D50032` | Destructive actions |

### Purples / Pinks
| Name | HEX | Notes |
|---|---|---|
| Deep Purple | `#500778` | Accent / charts |
| Purple | `#642667` | Secondary accents |
| Bright Purple | `#87189D` | Highlights |
| Pink | `#C63663` | Accent |
| Hot Pink | `#EF4A81` | Accent |
| Soft Pink | `#E89CAE` | Background highlights |

### Greys (Accessibility)
| Name | HEX | Notes |
|---|---|---|
| Cool Grey 11 | `#53565A` | Strong secondary text |
| Cool Grey 1 | `#D9D9D6` | Subtle backgrounds, dividers |

---

## Accessibility Notes
- Refer to the **Accessible Colour Palette** in the guidelines for AA/AAA compliance when placing text over colour.
- Prefer:
  - Dark text on light backgrounds
  - White text only on sufficiently dark colours (e.g. `#00573D`, `#201547`, `#004C97`)

---

## Guidance for Codex
- Do not invent new greens or brand colours.
- Prefer MHFA greens for primary UI actions.
- Use secondary palette colours for status badges, charts, and highlights only.
- Maintain sufficient contrast for all text.
