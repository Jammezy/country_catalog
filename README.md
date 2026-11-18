# Country Catalog

Run `npm install`, then `npm start`. Open `http://localhost:3000`.
The app loads `.env.local`, then `.env`; existing hosting environment variables
take priority. `npm run build` checks server syntax; this Express/EJS app does
not require a frontend bundling step.
Sign in with an existing account from the PostgreSQL `users` table. The
username field uses `user_email`, and the password uses `user_password`.

## File organization

- `index.js`: contains server setup, database connection and queries, login
  protection and validation, server routes, browser map JavaScript, and server startup. Each section
  has a comment heading and blank space separating it from the next section.
- `views/`: EJS templates for the home, country list, add, and edit pages.
- `public/images/`: images the browser can request directly.
- `neon.ts`: Neon service configuration for the linked project.
- `schema.sql`: country and login tables for a new PostgreSQL database.

The server uses the same `app.get`, `app.post`, functions, Knex queries, and
`.then()` / `.catch()` patterns as the original project. Routes call the database
functions in the same file. The `/js/countries.js` route sends the map JavaScript
to the browser from its labeled section in `index.js`. Templates remain in
`views/`, and images remain in `public/images/`.

## Assignment behavior

Visitors can view the home page and sign in. A successful login shows Maintain
Records. Country pages and all record changes require a logged-in session.
The table lists every country and includes Edit, Delete, and Map actions.
Add Country appears below the table. Delete asks for confirmation, and Map
opens an embedded map on the same page. Logout ends the session.

Add and edit forms include every country field except `country_id`.
PostgreSQL creates that ID. Server validation checks required text, maximum
lengths, a whole-number population from 0 to 2147483647 (PostgreSQL's INTEGER
limit), and optional Y/N for visited. Blank visited values become SQL NULL.

The local country table was inspected and matches the assignment's column
types, lengths, nullability, primary key, and identity settings. No existing
database records or table definitions were changed during the review.

## Neon database setup

The project is linked to Neon project `little-mountain-70854584`, branch
`production`. Run `neon login` if needed, then `neon deploy` to apply the
configuration and refresh `.env.local`. The app uses the pooled `DATABASE_URL`
with Knex and the existing `pg` driver. `DATABASE_URL_UNPOOLED` is for schema
setup and other administrative work. Keep both connection strings private.

The tables were tested on a temporary Neon branch before production setup.
The seven local countries and existing login account were copied to production.
HTTP login, add, edit, delete, logout, and access protection were tested against
the hosted database. Temporary test records were removed. The map script and
image load; a visual Google Maps browser check remains separate from these tests.

`schema.sql` creates tables without replacing existing ones. The initial data
copy was performed during setup; it is not repeated when the app starts.
The local PostgreSQL fallback now requires `DB_PASSWORD` in the environment
instead of a password stored in source code.

## Live website

Website: https://country-catalog-hj5j.onrender.com

The Express app runs on Render's free plan, connected to the Neon production
database. Render service: `country-catalog` (`srv-dbuia0ajnfac73db3fug`).
It builds from the `main` branch of https://github.com/Jammezy/country_catalog
using `npm ci && npm run build`, then starts with `npm start`.
`DATABASE_URL` and `SESSION_SECRET` are private Render environment variables.
Render supplies `PORT`. Pushing changes to `main` automatically deploys them.

The public HTTPS website passed login, country listing, add, edit, delete,
logout, image/script loading, and logged-out access checks. Test changes were
confirmed in Neon and removed afterward. A visual map check remains a manual
browser check.

Before submitting, test the public URL: sign in, add a country, edit it, open
its map, delete it after confirming, and log out. Then confirm that opening
`/countries` while logged out returns to the home page.
