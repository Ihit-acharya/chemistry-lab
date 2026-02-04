# Deployment (Render + Netlify)

This repo is split into:

- `backend/` (Express API + serves `/data/*`)
- `frontend/` (static HTML/CSS/JS)

## Render (backend)

1. Create a new **Web Service** from this GitHub repo.
2. Render should detect `render.yaml` automatically (Blueprint). If not, set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm ci`
   - **Start Command**: `node server.js`
3. Ensure you attach a persistent disk and set:
   - `RUNTIME_DATA_DIR=/var/data`

The backend will be available at something like:

- `https://<your-service>.onrender.com`

## Netlify (frontend)

1. Create a new Netlify site from this GitHub repo.
2. Build settings:
   - **Publish directory**: `frontend`
   - **Build command**: (leave empty)
3. After the Render backend is deployed, edit `netlify.toml` and replace:

- `https://YOUR-RENDER-SERVICE.onrender.com`

with your real Render URL.

Netlify will then proxy:

- `/api/*` -> Render `/api/*`
- `/data/*` -> Render `/data/*`

So the frontend can keep using relative URLs like `/api/login` and `data/reactants.json`.

## Local dev

Backend (serves the frontend and `/data/*` too):

- `cd backend`
- `npm install`
- `node server.js`
- open `http://localhost:3000/`

