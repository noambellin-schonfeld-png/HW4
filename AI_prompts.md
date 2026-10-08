# AI Prompts — Homework 4: Campus Customs Shop + Chatbot

Log of the prompts I typed to my vibe coder (Claude Code), one section per problem.

---

## Setup — Folder and data

**Prompt:**

> Ok, today we will be working on homework 4, so put everytthing we do in the homework 4 folder. Homework 4 is entitled: Campus Customs shop + Chatbot

**Prompt:**

> Here is the scenario. Campus Customs needs a real customer website with a helpful chatbot. Period. You will build a React + Vite TypeScript front end and a Python FastAPI Backend whose brain is a pydanticAI  agent period shoppers will be able to browse products comma create an account comma chat about merchandise comma see matching items appear on the page comma and get honest answers about price and stock from a local database period you are given campus_customs.dbwith tables for the Product catalog comma inventory by size comma and users (with hashed passwords). Product image file paths are in the catalog table. Period. Research yalbulldogblue.com To learn the style of the campus customs page and information for your prompt. Use YOUR PORTKEY_API_KEY or whatever API key You have for your agents AI calls. Period. If using OpenAI through portkey, use any models in the 5.6 or 6 series. You may want a smarter model for harder agent steps. Period. Work one problem at a time with your vibe coder. Period. Type each problem in your own words period do not paste the page URL and do not screenshot the problems to finish everything period in the end you will push your project to a public GitHub repo and submit the repo url On Canvas (the last problem shows the file tree). Do not commiut the database or prodcut images. . Please download data (4).zip, whuich is in my downlaod files. Unzip so that you have: data/campus_customs.db -- SQLite database with tables catalogue, inventory, and users (one test user is already there; and data/products/ -- product images; paths match the catalogue table

**Follow-up prompt:** None needed.

---

## Problem 1 — Vibe coder Prompts

**Prompt:**

> Ok, now  we have to work on Problem 1: Vibe coder Prompts. Here is the problem: Create AI_prompts.md at the start of the assignment and keep it updates as you work. This file is the log of what I type in you. Describe each problem to your vibe coder in your own words. Do not paste this whole page or the assignment URL and ask it to do everything for you. put one section for each prpoblem, each problem must include: The problem number and title; At least one promopt you typed, in your own words as much as possible, and One follow-up prompt i you needed it (and one sentence on what was lacking ater the first. Your running site, databases writes, and screenshots are the evidence. you do not need an extra proof essay beyond these prompts

**Follow-up prompt:** None needed.

---

## Problem 2 — Analyze the Database

**Prompt:**

> Now let’s work on Problem 2: Analyze the Database: Look at the database data/campus_customs.DB and understand the fields of each table. At a minimum, you should understand, catalogue, inventory, and users. Start the file output/harness.md. Write down each table and its fields, and one short line on why each field matters for the shop or the chat by. You will keep growing as harness file in later problems (models, tools, safety, specs).

**Follow-up prompt:** None needed.

---

## Problem 3 — Build the Campus Customs website

**Prompt:**

> Now let’s work on Problem #3; Build the Campus Customs website: Scaffold a React + Vite + TypeScript front end for Campus Customs. Put a navigation bar at the top that links to the main pages: 1. Home; 2. Products; 3. About Us; 4. Log in; 5. Create Account; pull campus customs-style words from yalebulldogblue.com for Home and About Us, but write these pages in your own voices (do not copy the original site text). On the products page, show product images from the catalogue (use the image paths in the database) with basic product info (name, price, short description). Make each product open a single item page (large image on one side, full-product text on the other — description, price, sizes/stock when you have them). Clicking a card on product should take the shopper there. Add a chat interface in the bottom right of the site (a floating chat panel is fine). It does not need to talk to an agent yet — a stub that will call your backend later is enough enough for this problem. You will need a small API soon to read the database. It is fine to start a simple FastAPI app in backend/main.py just to serve products and images, then grow it into the agent backend in problem 5

**Follow-up prompt:** None needed.

---

## Problem 4 — Create Account and Login

**Prompt:**

> Now let’s work on Problem 4: Create Account and Login: build a normal create Dash account / login flow: Create Account: first prompt name, last name, email, password (confirm password, it is a nice touch); Log in: email and password. New account accounts go into the users table. Make sure to store passwords securely so hackers (human or AI) cannot access them. The seed database already has a test user you can use while building: Email: test@campuscustoms.yale.edu; Password: password. Confirm you can login as that user, and that a brand new account you create also works. Update output/harness.md with how auth works (what you store for a user and how passwords are protected.

**Follow-up prompt:** None needed.

---

## Problem 5 — PydanticAI agent backend

**Prompt:**

> Now let’s work on Problem 5: PydanticAI agent backend; Build the shop chatbot as a PydanticAI agent behind FastAPI, plugged into your front-end chat widget. Put the API app in backend/main.py — that is the file you run with uvicorn. Keep the agent as these four files next to it (same idea as Homework 3): backend/prompts/prompt.md — system prompt (grow this same file later); backend/agent.py — agent entry / wiring; backed/tools.py — tools the agent can call; backend/models.py — Pydantic / PydanticAI structured types. In main.pu, expose a chat route so a message from the website returns or reply from the agent (and whatever else you need for products/auth). You will need your AI model API key for the agent. Put Campus Customs voice snd safety basics into prompts/prompt.md (you will expand tools and safety later). Start or update types in models.py for chat replies / product card as needed. In output/harness.md, note how the front end talks to FastAPI and how the agent is loaded (prompt file + model). Make sure the backend runs from the backend/ folder like this: uvicorn main:app --reload --port 8000

**Follow-up prompt:**

> Can you rerun this: [the Problem 5 prompt above, pasted again]

What was lacking after the first prompt: the first run was cut off partway through. Only `prompt.md`, `models.py` and `tools.py` were written; `agent.py`, the chat route and the widget hookup were still missing, so I asked it to run the problem again.

---

## Problem 6 — Tools: product info and stock

**Prompt:**

> Now let’s work on problem. Six: tools: product info and stock: give the agent tools that look up real information from campus_customs.db: product description; price; How many are in stock (by size when the customer asks). The agent must use the database — it should not invent prices or quantities. If a size is out of stock, say so clearly. Expand prompts/prompt.md so the agent knows how to call these tools for price and stock questions. Add or update return types in models.py. In output/harness.md, list each tool and explain which model fields you chose for look up results and why.

**Follow-up prompt:** None needed.

---

## Problem 7 — Chat search that updates the page

**Prompt:**

> OK, now let’s work on problem 7: chat search that updates the page: now we will add a neat feature to the site. When a customer asks about a type of item — for example “what hoodies do you have?” —  the agent should search the catalogue and the website should dynamically show those matching items as product cards (image, name, price, short info). This is an API contract: the agent return, structured product matches, and then the front end renders them on the website. It looks really cool. After the dynamic product cards are loaded by your new feature, make sure the same single-item page behavior you built in problem, three still works: each product card — including the ones the chat just put on the page — should still open that detail view (large image + full info) when clicked. Update prompts/prompt.md and output/harness.md so it is clear how search results reach the page

**Follow-up prompt:** None needed.

---

## Problem 8 — Customer memory

**Prompt:**

> Now let’s work on problem 8: customer memory: when a shopper is logged in, save their chat, history in the database in an appropriate table and reload it when they return. The agent should know who is chatting (name, email) — put that in agent deps (or an equivalent clear pattern) and/or tools. The agent can call. Also pass enough page context that if someone is on a product page and asks “ Do you have this in pink?”, The agent knows which item they mean. Hint: you can put code into the agent, contact context. Guests can still chat, but history only needs to persist for logged-in users. Document in output/harness.md: how user chat history is stored, what customer fields the agent sees, and how page context is passed

**Follow-up prompt:** None needed.

---

## Problem 9 — Usability improvements

**Prompt:**

> Now let’s work on problem 9: usability improvements: now that the core shop works, improve it. Choose and implement: 2 front-end usability improvements; 2 agent / backend usability improvements. Front-end improvements are things that make the site look better and make it easier to use. Agent / backend improvements are things that make the agent output better, more accurate, or safer. These could be new agent, tools, or things that make the agent run, faster or cheaper. Write output/usability.md before or as you build. For each of the improvements, say: what you added; why it helps a Campus Customs shopper or the business. Then make sure all improvements actually show up in the running app. Graders will read the write up and look for the features.

**Follow-up prompt:** None needed.

---

## Problem 10 — Style the website

**Prompt:**

> Now let’s work on problem. 10: style the website. Creative design so the site feels like a real Campus Customs storefront — fonts, color, hierarchy, motion, product presentation, Chatfield. You will get more points for imaginative and innovative design. Write output/design.md: what you changed and why it should help the customer stick around and buy. Keep it concrete and short. Add lots of silver and blue, which are the colors of Yale, lots of pictures of bulldogs, present the products in Yale themed regalia, use bold fonts, and make the chat feel natural and smooth.

**Follow-up prompt:** None needed.

---

## Problem 11 — Site testing (app check)

**Prompt:**

> OK. Now let’s work on problem. 11: site testing (app check): test the live site and document it in output/app_check.html (a page you can double-click open). Include clear, screenshots, and short captions for: 1. Chat checking the inventory level of an item (honest stock/price from DB); 2. The dynamic search-result cards appearing after a category question (e.g. hoodies); 3. One of the usability features you added in problem nine. Make the HTML easy to grade: give a heading for each check, screenshot, one or two sentences on what the screenshot proves. Put the screenshot image files in output/app_check_images/ and link them for app_check.html with relative paths (for example example app_check_images/inventory.png).

**Follow-up prompt:** None needed.

---

## Problem 12 — Audit trail, safety, finish harness

**Prompt:**

> Now let’s work on problem. 12: audit trail, safety, finish harness: keep an append-only output/audit_trail.json of agent-loop activity (time, full name, short args/result, stop reason). Do not wipe it between runs. Also, think of some safety rules to give the agent and put them in prompts/prompt.md. Finish output/harness.md so it is clear how the system works: model fields in models.py and why you chose them; tools and abilities; safety rules; Specs (loop limits, result caps, models, how to run front + back).

**Follow-up prompt:** None needed.

---

## Problem 13 — Push to GitHub and submit the URL

**Prompt:**

> OK, let’s now work on the final problem, problem 13: Push to GitHub and submit the URL: put your code in a folder named HW4 and push it to a public GitHub repository. On canvas, I will submit the repo URL (the link the graders can open and clone). You do not upload a zip for this homework. Do not put your real .env, campus_customs.db, or product images in the GitHub repo. Use .gitignore. Include .env.example with placeholders only. The agent itself is four files under backend/: prompts/prompt.md, agent.py, tools.py, and models.py. README.md should explain how to run the front end and back end after placing the data pack.

(Sent with two screenshots of the assignment's expected file layout.)

**Follow-up prompt:** None needed.
