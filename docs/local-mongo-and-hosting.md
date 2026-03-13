# Local Mongo + Hosting Guide

## 1. Start MongoDB locally (Docker)

From project root:

```bash
docker compose up -d mongo
```

Or from `server/`:

```bash
npm run mongo:up
```

Check it:

```bash
docker compose ps
```

## 2. Run backend with Mongo enabled

`server/.env` should include:

```env
ENABLE_MONGO=true
MONGO_URI=mongodb://localhost:27017/dexii
```

Start backend:

```bash
cd server
npm run dev
```

Expected log:

```text
MongoDB Connected...
Dexii Backend running on port 5001
```

## 3. Run frontend

From project root:

```bash
npm start
```

The app will use `http://localhost:5001/api` by default on localhost.

## 4. Push to GitHub

From project root:

```bash
git add .
git commit -m "Add local Mongo + friend discovery + deployment setup"
git push origin main
```

## 5. Deploy on Render (single service)

This repo now includes `render.yaml` for one web service.

In Render:

1. Create Web Service from this GitHub repo.
2. Render will pick up `render.yaml`.
3. Set `MONGO_URI` to your hosted Mongo connection string.
4. Deploy.

The backend serves the built Angular app from `dist/dexii/browser`, so frontend and API run from the same service.
