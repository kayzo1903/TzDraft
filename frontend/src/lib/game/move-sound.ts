import type { Position } from "@tzdraft/mkaguzi-engine";

export type MoveSoundKind = "normal" | "long" | "capture";

type MoveSoundInput = {
  from: Position;
  to: Position;
  capturedCount: number;
};

type MoveAudioSet = {
  normal: HTMLAudioElement | null;
  long: HTMLAudioElement | null;
  capture: HTMLAudioElement | null;
  multiCapture?: HTMLAudioElement | null;
};

const playAudioOnce = (audio: HTMLAudioElement | null): void => {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

const playMultiCaptureCombo = ({
  capture,
  multiCapture,
}: Pick<MoveAudioSet, "capture" | "multiCapture">): void => {
  playAudioOnce(capture);

  const followUp = multiCapture ?? capture;
  if (!followUp) return;

  window.setTimeout(() => {
    playAudioOnce(followUp);
  }, 95);
};

export const getMoveSoundKind = ({
  from,
  to,
  capturedCount,
}: MoveSoundInput): MoveSoundKind => {
  if (capturedCount > 1) return "capture";
  if (capturedCount > 0) return "capture";

  const fromRowCol = from.toRowCol();
  const toRowCol = to.toRowCol();
  const travel = Math.max(
    Math.abs(toRowCol.row - fromRowCol.row),
    Math.abs(toRowCol.col - fromRowCol.col),
  );

  return travel > 1 ? "long" : "normal";
};

export const playMoveSound = (
  input: MoveSoundInput,
  sounds: MoveAudioSet,
): void => {
  if (input.capturedCount > 1) {
    playMultiCaptureCombo(sounds);
    return;
  }

  const kind = getMoveSoundKind(input);
  const audio =
    kind === "capture"
      ? sounds.capture
      : kind === "long"
        ? sounds.long
        : sounds.normal;

  playAudioOnce(audio);
};
