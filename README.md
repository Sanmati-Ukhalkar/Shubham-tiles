# Mahesh Cement Articles website

A mobile-first website for interlocking parking blocks, with:

- a **3D scroll hero**: blocks lay out, one block lifts up, then the field reassembles in a new pattern
- product, patterns, "where we work" and contact sections, in **English and मराठी**
- a **design tool**:
  1. draw the area (rectangle, L-shape, free draw on a 1 ft grid, or trace over a plan photo)
  2. choose a layout and up to 3 colours, or paint single blocks
  3. see it in **3D** (factory, petrol pump, society or shop setting, with day/night)
  4. get an **estimate** (area, blocks per colour, cost), then send it on **WhatsApp** or download a PDF or image

## Run it

```bash
npm install
npm run dev
```

## Change business details

Everything lives in **`src/config.ts`**:

- `BRAND.whatsapp`: WhatsApp number, digits only with country code (**currently a placeholder**)
- `BLOCK.radius`: block size (0.11 m ≈ 220 mm across)
- `BLOCK.wastage`: spare blocks added to the count
- `THICKNESSES`: 60/80 mm and price per sq ft
- `COLOURS`: names and colours

Translations are in `src/i18n.tsx`. The Marathi text is a first draft and needs a native speaker's review.

## Build for hosting

```bash
npm run build
```

Upload the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, Hostinger…).
