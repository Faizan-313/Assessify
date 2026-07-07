// Proctoring configuration 

// How long (ms) a condition must persist before it is reported as an anomaly.
export const DEFAULT_PERSIST_MS = 1500;

// How long we sample the neutral pose at session start before switching to monitoring.
export const CALIBRATION_MS = 1000;

// Head-pose thresholds. These are applied AFTER baseline subtraction.
export const YAW_THRESHOLD = 0.16;        //deg of head rotation
export const PITCH_UP_THRESHOLD = 0.06;   //nose.y negative = looking up
export const PITCH_DOWN_THRESHOLD = 0.09; // looking down (notes/keyboard)

// Gaze thresholds — iris offset from eye-corner midpoint, normalized by eye width. These are applied AFTER baseline subtraction.
export const GAZE_X_THRESHOLD = 0.12;     // was 0.07
export const GAZE_Y_THRESHOLD = 0.06;     // was 0.04

// Phone detection — how often (ms) we run the object detector, and the minimum model confidence to accept a "cell phone" detection.
export const PHONE_DETECT_INTERVAL_MS = 500;
export const PHONE_CONFIDENCE = 0.4;

// MediaPipe FaceMesh key landmark indices we use.
export const LM = {
  noseTip: 1,
  chin: 152,
  forehead: 10,
  leftFace: 234,
  rightFace: 454,

  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,

  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,

  leftIris: 468,
  rightIris: 473,
};

// messages for each anomaly key.
export const ANOMALY_MESSAGES = {
  no_face: "No face detected",
  multiple_faces: "Multiple faces detected",
  head_left: "Head turned left",
  head_right: "Head turned right",
  head_up: "Head tilted up",
  head_down: "Head tilted down",
  gaze_left: "Looking left",
  gaze_right: "Looking right",
  gaze_up: "Looking up",
  gaze_down: "Looking down",
  phone_detected: "Mobile phone detected",
};
