# H000008 N-Back

HTML/browser preview of the N-Back task built with `psyflow-web`.
The trial procedure, block-wise 1-back/2-back split, response mapping, and timing model are aligned to local `T000008-nback`; only total trial count is shortened for preview.

## Layout

- `main.ts`: task orchestration
- `config/config.yaml`: declarative config
- `src/run_trial.ts`: trial logic
- `src/utils.ts`: condition generator and block summary helper

## Run

From `e:\xhmhc\TaskBeacon\psyflow-web`:

```powershell
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:4173/?task=H000008-nback
```
