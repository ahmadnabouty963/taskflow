# Ordanly Client

React frontend for the Ordanly project and task management application.

## Technology

- React
- Vite
- ESLint
- Fetch API

## Local setup

Create the local environment file:

```bash
cp .env.example .env
```

## Run locally

1. Run `npm install`.
2. Create `.env` from `.env.example`.
3. Start the frontend with `npm run dev`.
4. Open `http://localhost:5173`.

The frontend uses `VITE_API_URL` to find the backend API. During local development it points to `http://localhost:3000`.

## Available scripts

- `npm run dev` starts the development server.
- `npm run lint` checks the source code.
- `npm run build` creates the production build.
- `npm run preview` previews the production build.
