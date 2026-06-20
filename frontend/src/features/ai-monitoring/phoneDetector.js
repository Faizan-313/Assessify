//Lightweight wrapper around @tensorflow-models/coco-ssd for detecting phones
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

import { PHONE_CONFIDENCE } from "./constants.js";

let modelPromise = null;

export function loadPhoneModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      return cocoSsd.load({ base: "mobilenet_v2" });
    })();
  }
  return modelPromise;
}

//Runs detection on the given video element and returns true if a cell phone is detected with confidence >= PHONE_CONFIDENCE.
export async function detectPhone(model, video) {
  if (!model || !video || video.readyState !== 4) return false;
  try {
    const predictions = await model.detect(video, 10);

    const phone = predictions.find((p) => p.class === "cell phone" && p.score >= PHONE_CONFIDENCE);

    if (predictions.length > 0) {
      console.debug(
        "[phoneDetector]",
        predictions.map((p) => `${p.class}:${p.score.toFixed(2)}`).join(", ")
      );
    }

    return !!phone;
  } catch (err) {
    console.error("[phoneDetector] detect failed:", err);
    return false;
  }
}
