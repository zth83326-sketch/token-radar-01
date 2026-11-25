// The token radar's model, radar-2: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and ranks
// every other rankable pre-token protocol below that floor too: the early rows the radar exists
// to find. A protocol is pre-token when its index entry records no token (no market cap, no
// CoinGecko id, no symbol); the snapshot's live-token protocols are kept apart and shown as the
// market's own values, never mixed into the ranked board. They do a second job: they price the
// categories. Nothing at or above the floor that the watchlist leaves out is ranked: the
// snapshot cannot show a protocol's parent, so such a row is most often a sub-product, not a
// standalone launch.
//
// Implied value follows only from the snapshot's own figures:
//
//   base multiple  = the protocol's category's median market-cap / TVL among the snapshot's
//                    protocols whose token already trades (non-CEX, market cap and TVL both
//                    positive), shrunk toward the global median and clamped to [0.08, 0.60].
//                    Categories with fewer than 4 traded peers use the global median outright:
//                    one peer cannot price a category. On this snapshot the global median is
//                    0.246; calibrated multiples run from 0.114 (Liquid Staking, 9 peers) to
//                    0.600 (Cross Chain Bridge, 4 peers, clamped). The single traded Risk Curator
//                    is Api3, an oracle, not a curator vault, which is exactly why the 4-peer
//                    floor exists: 12 of the 40 watchlist rows are Risk Curators and they take
//                    the global median instead of one oracle's ratio.
//   base           = tvl_usd x base_multiple
//   growth         = clamp(change_7d, -30, 30) per cent; null growth counts as 0. One week is
//                    noisy: the starter let a single week move a row by 1.6x. A +4448% week
//                    (one protocol in this snapshot) is a launch spike, not a trend, so the cap
//                    is 30% and the weight is 0.8: growthMult in [0.76, 1.24].
//   growthMult     = 1 + (growth / 100) x 0.8
//   launch         = a launch-window curve on age_days, the time since first listing with no
//                    token. Under 90 days the protocol is unproven and ramps 0.75 -> 1.00;
//                    90 to 730 days is the prime window at 1.00; past 730 days it fades
//                    1.00 -> 0.80 by day 1460 and stays at 0.80: a protocol that has run four
//                    years with no token has had its window. Unknown age counts as 0.90.
//   chains         = 1 + 0.03 x min(chains - 1, 5): each extra chain up to five adds 3% for
//                    wider distribution; more chains than that add nothing further.
//   implied        = max(1, round(base x growthMult x launch x chains))
//
// No protocol name is ever special-cased: the same function scores every row, and the calibration
// itself is computed from the snapshot at run time, not written in as a table of numbers.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  min_multiple: number;
  max_multiple: number;
  min_peers: number;
  shrink_k: number;
  young_floor: number;
  young_days: number;
  prime_days: number;
  decline_days: number;
  decline_to: number;
  unknown_launch: number;
  chain_step: number;
  chain_max_steps: number;
  unknown_age_days: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.8,
  growth_floor: -30,
  growth_cap: 30,
  min_multiple: 0.08,
  max_multiple: 0.6,
  min_peers: 4,
  shrink_k: 5,
  young_floor: 0.75,
  young_days: 90,
  prime_days: 730,
  decline_days: 1460,
  decline_to: 0.8,
  unknown_launch: 0.9,
  chain_step: 0.03,
  chain_max_steps: 5,
  unknown_age_days: 365,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One category's calibration: the traded peers behind its multiple. */
export interface CategoryCalibration {
  category: string;
  peers: number;
  peer_median: number;
  multiple: number;
}

/** The whole calibration: the global median and one row per calibrated category. */
export interface Calibration {
  global_median: number;
  categories: CategoryCalibration[];
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    launch_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
    category_peers: number;
    category_peer_median: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  base_multiple: number;
  growth_multiplier: number;
  launch_multiplier: number;
  chain_multiplier: number;
  category_peers: number;
  watchlist: boolean;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  mcap_tvl_ratio: number | null;
}

/** Everything the dashboard needs: the board, the live set, the calibration and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  calibration: Calibration;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty sorted array, else `fallback`. */
function medianOf(sorted: number[], fallback: number): number {
  if (sorted.length === 0) return fallback;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, and not a wrapped, staked or
 * bridged product of a token that already trades. This is the watchlist's own exclusion rule,
 * applied to every row, not just the floor: a bridge, a liquid-staking product or a versioned
 * pool has no token of its own to launch (WBTC is Bitcoin on Ethereum, Binance staked ETH is
 * ETH in a staking product). The snapshot does not carry DefiLlama's parentProtocol field, so
 * the category and name rules are the whole check the ten fields allow. */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (EXCLUDED_CATEGORIES.has(p.category ?? '')) return false;
  if (VERSIONED.test(p.name)) return false;
  if (/\bwrapped\b|\bstaked\b|\bstaking\b/i.test(p.name)) return false;
  return !EXCHANGE_PREFIX.test(p.name);
}

/** Categories the watchlist rule keeps out: exchanges and wrapped, staked or bridged products. */
const EXCLUDED_CATEGORIES = new Set(['CEX', 'Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC']);

/** Names beginning with an exchange's name are that exchange's product, not a standalone launch. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/**
 * The category calibration, computed from the snapshot at run time: for every category, the
 * market-cap / TVL ratios of its protocols whose token already trades, and the multiple they
 * imply. The global median is the fallback for thin categories and the shrink target.
 */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const ratiosByCategory = new Map<string, number[]>();
  const allRatios: number[] = [];
  for (const p of snapshot.protocols) {
    if (isPreToken(p) || p.category === 'CEX') continue;
    if (p.mcap_usd === null || p.tvl_usd <= 0 || p.mcap_usd <= 0) continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    if (!Number.isFinite(ratio)) continue;
    allRatios.push(ratio);
    const list = ratiosByCategory.get(p.category ?? 'Other') ?? [];
    list.push(ratio);
    ratiosByCategory.set(p.category ?? 'Other', list);
  }
  allRatios.sort((a, b) => a - b);
  const globalMedian = medianOf(allRatios, 0.25);
  const categories: CategoryCalibration[] = [];
  for (const [category, ratios] of [...ratiosByCategory.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    if (ratios.length < model.min_peers) continue;
    const sorted = [...ratios].sort((a, b) => a - b);
    const peerMedian = medianOf(sorted, globalMedian);
    const w = ratios.length / (ratios.length + model.shrink_k);
    const multiple = Math.min(model.max_multiple, Math.max(model.min_multiple, w * peerMedian + (1 - w) * globalMedian));
    categories.push({ category, peers: ratios.length, peer_median: round4(peerMedian), multiple: round4(multiple) });
  }
  categories.sort((a, b) => b.multiple - a.multiple || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
  return { global_median: round4(globalMedian), categories };
}

/** A category's base multiple under a calibration: its own, or the global median when thin. */
export function baseMultipleFor(category: string | null, calibration: Calibration): { multiple: number; peers: number; peerMedian: number | null } {
  const found = calibration.categories.find((c) => c.category === (category ?? 'Other'));
  if (found === undefined) return { multiple: calibration.global_median, peers: 0, peerMedian: null };
  return { multiple: found.multiple, peers: found.peers, peerMedian: found.peer_median };
}

/** The launch-window factor for an age: ramp, prime window, fade, floor. */
export function launchMultiplier(age: number | null, model: ModelConstants): number {
  if (age === null) return model.unknown_launch;
  if (age < model.young_days) return model.young_floor + (1 - model.young_floor) * (age / model.young_days);
  if (age <= model.prime_days) return 1;
  if (age >= model.decline_days) return model.decline_to;
  return 1 - (1 - model.decline_to) * ((age - model.prime_days) / (model.decline_days - model.prime_days));
}

/** The chain-distribution factor: each extra chain up to five adds a step. */
export function chainMultiplier(chains: string[], model: ModelConstants): number {
  const extra = Math.min(Math.max(chains.length - 1, 0), model.chain_max_steps);
  return 1 + extra * model.chain_step;
}

/** The multipliers and the implied value one protocol gets under `model` and `calibration`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  calibration: Calibration,
): { implied: number; baseMultiple: number; growthPct: number; growthMult: number; launchMult: number; chainMult: number; age: number | null; peers: number; peerMedian: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple, peers, peerMedian } = baseMultipleFor(protocol.category, calibration);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const launchMult = launchMultiplier(age, model);
  const chainMult = chainMultiplier(protocol.chains, model);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * launchMult * chainMult));
  return { implied, baseMultiple: multiple, growthPct, growthMult, launchMult, chainMult, age, peers, peerMedian };
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const calibration = calibrate(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol BELOW the watchlist floor, by
  // no cap at all. Nothing at or above the floor that the watchlist leaves out is taken: the
  // snapshot's ten fields cannot show DefiLlama's parentProtocol, so an above-floor protocol
  // the house left out is most often a sub-product of another protocol (a curator arm, an
  // exchange's bridge, a market's international entity), and this model cannot tell it apart
  // from a standalone launch. Below the floor the same blind spot remains, but the rows are
  // small and the starter took them on the same terms.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && p.tvl_usd < snapshot.floor_usd && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const s = impliedValue(p, snapshot.as_of, model, calibration);
    return { p, ...s };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_multiple: s.baseMultiple,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      launch_multiplier: round4(s.launchMult),
      chain_multiplier: round4(s.chainMult),
      age_days: s.age,
      category_peers: s.peers,
      category_peer_median: s.peerMedian,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** What one transaction costs on a chain, in the words a farmer budgets with. */
function gasFor(chain: string): string {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 'about $8 of gas';
  if (c === 'solana') return 'about $0.50 of gas';
  if (c === 'base' || c === 'arbitrum' || c === 'optimism' || c === 'polygon' || c === 'zksync era' || c === 'linea' || c === 'scroll' || c === 'blast' || c === 'mode' || c === 'world chain') return 'about $1 of gas';
  return 'about $2 of gas';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the vault shares.`;
  if (c.includes('basis')) return `Open a $${capital} delta-neutral position on ${name}: hold the spot leg and short the matching perpetual on ${chain}.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('governance')) return `Deposit $${capital} with ${name} on ${chain} and vote in one governance proposal.`;
  if (c === 'chain') return `Bridge $${capital} of USDC to ${chain} through its official bridge and use two of its native apps.`;
  if (c.includes('payment')) return `Pay or receive $${capital} through ${name} on ${chain} and keep the receipt.`;
  if (c.includes('cedefi')) return `Deposit $${capital} into ${name}'s managed vault on ${chain} and keep the vault shares.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's weekly qualifying action, in the words a farmer can follow. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('curator') || c.includes('allocator')) return 'Rebalance or top up the vault once a week and record the new share price.';
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'Borrow a small amount against the deposit once a week, repay it, and record the interest.';
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return 'Claim or compound the pool fees once a week and record the position value.';
  if (c.includes('staking') || c.includes('restak')) return 'Check the staking rewards once a week and restake what is claimable.';
  if (c.includes('rwa')) return 'Check the yield accrual once a week and record the new balance.';
  if (c.includes('basis')) return 'Check the funding rate once a week and rebalance the hedge if it has moved.';
  if (c.includes('bridge')) return 'Bridge a small amount back and forth once a week to keep the route active.';
  if (c.includes('governance')) return 'Vote in one new proposal each week and record how you voted.';
  return 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.';
}

/** The risk check before topping up, written from the protocol's own seven-day move. */
function riskCheckText(p: SnapshotProtocol): string {
  const g = p.change_7d;
  if (g !== null && g <= -20) return `The value already fell ${Math.abs(g).toFixed(2)}% in the last week. Wait for a flat week before topping up, and check the protocol again before adding more.`;
  if (g !== null && g >= 20) return `The value rose ${g.toFixed(2)}% in the last week. Let the move settle before topping up, and do not chase it with a larger deposit.`;
  return `If TVL falls by more than a fifth in a week, wait before topping up.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of
 * names. The gas line follows the first chain: Ethereum costs the most, Solana the least, the
 * low-fee rollups sit in between.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasFor(chain);
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: `${gas} for the first transaction`,
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and ${gas}`,
      time: '15 minutes to set up',
    },
    {
      text: weeklyFor(p),
      cost: `${gas} a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before adding more capital, check the protocol's TVL trend and its risk page: ${riskCheckText(p)}`,
      cost: 'no fee to check',
      time: '10 minutes',
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log, and set a date to unwind: withdraw the capital first, then the yield, and record both.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      mcap_tvl_ratio: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, watchlist: Set<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    base_multiple: row.model.base_multiple,
    growth_multiplier: row.model.growth_multiplier,
    launch_multiplier: row.model.launch_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    category_peers: row.model.category_peers,
    watchlist: watchlist.has(row.slug),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const calibration = calibrate(snapshot, model);
  const live = liveRows(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const early = board.filter((r) => !watchlist.has(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    calibration,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map((r) => radarRow(r, watchlist)),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
