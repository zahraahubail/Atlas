# Atlas

An interactive country learning globe built with React and Vite. Explore 195 countries, learn their capitals and flags, and mark the places you know. Drag to rotate, use the zoom buttons or mouse wheel, and pinch to zoom on touch screens. Search for Bahrain to center it at a useful close-up scale; its outline uses higher resolution geometry. The top-bar language switch translates the whole interface between English and Arabic without moving the sidebar, globe, or country panel. Search accepts both languages, and the language choice is saved in the browser. Arabic text uses Mada. Dark mode is the default, and the theme toggle saves your preference.

## Run locally

```bash
npm install
npm run dev
```

## Deploy on Vercel

Import this directory as a Vite project. Vercel can use the default build command (`npm run build`) and output directory (`dist`). No environment variables or backend are needed.

Progress and theme are stored in the browser with `localStorage`. They survive closing and reopening the site on the same browser and device. Clearing site data or switching devices will not transfer progress. Accounts and a database would only be needed for cross-device sync.

Map geometry comes from `world-atlas`, capital names from `countries-list`, and country codes from `country-code-lookup`. Tuvalu is drawn separately because it is absent from the bundled atlas geometry.
