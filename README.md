# AgoraSim

AgoraSim is a paired synthetic-society experiment for testing whether a verified Injective x402 purchase receipt changes message credibility, propagation, and paid adoption.

The implementation is in progress. Product scope and acceptance criteria live in [PRD.md](./PRD.md).

## Local prerequisites

- Node.js 20+
- pnpm 11+
- Docker with Compose

## Bootstrap

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm dev
```

The web app runs at `http://localhost:3000`; the API runs at `http://localhost:4100`.

All chain integration is testnet-only. Test assets have no real value. Never commit wallet keys or payment signatures.
