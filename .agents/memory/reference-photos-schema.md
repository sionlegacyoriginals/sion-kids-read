---
name: reference_photos table schema
description: The actual column name for the base64 image payload in reference_photos is data_url, not data.
---

# reference_photos table schema

The `reference_photos` table was created in an earlier session with this schema:

- `id` TEXT PRIMARY KEY
- `data_url` TEXT NOT NULL  ← the image payload column is called `data_url`, not `data`

**Why:** A previous agent session created this table using `data_url` as the column name. All INSERT and SELECT queries must use `data_url`.

**How to apply:** Any SQL touching this table must use `data_url`:
- `INSERT INTO reference_photos (id, data_url) VALUES ($1, $2)`
- `SELECT data_url FROM reference_photos WHERE id = $1`
