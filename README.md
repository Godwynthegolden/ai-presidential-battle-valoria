# 🏛️ Republic of Valoria: AI Presidential Election Battle

An immersive, high-stakes political reality show web application powered **strictly by a single 9router Custom Endpoint**. 

Set in the fictional **Republic of Valoria**, 11 distinct, authentic political candidates clash on live national television over inflation, border security, corporate oligarchy, healthcare, labor rights, and constitutional integrity.

---

## 🌟 Key Features

1. **Realistic Political Scenario (Republic of Valoria)**:
   - 11 grounded, authentic political figures (Governors, Generals, Judges, Central Bankers, Billionaires, Union Leaders, Podcasters, and Whistleblowers).
   - High-stakes debate rhetoric on real-world issues (cost of living, taxes, energy transition, foreign defense, judicial ethics).
2. **Pre-Game Candidate Selector**:
   - Choose which and how many candidates participate before starting the election.
   - Quick presets for **All 11**, **Top 8**, **Top 6**, or **Quick 4** contenders.
   - Dynamic game engine loops elimination rounds until the **Top 3 Finalists** remain, followed by a Grand Jury vote with all participating election members.
3. **Strict 9router Integration (Zero Mocks)**:
   - Fully OpenAI-compatible custom endpoint architecture (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`).
   - In-app 9router Settings modal with **Dynamic Model Discovery** (`GET /v1/models`).
   - Supports both direct JSON and SSE streaming chunk parsers.
4. **Broadcast Presentation**:
   - Live debate arena, 1-on-1 attack faceoffs, confidential elimination ballots, concession reactions, and grand jury presidential inauguration.

---

## 👥 The 11 Political Contenders

1. **Jackson "Jax" Alvarez** — *Rust-Belt Populist Governor & Ex-Laborer* ("Restore Valoria to the Working Class!")
2. **Elena Rostova** — *Former Central Bank Governor & Fiscal Technocrat* ("Fiscal Discipline. Sustainable Growth.")
3. **Gen. Marcus "The Hammer" Vance** — *Decorated Defense Minister (Ret.)* ("Strength at the Border. Peace Through Power.")
4. **Camilla Laurent** — *Anti-Corruption Crusader & Civil Rights Attorney* ("Justice Unbought. A Republic for All.")
5. **Arthur "Art" Sterling** — *Media & Real Estate Billionaire* ("Run Valoria Like a Fortune 500 Company!")
6. **Dmitri Voronin** — *National Labor Federation Leader* ("Seize the Wealth! All Power to the Workers!")
7. **Senator Silas Thorne** — *35-Year Career Senator & Diplomat* ("Tested Leadership for a Steady Valoria.")
8. **Dr. Amara Chen** — *Climate Scientist & Energy Pioneer* ("Protect Our Land. Power Our Future.")
9. **Damian "Cipher" Cross** — *Investigative Podcaster & Whistleblower* ("Expose the Shadow Lobby. Break the Machine.")
10. **Judge Beatrice Holloway** — *Retired Constitutional Chief Justice* ("Honor the Constitution. Preserve Our Heritage.")
11. **Julian "Zero" Mercer** — *Eccentric Tech Pioneer & Provocateur* ("System Reboot: Upgrade Valoria to Version 2.0!")

---

## 🎮 Game Flow & Word Limits

1. **Pre-Game Roster Setup**: Select which candidates enter the race (min 4 to 11).
2. **Campaign Phase**: All active candidates deliver their opening stump speech (**maximum 40 words**).
3. **Live Attack Round**: Candidates challenge rivals on policy, scandals, and fitness for office (**maximum 30 words**).
4. **Secret Elimination Ballot**: Structured JSON ballots (`{"vote": "candidate_id", "reason": "..."}`).
5. **Concession & Exit**: Real-time vote tally, buzzer, and concession reaction (**maximum 30 words**).
6. **Repeat**: Loops until **3 Finalists** remain.
7. **Final Speeches**: Top 3 deliver their closing presidential appeal (**maximum 50 words**).
8. **The Grand Jury**: All participating candidates vote to elect the President of the Republic of Valoria!
9. **Inauguration**: President is crowned with the golden presidential seal, confetti, and inaugural address (**maximum 50 words**).

---

## 🛠️ Configuration & 9router Integration

### 1. In-App 9router Setup (Interactive Modal)
You can configure 9router directly in the web UI by clicking the **"9router Settings"** button in the top bar:
- **Base URL / Endpoint**: e.g., `http://localhost:20128/v1` (default for local 9router) or `https://api.9router.com/v1`.
- **API Key**: Your 9router API key.
- **Fetch Available Models**: Click the button to automatically query 9router's `GET /v1/models` endpoint.
- **Model Selector**: Pick any active model from the discovered list (e.g. `gpt-4o`, `claude-3-5-sonnet`, `gemini-1.5-pro`, `deepseek-chat`, etc.) or enter a custom model name.

Settings are saved locally and applied to all real-time agent speech, attack, and voting requests.

### 2. Environment Variables (.env.local)
Alternatively, you can provide default credentials via `.env.local`:

```bash
# .env.local
LLM_BASE_URL=http://localhost:20128/v1
LLM_API_KEY=your_9router_api_key_here
LLM_MODEL=gpt-4o-mini
```

### 2. Install & Run

**One-Click Launch (Windows):**
Simply double-click `start_all.bat` in the project root to start the server and automatically launch the app in your browser.

**Manual Terminal Launch:**
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎬 Controls

- **Start Election**: Kick off the battle.
- **Auto-Play**: Automatically progress through rounds.
- **Next Step**: Advance manually step-by-step.
- **Speed Selector**: Choose between `Slow` (4s), `Normal` (2.5s), and `Fast` (1s).
- **SFX Toggle**: Synthesized Web Audio API sound effects (gavel, attack sting, vote chimes, elimination buzzer, fanfare).
- **Restart**: Reset game state anytime.
- **Retry Request**: Retry any interrupted 9router request seamlessly.
- **Dossier Inspector**: Click on any candidate card to view their private psychological motivations, voting rules, and rivalries.
- **Debate Record**: Export full transcripts with one click.
