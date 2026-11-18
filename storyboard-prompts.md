# Parking Blocks Website — Storyboard Image Prompts (for ChatGPT)

## How to use
1. Open a new ChatGPT chat.
2. **Upload a photo of your real rounded-triangle parking block first.** Image models can't guess the exact shape, so the photo matters more than anything else.
3. Paste the **Style Guide** below once. Then paste the frames one at a time.
4. If a frame comes out wrong, reply with a short correction ("blocks look square, make them rounded triangles like my photo") instead of starting over.
5. Words inside images often come out garbled. That's fine: these are storyboard frames. We'll build the real text in code.

Replace `[BRAND]` with your company name once you decide it.

---

## Style Guide (paste once at the start)

```
I'm creating a storyboard for a mobile-first website for a parking-block (concrete paver) manufacturer in Maharashtra, India. I'll ask for several images. Keep these rules consistent across all of them:

PRODUCT: Interlocking concrete parking blocks shaped like an equilateral triangle with softly rounded corners (see my uploaded photo — match it exactly). Each block interlocks with neighbours rotated 180°, forming a seamless tessellated surface. Slight chamfer on top edges, fine sand-filled joints, realistic concrete texture. Colours: natural grey, charcoal, terracotta red, sandstone yellow. NO border or edge kerb blocks, NO painted arrows, numbers or logos on the surface.

SETTING: Contemporary India (Maharashtra) — petrol pumps, factories, housing societies, small businesses. Realistic Indian cars and two-wheelers, Indian architecture and greenery, warm sunlight.

LOOK: Premium, clean, modern. Photoreal 3D render quality, soft shadows, cinematic lighting. UI screens are minimal: off-white or deep charcoal backgrounds, one accent colour (warm orange), rounded cards, lots of empty space, simple sans-serif type. Not cluttered.

FORMAT: Unless I say otherwise, show the design inside a modern smartphone mockup (portrait 9:16) on a neutral background.
```

---

## Frame 1 — Opening scene (3D scroll hero)

```
Frame 1: Website opening screen on a smartphone. Full-bleed photoreal aerial view at golden hour of a newly finished parking area at a modern Indian petrol pump, paved entirely with the rounded-triangle parking blocks in a two-colour pattern (grey with charcoal). A few cars parked, long soft shadows. Top: small [BRAND] logo and a menu icon. Bottom: a short bold headline "Built to Carry. Designed by You." and a small "Scroll" hint with a down arrow. Cinematic, premium, calm.
```

## Frame 2 — Scroll: the camera dives in (block hero)

```
Frame 2: Same website, the user has scrolled. The camera has zoomed down from the aerial view to ground level. One single rounded-triangle parking block floats and slowly rotates in the centre, hero-lit like a product shot, with the paved parking area softly blurred behind it. Thin minimal callout lines point to: "Rounded edges", "High-strength concrete", "Interlocking fit". Smartphone mockup.
```

## Frame 3 — Scroll: blocks assemble

```
Frame 3: Next scroll moment. Dozens of rounded-triangle blocks are flying in from above and snapping together into a perfect interlocking surface, half finished, with a few blocks mid-air. Clean dark charcoal background, dramatic top light. Small caption: "Every block. Perfectly placed." Smartphone mockup.
```

## Frame 4 — Our work (installed projects)

```
Frame 4: Website section titled "Our Work". Vertical stack of four rounded photo cards, each a realistic photo of a finished parking area paved with the rounded-triangle blocks: 1) petrol pump forecourt, 2) factory loading yard with a truck, 3) housing society parking with cars and two-wheelers, 4) a small shop front. Each card has a one-line label and location (e.g. "Housing Society · Pune"). Off-white background, minimal. Smartphone mockup.
```

## Frame 5 — Explore colours & patterns

```
Frame 5: Website section "Explore Patterns". A horizontally swipeable row of square tiles, each a top-down close-up of the rounded-triangle blocks in a different colour combination (all grey; grey + charcoal stripes; terracotta + sandstone; three-colour mix). Below, four round colour swatches. A prominent orange button: "Design Your Own". Smartphone mockup, clean UI.
```

## Frame 6 — Designer step 1: draw your area

```
Frame 6: The design tool, step 1 of 3, "Draw your area". A top-down grid canvas on the phone screen. The user's finger is tracing an L-shaped plot outline; edge lengths are labelled in feet (e.g. 40 ft, 25 ft, 15 ft). Small toolbar at the bottom: "Draw", "Rectangle", "Upload plan photo", "Undo". A progress indicator showing 3 steps. Minimal, white UI with orange accent. Smartphone mockup.
```

## Frame 7 — Designer step 2: choose layout & colours

```
Frame 7: The design tool, step 2 of 3, "Choose pattern". The L-shaped plot from before is now filled top-down with the rounded-triangle blocks laid out precisely; along the outer edges some blocks are neatly cut to fit the boundary. The pattern mixes two colours. Bottom sheet panel with: a row of ready-made layout thumbnails, a row of colour swatches, and a "paint" brush icon for colouring individual blocks. Clean UI. Smartphone mockup.
```

## Frame 8 — Designer step 3: 3D virtual preview

```
Frame 8: The design tool, step 3 of 3, "See it in 3D". Photoreal 3D virtual environment showing the user's exact L-shaped parking area, paved with their chosen two-colour rounded-triangle pattern, beside a modern Indian factory building, with two cars and a scooter parked. Small floating controls: "Rotate", "Day / Night" toggle, and a chip to switch scene ("Factory", "Petrol Pump", "Society", "Shop"). Smartphone mockup.
```

## Frame 9 — Quantity, cost & WhatsApp

```
Frame 9: Summary screen "Your Design". Top: a small thumbnail of the 3D preview. A clean card listing: Area — 1,450 sq ft; Blocks needed — 4,820 (incl. 5% wastage); Colours — Grey 3,100 · Charcoal 1,720; Estimated cost — ₹ 1,23,000 (approx.). Two buttons at the bottom: a large green WhatsApp button "Send on WhatsApp", and a secondary outline button "Download PDF". Language toggle "EN | मराठी" in the top corner. Smartphone mockup.
```

## Frame 10 — Desktop version of the opening

```
Frame 10: Same website on a desktop browser (16:9 laptop mockup). Full-width cinematic hero: low-angle photoreal shot across a large housing-society parking paved with the rounded-triangle blocks at sunset, cars parked, trees and apartment buildings behind. Left side: [BRAND] logo, headline "Built to Carry. Designed by You.", short sub-line, and an orange "Design Your Parking" button. Top navigation: Home, Products, Our Work, Design Tool, Contact. A floating green WhatsApp button bottom-right. Premium and minimal.
```

---

## After the images: turning them into a "3D scroll" website

The trending "3D scrollable" sites made with Claude + Higgsfield usually work like this:

1. **Keyframe images** (frames 1–3 above) are made in ChatGPT or Higgsfield.
2. **Higgsfield animates them into a short video** (aerial → dive in → blocks assembling).
3. **The website plays that video frame by frame as you scroll.** That's the 3D feel, and it runs smoothly on phones.

The **design tool and 3D preview** (frames 6–8) are built separately with real 3D code (Three.js). Blocks are placed mathematically to your exact block size and the customer's plot size, and the quantity and cost come out exact. AI images or video can't do this part accurately.
