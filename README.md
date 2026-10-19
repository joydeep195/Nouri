# Nouri

*Know what's good before you bite.*

Nouri is a mobile web app (an installable PWA, so no App Store needed). Scan a packaged food and it tells you whether it's a good choice, with a score out of 100 and plain-English reasons.

It was built for someone living with suspected Crohn's / IBD who is also trying to lose weight. Every food is judged on three things:

| Pillar | What it looks at |
|---|---|
| **Overall health** | How processed it is (NOVA), additives, salt, saturated/trans fat, fibre |
| **Gut comfort** | Ingredients linked to IBD symptoms: carrageenan, polysorbate 80, CMC, maltodextrin, sugar alcohols, artificial sweeteners, FODMAPs (onion, garlic, inulin, beans…), fizz, caffeine, alcohol, processed meat, plus personal sensitivities |
| **Weight goals** | Calories, sugar (especially in drinks), fat, and whether it will keep you full (protein, fibre) |

The overall score leans towards the weakest pillar, so a food can't hide one big problem behind good numbers. Anything marked as a personal trigger is always **Best avoided**.

## Features

- **Barcode & QR scanning** with the phone camera (EAN-13/8, UPC-A/E, and GS1 "Digital Link" QR codes). There's a photo fallback when live camera access isn't available.
- **No barcode? Read the label.** Snap the ingredients and the text is read on the phone itself (Tesseract.js). Nutrition values are pre-filled when the table is in the photo.
- **Type or paste** an ingredient list, with optional nutrition per 100 g.
- **Understands Indian labels**: INS numbers, "Emulsifier (471)", maida, atta, besan, paneer, etc.
- **Personal profile**: weight-loss goal, flare mode, low-FODMAP, dairy/lactose, gluten, spicy food, caffeine, and custom trigger foods.
- **History** of everything scanned, re-scored automatically when the profile changes.
- Works offline once installed (except product lookups, which need the internet). Light and dark mode.
- **Private**: the profile and history stay on the phone. Only barcode numbers are sent, to [Open Food Facts](https://world.openfoodfacts.org).

## Run it on your computer

```bash
npm install
npm run dev
```

Open the address it prints. To use the camera on a phone, the app must be served over **https** (see below). On `http://` the camera is blocked, but typing ingredients and barcode numbers still works.

```bash
npm test         # scoring engine tests
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

## Put it on her iPhone (free)

1. Build it: `npm run build`. This creates a `dist` folder.
2. Host the `dist` folder on any free static host with https. The easiest options:
   - **Netlify Drop**: go to <https://app.netlify.com/drop> and drag the `dist` folder onto the page. Sign in (free) so the site stays up permanently. You get a link like `https://nouri-xyz.netlify.app`.
   - **Vercel**, **Cloudflare Pages** or **GitHub Pages** work too. The app uses relative paths, so a sub-folder URL is fine.
3. On the iPhone, open the link in **Safari**, tap **Share**, then **Add to Home Screen**.
4. Open Nouri from the home screen and allow camera access when asked.

Updates: rebuild and re-upload `dist`. Installed copies update themselves the next time they're opened.

## Project layout

```
src/
  config.js            App name, tagline, version (rename the app here)
  lib/
    rules.js           Ingredient rules: what's flagged, why, and how much it matters
    score.js           Scoring engine: pillars, verdicts, nutrition thresholds
    text.js            Ingredient parsing, E/INS number detection
    labelText.js       Cleans up text read from label photos
    openfoodfacts.js   Product lookup
    barcode.js         Camera + barcode/QR detection (ZXing WebAssembly)
    ocr.js             On-device label reading
    scan.js            Barcode / QR code interpretation
    storage.js         On-device storage for profile and history
  screens/             Home, Scanner, Lookup, LabelReader, IngredientsForm, Result, History, Profile, Onboarding
  components/          Shared UI pieces
tests/                 Scoring tests with real products (Coke, Nutella, oats…)
public/icon.svg        App icon source (npm run icons regenerates the PNGs)
```

## Renaming the app

1. Change `APP_NAME` in `src/config.js`.
2. Change the `<title>` and `apple-mobile-web-app-title` in `index.html`.
3. Rename the folder.

## Disclaimer

Nouri gives general guidance based on ingredient and nutrition data. It is **not medical advice**. Everyone with IBD reacts differently. Follow the advice of her gastroenterologist or dietitian, especially during a flare. Product data comes from Open Food Facts and can be incomplete or out of date, so check the pack when it matters.
