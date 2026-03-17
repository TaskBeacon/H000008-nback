import {
  set_trial_context,
  type StimBank,
  type TaskSettings,
  type TrialBuilder
} from "psyflow-web";

function resolveConditionTag(rawTag: string): "match" | "nomatch" {
  return rawTag === "match" ? "match" : "nomatch";
}

export function run_trial(
  trial: TrialBuilder,
  condition: string,
  context: {
    settings: TaskSettings;
    stimBank: StimBank;
    n_back: number;
    block_id: string;
    block_idx: number;
  }
): TrialBuilder {
  const { settings, stimBank, n_back, block_id, block_idx } = context;
  const condition_id = String(condition);
  const [rawTag = "nomatch", digit = "1"] = condition_id.split("_");
  const conditionTag = resolveConditionTag(rawTag);
  const key_list = ((settings.key_list as string[]) ?? ["space", "up"]).map(String);
  const trigger_map = (settings.triggers ?? {}) as Record<string, unknown>;
  const correct_key = String(
    conditionTag === "match" ? settings.match_key ?? "space" : settings.nomatch_key ?? "up"
  );
  const trigger_pad = n_back === 1 ? 10 : 20;

  const probeUnit = trial.unit("nback_probe").addStim(stimBank.rebuild("stim_digit", { text: digit }));
  set_trial_context(probeUnit, {
    trial_id: trial.trial_id,
    phase: "nback_probe_response",
    deadline_s: Number(settings.probe_duration ?? 0.8),
    valid_keys: [...key_list],
    block_id,
    condition_id,
    task_factors: {
      condition: condition_id,
      stage: "nback_probe_response",
      n_back: Number(n_back),
      digit,
      block_idx
    },
    stim_id: "stim_digit"
  });
  probeUnit
    .captureResponse({
      keys: key_list,
      correct_keys: correct_key,
      duration: Number(settings.probe_duration ?? 0.8),
      response_trigger: Number(trigger_map.key_press ?? 4) + trigger_pad,
      timeout_trigger: Number(trigger_map.no_response ?? 5) + trigger_pad,
      terminate_on_response: true
    })
    .to_dict();

  const itiUnit = trial.unit("iti").addStim(stimBank.get("stim_iti"));
  set_trial_context(itiUnit, {
    trial_id: trial.trial_id,
    phase: "inter_trial_interval",
    deadline_s: Number(settings.iti_duration ?? 1.2),
    valid_keys: [...key_list],
    block_id,
    condition_id,
    task_factors: {
      condition: condition_id,
      stage: "inter_trial_interval",
      n_back: Number(n_back),
      block_idx
    },
    stim_id: "stim_iti"
  });
  itiUnit.show({ duration: Number(settings.iti_duration ?? 1.2) }).to_dict();

  return trial;
}
