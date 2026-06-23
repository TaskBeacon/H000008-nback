import { PythonRandom, type ReducedTrialRow } from "psyflow-web";

function pickOne<T>(items: T[], rng: PythonRandom): T {
  const index = rng.randBelow(items.length);
  return items[Math.max(0, Math.min(items.length - 1, index))] as T;
}

export function generate_nback_conditions(
  n_trial_list: number,
  condition_labels: string[] = ["match", "nomatch"],
  n_back = 2,
  seed = 2025,
  options: {
    digits?: string[];
    match_ratio?: number;
    min_nonmatch_start?: number;
    max_match_run?: number;
  } = {}
): string[] {
  const labels = condition_labels.length >= 2 ? condition_labels : ["match", "nomatch"];
  const match_label = String(labels[0] ?? "match");
  const no_match_label = String(labels[1] ?? "nomatch");
  const digits = options.digits ?? Array.from({ length: 9 }, (_, idx) => String(idx + 1));
  const match_ratio = Number(options.match_ratio ?? 0.3);
  const min_nonmatch_start = Number(options.min_nonmatch_start ?? 3);
  const max_match_run = Number(options.max_match_run ?? 3);
  const rng = new PythonRandom(Number(seed));

  const trial_list: string[] = [];
  const digit_buffer: string[] = [];
  let match_streak = 0;
  const totalTrials = Math.max(0, Math.floor(Number(n_trial_list)));
  const nBack = Math.max(1, Math.floor(Number(n_back)));

  for (let i = 0; i < totalTrials; i += 1) {
    let digit = "";
    let label = "";
    if (i < Math.max(nBack, min_nonmatch_start)) {
      digit = pickOne(digits, rng);
      while (digit_buffer.length >= nBack && digit === digit_buffer[digit_buffer.length - nBack]) {
        digit = pickOne(digits, rng);
      }
      label = `${no_match_label}_${digit}`;
      match_streak = 0;
    } else {
      const canMatch = rng.random() < match_ratio && match_streak < max_match_run;
      if (canMatch) {
        digit = digit_buffer[digit_buffer.length - nBack] ?? pickOne(digits, rng);
        label = `${match_label}_${digit}`;
        match_streak += 1;
      } else {
        digit = pickOne(digits, rng);
        while (digit === digit_buffer[digit_buffer.length - nBack]) {
          digit = pickOne(digits, rng);
        }
        label = `${no_match_label}_${digit}`;
        match_streak = 0;
      }
    }
    digit_buffer.push(digit);
    trial_list.push(label);
  }

  return trial_list;
}

export function summarizeMatchAccuracy(
  rows: ReducedTrialRow[],
  blockId: string
): { acc: number; count: number } {
  const matchRows = rows.filter(
    (row) => row.block_id === blockId && String(row.condition ?? "").startsWith("match")
  );
  if (matchRows.length === 0) {
    return {
      acc: 0,
      count: 0
    };
  }
  const hits = matchRows.filter((row) => row.nback_probe_hit === true).length;
  return {
    acc: hits / matchRows.length,
    count: matchRows.length
  };
}
