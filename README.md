# Campus Customs Shop + Chatbot (HW4)

A Campus Customs storefront with a shopping chatbot ("Ask the Bulldog"):

- **Front end:** React + Vite + TypeScript (`frontend/`)
- **Back end:** Python FastAPI (`backend/main.py`)
- **Agent:** PydanticAI, using **GPT-6 Luna** through Portkey

Shoppers can browse products, create an account, and chat about merchandise. When they ask about a type of item, the matching products appear as cards on the page. Price and stock answers come straight from the local SQLite database.

> Class project inspired by Campus Customs. It is not an official store and is not affiliated with Yale University.

## Layout

```
HW4/
├── AI_prompts.md          # log of the prompts I gave my vibe coder, per problem
├── requirements.txt       # Python dependencies
├── .env.example           # placeholders only: copy to .env
├── .gitignore
├── README.md
├── frontend/              # Vite React TypeScript app
├── backend/               # FastAPI app: run with `uvicorn main:app --reload --port 8000`
│   ├── main.py            # API routes: products, images, auth, chat, chat history
│   ├── agent.py           # agent entry/wiring: model, instructions, fact-checker, audit
│   ├── tools.py           # tools the agent calls (catalogue, price, stock, account)
│   ├── models.py          # Pydantic / PydanticAI types
│   ├── prompts/prompt.md  # system prompt: voice, tool use, safety rules
│   └── auth.py, db.py, memory.py, guards.py, audit.py   # accounts, SQLite, chat memory, guardrails, audit log
└── output/
    ├── harness.md         # how the whole system works (models, tools, safety, specs)
    ├── design.md          # styling decisions
    ├── usability.md       # usability improvements
    ├── app_check.html     # site test report (double-click to open)
    ├── app_check_images/  # screenshots linked from app_check.html
    └── audit_trail.json   # append-only log of agent-loop activity
```

The agent itself is the four files under `backend/`: `prompts/prompt.md`, `agent.py`, `tools.py` and `models.py`.

## 1. Place the data pack (not in git)

The database and product images are **not** in this repo. Unzip the course data pack into the project root so you have:

```
HW4/
└── data/
    ├── campus_customs.db   # SQLite: catalogue, inventory, users (+ chat_messages)
    └── products/           # product images referenced by the catalogue
```

## 2. Set your API key

```bash
cp .env.example .env
# then edit .env and set PORTKEY_API_KEY=<your Portkey key>
```

`PORTKEY_PROVIDER` and `PORTKEY_BASE_URL` are optional. `SHOP_MODEL` defaults to `gpt-6-luna`.

## 3. Run the back end (terminal 1)

Requires Python 3.11+.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt    # installs ../requirements.txt
uvicorn main:app --reload --port 8000
```

Check it: http://127.0.0.1:8000/api/health should return `{"ok": true, "products": 102, ...}`.

On first start, the backend adds a `sessions` table and a `page_json` column to `chat_messages` in your local database. It creates `output/audit_trail.json` if it's missing.

## 4. Run the front end (terminal 2)

Requires Node 20+.

```bash
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` and `/images` to the backend on port 8000.

## Try it

- **Log in** with the seeded test user `test@campuscustoms.yale.edu` / `password`, or create an account.
- **Chat:** click **Ask the Bulldog** (bottom right) and try:
  - "What hoodies do you have?" → all 25 hoodies appear as cards on the page.
  - "Is the Boola Boola T Shirt in stock in large?" → an honest answer straight from inventory (it's sold out in L).
  - On any product page: "Do you have this in pink?"
- **Products page:** filter by "In stock in" a size and sort by price.

## Documentation

- [`output/harness.md`](output/harness.md): architecture, model fields, tools, safety rules, specs
- [`output/app_check.html`](output/app_check.html): tested features with screenshots
- [`output/usability.md`](output/usability.md) and [`output/design.md`](output/design.md)
- [`AI_prompts.md`](AI_prompts.md): prompt log
