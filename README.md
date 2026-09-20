# Atlas

An interactive country learning globe built with React and Vite. Explore 194 countries, their capitals and flags, and mark the places you know. The globe supports drag, scroll and pinch zoom, plus a button to start or stop automatic rotation. The interface switches between English and Arabic, with Mada for Arabic text. Dark mode is the default.

## Run locally

```bash
npm install
npm run dev
```

## Enable accounts and cross-device progress

Guest progress works immediately and stays in this browser's local storage. Signed-in accounts use Supabase and sync progress across devices. Guest and account progress are separate; signing out returns to the original guest progress. The daily streak counts calendar days when at least one new country is marked as memorized. Marking more than one on the same day still earns one day. A day can be completed any time before local midnight; a missed calendar day resets the displayed streak. Removing a memorized mark does not erase an earned learning day. A short celebration appears when the first country of a new calendar day starts or extends the streak; later countries on that same day do not repeat it.

1. Create a Supabase project at [supabase.com](https://supabase.com/dashboard).
2. In **Authentication → Sign In / Providers → Email**, enable email sign-in. Decide whether to require **Confirm Email** (Supabase enables it by default). When it is enabled, new users receive a confirmation link before they can log in. Add your local and deployed site URLs under **Authentication → URL Configuration** so those links return to Atlas.
3. Open **SQL Editor** in Supabase and run [`supabase/schema.sql`](supabase/schema.sql). It creates the progress and learning-day tables, the atomic mark-country function, and row-level security rules. If Atlas was already connected to Supabase, run the updated SQL again; it preserves existing country progress. Past learning days cannot be reconstructed for previously memorized countries.
4. Copy `.env.example` to `.env.local`. In **Project Settings → API Keys**, copy the project URL and publishable key into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Restart the local dev server.
5. Register from the account button in Atlas. If email confirmation is enabled, open the link sent to your inbox, then log in. Test login on another browser with the same email and password.

Do not put a secret or service-role key in the Vite variables. Supabase's publishable key is intended for browser apps, while row-level security controls progress access. Phone-only accounts created with the earlier version need an email added to the account before they can use the new email login. There is no self-service password reset in this version.

## Deploy on Vercel

Import this directory as a Vite project. Use `npm run build` and `dist`. Add the same two `VITE_` variables in the Vercel project settings, then deploy. In Supabase **Authentication → URL Configuration**, set your Vercel URL as the site URL and add `http://localhost:5173` as a redirect URL for local testing. Guest progress and theme continue to be stored in each browser.

Map geometry comes from `world-atlas`, capital names from `countries-list`, and country codes from `country-code-lookup`. Tuvalu is drawn separately because it is absent from the bundled atlas geometry.
