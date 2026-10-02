import type { Category, NormalizedLandmark } from "@mediapipe/tasks-vision";

export function getScore(categories: Category[] | undefined, name: string): number {
  if (!categories) return 0;
  const cat = categories.find((c) => c.categoryName === name);
  return cat ? cat.score : 0;
}

export function avg(...vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Classic 6-point Eye Aspect Ratio (EAR) computed from mesh landmarks. */
export function computeEAR(landmarks: NormalizedLandmark[]) {
  const leftEAR =
    (dist(landmarks[159], landmarks[145]) + dist(landmarks[158], landmarks[153])) /
    (2 * dist(landmarks[33], landmarks[133]) + 1e-6);

  const rightEAR =
    (dist(landmarks[386], landmarks[374]) + dist(landmarks[385], landmarks[380])) /
    (2 * dist(landmarks[362], landmarks[263]) + 1e-6);

  return { leftEAR, rightEAR, avgEAR: (leftEAR + rightEAR) / 2 };
}

/** Rough, landmark-geometry based head-pose estimate (not true Euler angles, but stable & good enough for UI). */
export function computeHeadPose(landmarks: NormalizedLandmark[]) {
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const nose = landmarks[1];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];

  const faceWidth = dist(leftCheek, rightCheek) || 1e-6;
  const faceHeight = dist(forehead, chin) || 1e-6;

  const midX = (leftCheek.x + rightCheek.x) / 2;
  const midY = (forehead.y + chin.y) / 2;

  const yaw = ((nose.x - midX) / faceWidth) * 180; // negative = looking viewer-left
  const pitch = ((nose.y - midY) / faceHeight) * 180; // negative = looking up
  const roll = (Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x) * 180) / Math.PI;

  return { yaw, pitch, roll };
}

export type Expression =
  | "Happy"
  | "Surprised"
  | "Angry"
  | "Sad"
  | "Sleepy"
  | "Focused"
  | "Neutral";

export interface ExpressionScores {
  smile: number;
  browRaise: number;
  browDown: number;
  jawOpen: number;
  frown: number;
  squint: number;
  eyeOpenness: number;
}

export function classifyExpression(s: ExpressionScores): Expression {
  if (s.jawOpen > 0.45 && s.browRaise > 0.25) return "Surprised";
  if (s.smile > 0.4) return "Happy";
  if (s.frown > 0.35 && s.browDown > 0.25) return "Sad";
  if (s.browDown > 0.45 && s.squint > 0.3) return "Angry";
  if (s.eyeOpenness < 0.35 && s.jawOpen < 0.1) return "Sleepy";
  if (s.squint > 0.35) return "Focused";
  return "Neutral";
}

export function headDirectionLabel(yaw: number, pitch: number): string {
  const yawThresh = 8;
  const pitchThresh = 7;
  const vertical = pitch > pitchThresh ? "Down" : pitch < -pitchThresh ? "Up" : "";
  const horizontal = yaw > yawThresh ? "Left" : yaw < -yawThresh ? "Right" : "";
  if (!vertical && !horizontal) return "Center";
  return [vertical, horizontal].filter(Boolean).join(" ");
}

export function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
