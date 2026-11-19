# gta6-trophy-guide-01

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Freshaaaa/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Freshaaaa/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

The Leonida Trophy Fieldbook — the best guide and tracker for the 55 PlayStation 5 trophies of Grand Theft Auto VI. Every trophy with its official name, description and grade, a checklist saved in the browser, export and import, a spoiler setting that hides story trophies until earned, a roadmap to the platinum, the missable trophies flagged, and a guide to each trophy in your own words that cites its sources.

## What it does

- **Tracker** — all 55 trophies grouped by roadmap stage (Stage 1 · The story, Stage 2 · 100% completion, Stage 3 · Cleanup), each group with its own earned count. Tick trophies off; progress is saved in localStorage, with export/import as JSON and a reset.
- **Collectible counters** — 19 trophies with a countable target (18 meditation spots, 42 Shooting Range challenges, 14 drone locations, 3 card sets, 100 WAiNK It locations, …) get a − N/M + counter in the detail panel, saved alongside your ticks.
- **Filter chips with counts** — All, Story, Side story, Collectibles, Activities, Robbery, Exploration & misc, 100% completion and Missable, each showing its earned/total count. Plus a search box, a grade filter and an earned-only toggle.
- **Per-trophy source tags** — every row shows its sources at a glance (PPX = PowerPyx, OL = OutputLag, EXO = Exophase, GTB = GTABase, KG = KeenGamer, EG = EGamers). Every trophy cites at least 3 sources.
- **Self-audit bar** — 55/55 trophies · 55/55 guides · 55/55 cited · 28/28 hidden · 8 missable · 5 unconfirmed, listed honestly. The 5 unconfirmed trophies say so in their guide instead of inventing a method, and Positive Mental Attitude carries a "NOT PINNED DOWN YET" box: no cited guide has confirmed whether the Chapter 1 meditation spot is strictly required.
- **Difficulty + time per trophy** — each detail panel shows a difficulty (●●○○○) and an estimated time (ranges, marked "(est.)"), consistent with the roadmap's ~200 hours total and difficulty 4/10.
- **Next up + Previous/Next** — a "Next up" strip names the next unearned trophy in roadmap order, and the detail panel has Previous/Next buttons to walk the list.
- **Roadmap** — the three-stage road to the platinum (~200 hours, 1 playthrough, all offline), with the lenient 100% thresholds (200 of 277 vehicles, 100 of 255 animals, 50 of 66 weapons, 70 of 80 challenges) and the hard rules (no mission replay, no New Game+, cheats disable trophies).
- **Missables** — the 8 missable trophies, led by Positive Mental Attitude (the Chapter 1 meditation spot), plus the time-limited stranger strands.
- **Sources** — PowerPyx, OutputLag, Exophase, GTABase, KeenGamer, EGamers, TechWiser and GTA Zone, with an honest note: Rockstar has not published an official list, and the 5 unconfirmed trophies are named.

Dark, modern theme — near-black navy, gold accent, teal progress. Fully offline: no network requests, nothing phones home.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

To build the submission dossier instead:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` validates the inputs first: exactly 55 trophies, every trophy with a guide, a roadmap stage (1–3), at least one source, a difficulty (1–5), an estimated time, and a well-formed counter target where it has one; every screenshot listed in `shots.json` must exist.

URL state: `?tab=roadmap|missables|sources`, `?spoiler=1`, `?missable=1`, `?earned=1`, `?kind=…`, `?grade=…`, `?search=…`, `?select=<id>`. `?demo=1` seeds a fixed 8-trophy sample (and a 6/18 meditation counter) when nothing is saved yet — a screenshot helper.

---

<sub>Entered on [make.fun](https://make.fun/?ref=pstpm556&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
