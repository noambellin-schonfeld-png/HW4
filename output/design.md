# Design — "Bulldog Blue & Silver" storefront

The goal: make the site feel like walking into a Yale spirit shop on Broadway (pennants on the wall, a mascot at the door, gear displayed like trophies) instead of a generic product grid. Screenshots are in `output/screenshots/`.

## What changed, and why it helps people stay and buy

**1. Yale blue + metallic silver everywhere.** A Yale-blue (`#00356b`) gradient nav and hero, set against brushed-silver gradients for buttons, frames, the scrolling ticker, plaques and pennant rails, plus a single bright blue (`#286dc0`) for links and highlights.
*Why:* the school colors make it feel official and giftable at first glance. The silver adds a premium, keepsake feel that supports $58–$98 prices.

**2. Bold varsity typography.** *Graduate* (a collegiate block-letter font) for the brand, headlines, prices and size buttons; *Oswald* (bold condensed caps) for nav, labels and product names; *Inter* for readable body text.
*Why:* the type itself looks like the lettering on the merchandise, and the clear sizes (huge headline → caps label → body) make pages fast to scan.

**3. Bulldogs everywhere.** All original SVG artwork drawn for this site, no stock photos:
- a sitting mascot in a chenille "Y" sweater on a silver plinth in the hero,
- a bulldog-head logo in the nav,
- peeking bulldogs on the Products header, login cards and the About plaque,
- a sitting bulldog in the footer,
- a sad bulldog with a tear on the 404 page and empty search results.

Plus **"The Bulldog Wall"** on Home: every real product with a bulldog graphic (10 in the catalogue).
*Why:* the mascot gives the brand a friendly face and personality, and it leads straight into the bulldog products people actually came to buy.

**4. Products presented "in regalia."**
- **Cards:** each product sits in a silver frame on a spotlit backdrop with a faint varsity "Y" watermark. It has an embroidered-style category patch, a blue price ribbon folded over the frame edge, and a silver shine that sweeps across on hover.
- **Product page:** the item is shown in a **trophy display case**: a silver bevel, blue felt, a white mat, and a **crest-shaped silver price seal**, with a "Hoodies ★ Campus Customs" plaque underneath.
- **Sizes:** shown as varsity number tabs.

*Why:* presentation signals value. Showing a $68 hoodie like a trophy makes it feel worth $68 and makes the price easy to find.

**5. Motion with a purpose.**
- A silver "Boola Boola ★ 57 Broadway ★ …" ticker.
- The hero headline rises in, and the mascot gently bobs.
- Pennant category flags hang from a silver rail and sway on hover.
- Sections and cards fade up as you scroll.
- Cards lift and tilt, and the price seal stamps in.

All of it turns off for shoppers who set "reduce motion".
*Why:* small moments of delight keep people scrolling and clicking, and the pennants make categories one tap away.

**6. A chat that feels like talking to the mascot.**
- The button is a bulldog face with "Ask the Bulldog" that tilts its head now and then, and shows a red dot when a reply arrives while the chat is closed.
- The panel has a bulldog avatar with a green online dot, a varsity title and a silver border, and it springs open from the corner.
- While waiting, three **paw prints** step in sequence ("sniffing the shelves").
- Replies **type themselves out** in under a second with a blinking caret, and product cards and the ✓ fact-check badge appear only once the text is done.
- The input grows as you type, sends with Enter, and uses a round blue send button.
- Product pages have an **"Ask the Bulldog about this"** button that opens the chat and asks about that item.

*Why:* a smooth, personable chat makes people ask more questions. Every question answered with live stock is a step closer to a sale.

**7. Small trust and wayfinding touches.**
- Big "102 styles · XS–XXL · Live stock" facts in the hero.
- Pennant counts ("25 styles").
- A silver "In stock in" size bar on Products.
- A footer with paw-print links and a clear note that this is a class project, not affiliated with Yale.

*Why:* shoppers know right away what's available and that the stock numbers are real.

## Where it lives

- `frontend/src/index.css`: the full theme (colors, fonts, regalia cards, display case, pennants, chat, motion, reduced-motion rules).
- `components/Bulldog.tsx`: the mascot (sitting, head and peek poses, plus happy and sad moods) and the paw icon.
- `Pennant.tsx`, `Ticker.tsx`, `Reveal.tsx` (scroll-in effect), `Typewriter.tsx` (typing replies), `chatBus.ts` ("Ask the Bulldog about this").
- Fonts are loaded from Google Fonts in `index.html`.
