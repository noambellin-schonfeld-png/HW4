# Usability Improvements — Campus Customs Shop + Chatbot

Four improvements on top of the working shop: two on the front end (how the site looks and how easy it is to use) and two in the agent and backend (more accurate, safer, cheaper). Each section says **what** was added, **why** it helps a Campus Customs shopper or the business, and **where to see it** in the running app (http://127.0.0.1:5173).

---

## Front end 1 — Suggested questions in the chat (context-aware)

**What I added**
- A row of one-tap question chips above the chat input (`ChatWidget.tsx`, `suggestionsFor()`). Tapping one sends it immediately.
- The chips change with the page:
  - **Product page** (e.g. `/products/boola-boola-t-shirt`): "Which sizes is this in stock in?", "What colors does this come in?", "How much is this?", "Show me similar items". These rely on the Problem 8 page context, so "this" means the item on screen.
  - **Products page filtered by category** (e.g. Hoodies): "Which hoodies are in stock in M?", "What are your cheapest hoodies?", "Navy hoodies?", "Gift ideas under $50".
  - **Everywhere else**: "What hoodies do you have?", "Gift ideas under $50", "Navy crewnecks in medium", "Something for the Harvard game".

**Why it helps**
- **Shoppers:** many people open a chat box and don't know what to type, or don't realize the bot can check real stock. The chips show what it's good at and get an answer in one tap, which matters most on a phone where typing is slow.
- **Business:** more shoppers actually use the assistant. The most valuable questions (stock in my size, gift ideas, game-day gear) are steered toward answers that move people to buy.

**Where to see it:** open the chat ("💬 Chat with us", bottom right). The chips sit above the input. Open a product page and the chips switch to questions about that item.

**Verified:** on the Boola Boola T Shirt page, "Which sizes is this in stock in?" → "In stock in **XS, S, M, XL, and XXL**. It's sold out in **L**." (DB: L=0.) On the Branford page, "How much is this?" → **$72.00**.

---

## Front end 2 — "In stock in my size" filter, sort, and low-stock badges on Products

**What I added**
- **"In stock in" size chips** (Any size · XS · S · M · L · XL · XXL) on the Products page. Picking a size hides everything sold out in that size, and the heading reads "Hoodies *in stock in M*".
- **Sort menu**: Featured, Price low→high, Price high→low, Name A→Z.
- **Low-stock badges**: when a size is selected, cards with 5 or fewer left show an amber "Only 5 left in M" badge.
- Size, sort, category and search are all kept in the URL (`/products?category=Hoodies&size=M&sort=price-asc`), so a filtered view can be bookmarked or shared and survives the back button.
- Backend: `GET /api/products` gained `size` and `sort` parameters and a `stock_note` field on cards. Unknown sizes return 422.

**Why it helps**
- **Shoppers:** the biggest frustration in apparel is falling for an item and then finding your size is sold out (145 of the 612 size rows in our inventory are at 0). Filtering by size up front means everything on screen is something they can actually buy. Sorting by price helps with gift budgets.
- **Business:** fewer dead-end clicks means more of them turn into sales. "Only N left" badges add honest urgency and highlight items close to selling out.

**Where to see it:** Products page → the gray bar under the search box. Try Hoodies + **M** + **Price: low to high**: 19 hoodies, starting at $45, with "Only 5 left in M" on the Basic Hoodie Big Yale.

**Verified (API):** `?category=Hoodies&size=M&sort=price-asc` → 19 items, first $45.00, 6 with low-stock notes. `?size=xs&sort=price-desc` → 75 items starting at $98.00. `?size=XXXL` → 422 "Unknown size".

---

## Agent / backend 1 — Price and stock fact-checker (output validator)

**What I added**
- A PydanticAI **output validator** (`agent.fact_check`) that runs on every reply **before** the shopper sees it.
- Every tool now records, in the agent's deps, the prices, stock quantities and product ids it returned this turn (`tools._record`). The validator (`guards.find_unverified_numbers`) pulls every **dollar amount** and every **stock count** ("5 left", "20 in stock") out of the reply and checks each one against those tool results. Dollar amounts the shopper typed, like a "$50" budget, are allowed.
- It also checks that every `product_id` in the reply came from a tool result.
- If anything doesn't match, the validator raises `ModelRetry` with a precise correction ("Your reply quotes $59.99, which no tool returned this turn. Look it up and quote price_usd exactly"), and the agent fixes the reply (up to 2 retries). If it's still wrong after that, the reply is **replaced** with a safe message pointing to the live product cards, so an unverified number never reaches the shopper.
- Replies that passed show a small green badge in the chat: **"✓ 4 prices checked against live inventory"**, plus "(auto-corrected)" when a retry fixed something.

**Why it helps**
- **Shoppers:** they can trust a price or "only 3 left" from the bot, and the badge shows they can.
- **Business:** a chatbot that quotes the wrong price creates angry customers at the register and possible pricing disputes. The prompt already said "only quote tool results", but a prompt is a request; this is **enforced in code**. It also catches the model reusing a stale number from an earlier message in the saved history.

**Where to see it:** ask the chat "Gift ideas under $50" or "How much is the Branford 1 4 Zip?". The green ✓ line appears under the answer.

**Verified**
- Scripted-model tests: a made-up "$59.99, only 3 left" was sent back and corrected to $68.00 (`corrected=True`). A reply that stayed wrong after 2 retries was replaced with the safe fallback (`passed=False`). "Under $50: tee $32.00" passed, with the budget allowed.
- Live: "Gift ideas under $50" → 3 real items at $32.00 / $32.00 / $45.00, `prices_checked=4, passed=True`. "How much is this?" on Branford → $72.00, `prices_checked=1, passed=True`.

---

## Agent / backend 2 — Sensitive-data shield and chat rate limit

**What I added**
- **Redaction before the model** (`guards.redact_sensitive`, called in `POST /api/chat`). Before the message reaches the LLM, the logs or the database, the server removes:
  - **card numbers** (13–19 digits, confirmed with the Luhn checksum, so order numbers and phone numbers are left alone),
  - **CVV / security codes**,
  - **Social Security numbers**,
  - **passwords** ("my password is …", "pw: …"; plain mentions like "reset my password" are left alone).

  They're replaced with placeholders like `[card number removed]`. A guest's browser-sent history is redacted the same way.
- The agent gets a **Privacy notice** in its instructions for that turn, so it starts its reply by telling the shopper not to share that information, then answers the rest of the question.
- In the chat, the shopper's own bubble is replaced with the redacted text and a note: **"🔒 We removed your card number and card security code to keep it safe."**
- **Chat rate limit** (`guards.ChatRateLimiter`): at most **10 messages per minute and 120 per hour** per logged-in shopper (or per IP for guests). Extra requests get HTTP 429 with a friendly "You're sending messages very quickly. Please wait N seconds", shown in the chat.

**Why it helps**
- **Shoppers:** people sometimes paste a card number thinking the bot can take their order. Their data now never leaves our server, isn't sent to a third-party AI provider, and isn't stored in chat history.
- **Business:** storing card numbers in a chat log would be a serious compliance problem (PCI DSS) and a breach risk. Passwords in a database are a liability. The rate limit caps AI spend (each message costs model tokens) and blocks bots or scripts from hammering the chat. It's an **accuracy, safety and cost** improvement in one.

**Where to see it:** in the chat, type `My card is 4242 4242 4242 4242 cvv 123, can you buy the Basic Hoodie for me?` (4242… is the standard test card). Your bubble turns into `[card number removed] … cvv [removed]` with the 🔒 note, and the bot warns you. For the rate limit, send more than 10 messages within a minute.

**Verified (live, logged in as Handsome Dan)**
- Sent the card, CVV and password messages above. `user_message` came back redacted (`redacted=['card number', 'card security code']` and `['password']`). The bot began with "Please don't share card numbers or security codes in chat…", then still answered (Basic Hoodie in M: 5 left, $68.00). The DB rows contain only the placeholders, and a search for the raw card or password strings in `chat_messages` returned **0** rows.
- 12 simultaneous "hi" requests from one IP: 5 succeeded (the rest of that minute's 10-message budget) and 7 got **429** "Please wait 26 seconds". After 60 seconds, chat worked again.

**Found while testing:** the bot told a shopper they could "purchase it on its product page", but the site has no checkout. `prompt.md` now says there's no cart or checkout and shoppers buy in person at 57 Broadway. The retest answered: "Campus Customs doesn't offer online checkout… available to buy in person at 57 Broadway."
