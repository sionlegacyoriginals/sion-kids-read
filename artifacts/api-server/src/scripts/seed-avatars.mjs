/**
 * One-shot script: seed the 20 avatar images into reference_photos + avatar_bank.
 * Run: node artifacts/api-server/src/scripts/seed-avatars.mjs
 */
import pg from "pg";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../../..");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

const avatarDefs = [
  { id: "avatar_kid_001",       name: "Amara",          category: "kids",      emoji: "👧🏿" },
  { id: "avatar_kid_002",       name: "Liam",           category: "kids",      emoji: "👦🏼" },
  { id: "avatar_kid_003",       name: "Sofia",          category: "kids",      emoji: "👧🏽" },
  { id: "avatar_kid_004",       name: "Kai",            category: "kids",      emoji: "👦🏻" },
  { id: "avatar_kid_005",       name: "Maya",           category: "kids",      emoji: "👧🏾" },
  { id: "avatar_kid_006",       name: "Marcus",         category: "kids",      emoji: "👦🏿" },
  { id: "avatar_animal_001",    name: "Leo the Lion",   category: "animals",   emoji: "🦁" },
  { id: "avatar_animal_002",    name: "Benny the Bunny",category: "animals",   emoji: "🐰" },
  { id: "avatar_animal_003",    name: "Fiona the Fox",  category: "animals",   emoji: "🦊" },
  { id: "avatar_animal_004",    name: "Drake the Dragon",category:"animals",   emoji: "🐉" },
  { id: "avatar_animal_005",    name: "Buddy the Dog",  category: "animals",   emoji: "🐶" },
  { id: "avatar_adventure_001", name: "Astronaut",      category: "adventure", emoji: "🚀" },
  { id: "avatar_adventure_002", name: "Superhero",      category: "adventure", emoji: "🦸" },
  { id: "avatar_adventure_003", name: "Explorer",       category: "adventure", emoji: "🧭" },
  { id: "avatar_adventure_004", name: "Knight",         category: "adventure", emoji: "⚔️" },
  { id: "avatar_career_001",    name: "Doctor",         category: "careers",   emoji: "👨‍⚕️" },
  { id: "avatar_career_002",    name: "Police Officer", category: "careers",   emoji: "👮" },
  { id: "avatar_career_003",    name: "Veterinarian",   category: "careers",   emoji: "🐾" },
  { id: "avatar_career_004",    name: "Mechanic",       category: "careers",   emoji: "🔧" },
  { id: "avatar_career_005",    name: "Firefighter",    category: "careers",   emoji: "🚒" },
];

// Ensure tables exist (migration may not have run yet in this session)
await client.query(`
  CREATE TABLE IF NOT EXISTS avatar_bank (
    id         TEXT        PRIMARY KEY,
    name       TEXT        NOT NULL,
    category   TEXT        NOT NULL,
    emoji      TEXT        NOT NULL DEFAULT '',
    sort_order INTEGER     NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

let seeded = 0;
let skipped = 0;

for (const [i, a] of avatarDefs.entries()) {
  const imgPath = path.join(root, "attached_assets/avatars", `${a.id}.png`);
  if (!existsSync(imgPath)) {
    console.warn(`  ⚠️  Missing file: ${imgPath}`);
    skipped++;
    continue;
  }
  const buf = await readFile(imgPath);
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;

  await client.query(
    `INSERT INTO reference_photos (id, data_url)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET data_url = EXCLUDED.data_url`,
    [a.id, dataUrl]
  );

  await client.query(
    `INSERT INTO avatar_bank (id, name, category, emoji, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE
       SET name=EXCLUDED.name, category=EXCLUDED.category,
           emoji=EXCLUDED.emoji, sort_order=EXCLUDED.sort_order`,
    [a.id, a.name, a.category, a.emoji, i]
  );

  console.log(`  ✓ ${a.id} (${a.name})`);
  seeded++;
}

await client.release();
await pool.end();

console.log(`\nDone — ${seeded} seeded, ${skipped} skipped.`);
