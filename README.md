# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/zth83326-sketch/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/zth83326-sketch/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar — ranks pre-token DeFi protocols by an implied valuation calibrated from live-token market caps, with a per-protocol farm plan and an interactive dashboard. The model calibrates a market-cap/TVL multiple per category from traded peers, de-noises 7-day growth, applies a launch-window age curve and a small multi-chain premium, then ranks 178 protocols (40 watchlist + 138 early) with a concrete 7-step farm plan for each.

## Run it

Take the snapshot from the competition kit (`input/snapshot.json`) and run:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input path/to/snapshot.json
```

The run writes `out/board.json`, `out/dossier.json`, `out/dossier.txt` and the screenshots. Open `dashboard/index.html` (served from the repo root) to explore the board, filter by chain, and inspect any row's full multiplier breakdown and farm plan.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
