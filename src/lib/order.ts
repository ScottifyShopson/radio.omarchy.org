/* The order the transport walks when shuffle is on.
 *
 * The list on screen does not move — a row keeps the number it has in the
 * playlist, the way it does while the find box is filtering. This is only
 * which song comes next, and it is only the playlist's: an episode still
 * follows the one before it.
 *
 * A pass is every song once. Prev walks back through what was actually
 * heard, rather than shuffling again aimed the other way. At the end of a
 * pass a new one starts, and the song that just finished is not the first
 * of it — a shuffle that repeats itself is not a shuffle.
 *
 * The deck holds one of these and this file updates it. `npm test` walks
 * the same functions, so the rule cannot drift into something the button
 * does not do.
 */

export interface Walk {
  /** Still to play, not including the one playing. */
  ahead: number[];
  /** Already heard, oldest first, not including the one playing. */
  behind: number[];
}

/** `rng` returns a number in [0, 1). */
export type Rng = () => number;

export function emptyWalk(): Walk {
  return { ahead: [], behind: [] };
}

export function dropWalk(walk: Walk): void {
  walk.ahead = [];
  walk.behind = [];
}

/** Where a shuffled deck opens, when nobody named a song. */
export function openingIndex(n: number, rng: Rng): number {
  if (n <= 0) return -1;
  if (n === 1) return 0;
  return Math.floor(rng() * n);
}

/* Every index but `skip`, Fisher–Yates. `skip` of -1, or anything outside
   the list, deals the whole of it. */
function deal(n: number, skip: number, rng: Rng): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) if (i !== skip) a.push(i);
  for (let j = a.length - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    const t = a[j]!;
    a[j] = a[k]!;
    a[k] = t;
  }
  return a;
}

function inList(i: number, n: number): boolean {
  return i >= 0 && i < n;
}

/** Where next goes. The walk is updated; the index to play is returned. */
export function stepNext(walk: Walk, n: number, current: number, rng: Rng): number {
  if (n <= 1) return n === 1 ? 0 : -1;
  if (inList(current, n)) walk.behind.push(current);
  if (!walk.ahead.length) walk.ahead = deal(n, current, rng);
  while (walk.ahead.length && (!inList(walk.ahead[0]!, n) || walk.ahead[0] === current)) {
    walk.ahead.shift();
  }
  if (!walk.ahead.length) walk.ahead = deal(n, current, rng);
  const next = walk.ahead.shift();
  return next === undefined ? (current + 1 + n) % n : next;
}

/** Where prev goes, or null when this shuffle has no past yet — the caller
    walks the playlist, which is the honest answer to a question it has not
    been asked before. */
export function stepPrev(walk: Walk, n: number, current: number): number | null {
  while (walk.behind.length) {
    const i = walk.behind.pop()!;
    if (!inList(i, n) || i === current) continue;
    if (inList(current, n)) walk.ahead.unshift(current);
    return i;
  }
  return null;
}

/** A row was pressed. It plays now, so it is no longer waiting, and the one
    that was playing is what prev will return to. */
export function take(walk: Walk, n: number, current: number, chosen: number): void {
  if (!inList(chosen, n)) return;
  if (inList(current, n) && current !== chosen) walk.behind.push(current);
  walk.ahead = walk.ahead.filter((i) => i !== chosen && inList(i, n));
}
