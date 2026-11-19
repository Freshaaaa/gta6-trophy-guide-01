// A working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json. The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Only the plumbing, not a winner: a plain checklist of the 55 trophies with a one-line hint each. Write a real guide
// for every trophy in your own words, a roadmap to the platinum, filters and a spoiler setting in app/, put 3 or 4 PNG
// or JPEG screenshots of it in screenshots/ (the first by name is the cover; shots.json says which views this
// starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Validate the guide's inputs before handing anything in: a broken trophy list
// or a missing screenshot would otherwise be copied silently and only fail at
// the judge. Fail here instead, naming the exact item that is wrong.
function validateInputs(): void {
  const dataPath = join(here, 'app', 'data', 'trophies.json');
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  } catch (err) {
    throw new Error(`trophies.json does not parse (${dataPath}): ${(err as Error).message}`);
  }
  const trophies = (data as { trophies?: unknown }).trophies;
  if (!Array.isArray(trophies) || trophies.length !== 55) {
    throw new Error(`trophies.json must list exactly 55 trophies under "trophies", found ${Array.isArray(trophies) ? trophies.length : typeof trophies}`);
  }
  for (const t of trophies as Array<Record<string, unknown>>) {
    if (typeof t.id !== 'number' || typeof t.name !== 'string' || t.name.length === 0) {
      throw new Error(`trophy entry missing id/name: ${JSON.stringify(t).slice(0, 120)}`);
    }
    if (typeof t.guide !== 'string' || t.guide.trim().length === 0) {
      throw new Error(`trophy #${t.id} "${t.name}" has no guide text`);
    }
    // v2 fields: every trophy needs a roadmap stage, at least one source, a difficulty (1-5) and an estimated time.
    if (typeof t.stage !== 'number' || t.stage < 1 || t.stage > 3) {
      throw new Error(`trophy #${t.id} "${t.name}" has no valid stage (1-3)`);
    }
    if (!Array.isArray(t.sources) || t.sources.length === 0) {
      throw new Error(`trophy #${t.id} "${t.name}" has no sources`);
    }
    if (typeof t.difficulty !== 'number' || t.difficulty < 1 || t.difficulty > 5) {
      throw new Error(`trophy #${t.id} "${t.name}" has no valid difficulty (1-5)`);
    }
    if (typeof t.time !== 'string' || t.time.trim().length === 0) {
      throw new Error(`trophy #${t.id} "${t.name}" has no estimated time`);
    }
    if (t.target !== null && t.target !== undefined) {
      const target = t.target as { n?: unknown; unit?: unknown };
      if (typeof target.n !== 'number' || target.n <= 0 || typeof target.unit !== 'string' || target.unit.length === 0) {
        throw new Error(`trophy #${t.id} "${t.name}" has a malformed counter target`);
      }
    }
    if (t.chapter !== null && t.chapter !== undefined && typeof t.chapter !== 'string') {
      throw new Error(`trophy #${t.id} "${t.name}" has a non-string chapter`);
    }
  }
  const shotsPath = join(here, 'shots.json');
  if (existsSync(shotsPath)) {
    const shots = JSON.parse(readFileSync(shotsPath, 'utf-8')) as Array<{ file: string }>;
    for (const shot of shots) {
      if (!existsSync(join(here, 'screenshots', shot.file))) {
        throw new Error(`screenshot listed in shots.json is missing: screenshots/${shot.file}`);
      }
    }
  }
}

validateInputs();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
