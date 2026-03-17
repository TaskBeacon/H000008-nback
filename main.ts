import {
  BlockUnit,
  StimBank,
  SubInfo,
  TaskSettings,
  TrialBuilder,
  mountTaskApp,
  next_trial_id,
  parsePsyflowConfig,
  reset_trial_counter,
  type CompiledTrial,
  type Resolvable,
  type RuntimeView,
  type StimRef,
  type StimSpec,
  type TrialSnapshot
} from "psyflow-web";

import configText from "./config/config.yaml?raw";
import { run_trial } from "./src/run_trial";
import { generate_nback_conditions, summarizeMatchAccuracy } from "./src/utils";

const instruction1BackVoiceAsset = new URL("./assets/instruction_1back_voice.mp3", import.meta.url).href;
const instruction2BackVoiceAsset = new URL("./assets/instruction_2back_voice.mp3", import.meta.url).href;

function buildWaitTrial(
  meta: { trial_id: string; condition: string; trial_index: number },
  blockId: string | null,
  unitLabel: string,
  stimInputs: Array<Resolvable<StimRef | StimSpec | null>>
): CompiledTrial {
  const trial = new TrialBuilder({
    trial_id: meta.trial_id,
    block_id: blockId,
    trial_index: meta.trial_index,
    condition: meta.condition
  });
  trial.unit(unitLabel).addStim(...stimInputs).waitAndContinue();
  return trial.build();
}

export async function run(root: HTMLElement): Promise<void> {
  const parsed = parsePsyflowConfig(configText, import.meta.url);
  const settings = TaskSettings.from_dict(parsed.task_config);
  const subInfo = new SubInfo(parsed.subform_config);
  const stimBank = new StimBank(parsed.stim_config);

  settings.triggers = parsed.trigger_config;

  if (settings.voice_enabled) {
    stimBank.convert_to_voice(["instruction_1back", "instruction_2back"], {
      voice: String(settings.voice_name ?? "zh-CN-YunyangNeural"),
      rate: 1,
      assetFiles: {
        instruction_1back: instruction1BackVoiceAsset,
        instruction_2back: instruction2BackVoiceAsset
      },
      fallbackToSpeech: false
    });
  }

  await mountTaskApp({
    root,
    task_id: "H000008-nback",
    task_name: "N-Back Task",
    task_description: "HTML preview aligned to the local psyflow N-Back procedure and parameters.",
    settings,
    subInfo,
    stimBank,
    buildTrials: (): CompiledTrial[] => {
      reset_trial_counter();
      const compiledTrials: CompiledTrial[] = [];
      const totalBlocks = Math.max(1, Number(settings.total_blocks ?? 1));

      for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex += 1) {
        const blockId = `block_${blockIndex}`;
        const halfPoint = Math.floor(totalBlocks / 2);
        const nBack = blockIndex < halfPoint ? 1 : 2;
        const instructionLabel = `instruction_${nBack}back`;
        const instructionInputs: Array<Resolvable<StimRef | StimSpec | null>> = [stimBank.get(instructionLabel)];
        if (settings.voice_enabled) {
          instructionInputs.push(stimBank.get(`${instructionLabel}_voice`));
        }
        compiledTrials.push(
          buildWaitTrial(
            {
              trial_id: `${instructionLabel}_${blockIndex}`,
              condition: instructionLabel,
              trial_index: -1 - blockIndex
            },
            null,
            instructionLabel,
            instructionInputs
          )
        );

        const block = new BlockUnit({
          block_id: blockId,
          block_idx: blockIndex,
          settings
        }).generate_conditions({
          func: generate_nback_conditions,
          args: [nBack]
        });

        block.conditions.forEach((condition, trialIndex) => {
          const trial = new TrialBuilder({
            trial_id: next_trial_id(),
            block_id: block.block_id,
            trial_index: trialIndex,
            condition
          });
          run_trial(trial, condition, {
            settings,
            stimBank,
            n_back: nBack,
            block_id: block.block_id,
            block_idx: blockIndex
          });
          compiledTrials.push(trial.build());
        });

        compiledTrials.push(
          buildWaitTrial(
            {
              trial_id: `block_break_${blockIndex}`,
              condition: "block_break",
              trial_index: Number(block.conditions.length) + blockIndex
            },
            block.block_id,
            "block_break",
            [
              (_snapshot: TrialSnapshot, runtime: RuntimeView) => {
                const summary = summarizeMatchAccuracy(runtime.getReducedRows(), block.block_id);
                return stimBank.get_and_format("block_break", {
                  block_num: blockIndex + 1,
                  total_blocks: settings.total_blocks,
                  acc: summary.acc.toFixed(2)
                });
              }
            ]
          )
        );
      }

      compiledTrials.push(
        buildWaitTrial(
          {
            trial_id: "goodbye",
            condition: "goodbye",
            trial_index: Number(settings.total_trials ?? 0)
          },
          null,
          "goodbye",
          [stimBank.get("good_bye")]
        )
      );

      return compiledTrials;
    }
  });
}

export async function main(root: HTMLElement): Promise<void> {
  await run(root);
}

export default main;
