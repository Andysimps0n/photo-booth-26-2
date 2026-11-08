# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies (package-lock.json is committed; use npm)
- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built `dist/` locally
- `npm run lint` — run oxlint (config in `.oxlintrc.json`; enables react/rules-of-hooks and react/only-export-components)

No test framework or test script is set up yet, so there is no command for running a single test.

## Architecture

This is a React 19 single-page app built with Vite 8 and `@vitejs/plugin-react`.

- `index.html` is the Vite entry. It loads `src/main.jsx` as a module and mounts into `#root`.
- `src/main.jsx` creates the React root in StrictMode, imports the global stylesheet `src/index.css`, and renders `App`.
- `src/App.jsx` is the root component. It is currently an empty placeholder; all app UI should be built as components rendered from here.
- `public/` holds static assets served at the site root.

The project is at the starting-point stage, so there are no routes, state management, or external services yet. Add these only when the feature requires them.
