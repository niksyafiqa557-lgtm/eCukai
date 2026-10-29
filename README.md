# e-Cukai Lot (PHP + MySQL)

## Folder structure to use in `htdocs`

```
htdocs/
└── ecukai-lot/
    ├── config.php
   ├── lib/
   │   ├── auth.js
   │   ├── db.js
   │   └── http.js
   ├── index.html
    ├── login.php
    ├── logout.php
   ├── register.php
   ├── schema.sql
   ├── neon-schema.sql
   ├── package.json
   ├── vercel.json
   ├── assets/
   │   ├── css/
   │   │   └── app.css
   │   └── js/
   │       └── app.js
   ├── images/
   │   └── mdpp-logo.jpeg
    ├── api/
   │   ├── add_property.php
   │   ├── dashboard_stats.php
   │   ├── property_details.php
    │   ├── search_property.php
   └── README.md
```

## Setup steps

1. Start Apache and MySQL in the XAMPP control panel.
2. Open phpMyAdmin (http://localhost/phpmyadmin) → Import → select `schema.sql`.
   This creates the `ecukai_lot` database with the `officer`, `property`,
   `tax`, and `payment` tables, plus the same 10 sample properties used in
   the prototype, so the two match.
3. Copy the project folder into `C:/xampp/htdocs/ecukai-lot/`.
4. Set a real password hash for the sample officer:
   ```php
   <?php echo password_hash('your_chosen_password', PASSWORD_DEFAULT);
   ```
   Run that once with `php -a` or a throwaway script, then update the
   `password_hash` column for the `mdpp0234` row in phpMyAdmin.
5. Visit `http://localhost/ecukai-lot/` — wire your login form to POST
   JSON to `login.php`, and have your dashboard's map/search call the two
   endpoints in `api/`.

## Deploying on Vercel with Neon

Vercel serves the static frontend and runs the JavaScript files in `api/`
as serverless functions. The existing PHP endpoints remain available for
local XAMPP use; `vercel.json` rewrites the frontend's PHP-style URLs to
the Vercel functions. `.vercelignore` prevents the PHP source and local
configuration from being published.

1. In the Neon project, open the SQL Editor and run `neon-schema.sql`.
   This creates the PostgreSQL tables and sample property/tax/payment
   records. It does not create a sample officer account; register one
   through the website after deployment.
2. Push this project to GitHub and import that repository into Vercel.
   Vercel should detect the serverless functions in `api/`. Keep the
   project root as the root directory and use the default build settings.
3. In the Vercel project settings, add these environment variables for
   Production (and Preview too, if you will test preview deployments):
   - `DATABASE_URL`: the Neon connection string from the Neon dashboard's
     **Connect** panel. Keep it secret; never add it to frontend code or
     commit it to Git.
   - `SESSION_SECRET`: a private random value of at least 32 characters.
4. Redeploy after saving the environment variables.
5. Open the Vercel URL, register an officer account, then log in. Public
   registration creates officer accounts only. To enable **Add Property**
   for an account, change that officer's `role` to `admin` in Neon SQL
   Editor after confirming the correct account.

Vercel and Neon have their own plan limits and terms; check the current
provider dashboards before publishing. Do not use the sample officer's
placeholder password hash from `schema.sql` as a real account.

## Endpoints

- `POST /register.php` — body `{ "name", "staff_no", "email", "password" }`.
  Creates a new row in `officer` with a hashed password. New accounts get
  the `officer` role by default (not `admin`) — see the note below on
  who should be able to approve new staff.
- `POST /login.php` — body `{ "staff_no": "...", "password": "..." }`.
  Starts a PHP session on success.
- `GET /api/search_property.php?q=&area=` — returns matching property +
  latest tax status rows. Powers both the sidebar list and the search box.
- `GET /api/property_details.php?property_id=` — full record for one lot,
  including its latest payment if paid. Call this when a map marker is
  clicked.
- `GET /api/dashboard_stats.php?year=2026` — total/paid/unpaid counts and
  amount collected, for the dashboard stat cards.
- `POST /api/add_property.php` — body `{ "account_no", "address", "area",
  "property_type", "latitude", "longitude", "year", "amount", "status" }`.
  Adds one property plus its first tax record in a single transaction.
  This is how to add data through the app itself instead of typing SQL.

All `api/` endpoints (and `add_property.php`) require an active login
session (`require_officer_login()` in `config.php`) — they return HTTP
401 if called without logging in first. Consider restricting
`add_property.php` to `role = 'admin'` once you have roles worth
enforcing.

## How do I add more data?

Three ways, roughly in order of how "real" your setup is:

1. **phpMyAdmin, by hand** — fastest for a handful of test records. Open
   the `property` and `tax` tables and insert rows directly. Good for
   development, not for officers day-to-day.
2. **CSV import** — if MDPP's existing finance system can export a list
   of properties/tax records, phpMyAdmin's Import tab accepts CSV
   directly into a table. Best if you're bootstrapping the database from
   an existing spreadsheet of ratepayers.
3. **The `add_property.php` endpoint above** — build a small "Add
   Property" form in your officer dashboard that POSTs here. This is the
   long-term answer: officers add/update records through the UI, not
   through phpMyAdmin, and you keep validation and login-checks in one
   place.



## Does the tax status update automatically when someone pays?


- **As proposed (check-only)** — this database is its own source of
  truth. Someone (an officer, or MDPP's finance/treasury department)
  updates `tax.status` and inserts into `payment` after a payment is
  confirmed elsewhere — whether that's cash at the counter, a bank
  transfer, or MDPP's actual online payment portal if one exists. Nothing
  updates automatically. This is the simplest, safest option for a
  training project, and it's honestly what most local-authority systems
  look like under the hood even when the public-facing part feels
  instant.

- **If you want it to update automatically**, that requires linking this
  database to whatever system actually processes the payment. Three ways
  that link could work, in increasing order of effort:
  1. *Shared database* — if MDPP already has a finance/tax system with
     its own database, and you're given read access, you point
     `dashboard_stats.php` / `search_property.php` at *that* database
     instead of maintaining a duplicate one. No sync needed because
     there's only one copy of the truth. Requires MDPP's IT/finance team
     to grant access — not something you can decide alone.
  2. *Scheduled batch sync* — a small PHP script (run nightly via a cron
     job, or manually by an officer) that reads an export from the
     finance system and updates `tax`/`payment` here to match. Doesn't
     need real-time integration with a payment gateway, just an agreed
     export format.
  3. *Real-time webhook* — if payments go through an online gateway
     (FPX, JomPAY, etc.), the gateway calls a small endpoint here
     immediately after a successful payment, which inserts into
     `payment` and flips `tax.status` to `PAID`. This is the most
     "automatic" option but needs the payment provider or MDPP's payment
     system to actually support calling out to your endpoint — that's a
     coordination question, not just a code one.


## Connecting the map

In your frontend JS, after Leaflet renders each property as a marker
(using `latitude`/`longitude` from `search_property.php`), attach a click
handler that fetches `api/property_details.php?property_id=<id>` and
renders the result into your detail panel — this is the same interaction
the prototype simulates with in-memory data.

## Next steps beyond this scaffold

- Hash and salt are handled by PHP's built-in `password_hash` /
  `password_verify` — don't store plain-text passwords.
- Add CSRF protection and rate-limiting on `login.php` before any real
  deployment.
- If officers need to *add* payments (not just view status), you'll want
  an authenticated `POST /api/record_payment.php` that inserts into
  `payment` and flips the matching `tax.status` to `PAID` — intentionally
  left out for now since your proposal scopes this as view-only.
