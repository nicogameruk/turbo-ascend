# Setting up the online leaderboard (about 5 minutes)

The daily and weekly leaderboard stores scores in a free Supabase database.

1. Go to https://supabase.com and sign up (free plan).
2. Click **New project**. Give it a name (for example `turbo-ascend`), make up a database password (you won't need it again for this), pick a region near you, and click **Create new project**. Wait a minute while it sets up.
3. In the left menu, open **SQL Editor** → **New query**.
4. Open `docs/leaderboard-setup.sql` from this project, copy everything in it, paste it into the editor, and click **Run**. It should say "Success. No rows returned".
5. In the left menu, open **Project Settings** → **API** (sometimes called **Data API** / **API Keys**). Copy:
   - the **Project URL** (looks like `https://abcdefghijk.supabase.co`)
   - the **anon public** key (a long code starting with `eyJ...`, or `sb_publishable_...`)
6. Put them in `src/leaderboard-config.js`, or send them to Claude to do it.

Both values are designed to be public: the game can only use the four leaderboard functions, and the database only accepts the game's own random names.

**Never** share the `service_role` / secret key — the game doesn't need it.

## Owner-only names (optional)

Only the owner can type their own name, and names like "Frosty Hamster 55" are reserved for the owner.

1. Open `docs/leaderboard-owner.sql`, replace `CHANGE-ME-TO-YOUR-SECRET-CODE` with your own secret code (at least 8 characters — a few random words is best).
2. Paste it into Supabase → **SQL Editor** → **New query** and click **Run**. Don't save the file with your real code in it.
3. In the game:
   - **New name:** New Game → tap the small 🔑 on the name screen → enter your code and the name you want.
   - **Keep your current name** (e.g. Frosty Hamster 55): Settings → 🔑 Owner → enter your code → Save.
   - **Change your name any time** (keeps all progress and scores): Settings → 🔑 Owner → New name → Change my name.

To reserve more names for yourself, run: `insert into public.reserved_names (name) values ('Another Name 12');`
