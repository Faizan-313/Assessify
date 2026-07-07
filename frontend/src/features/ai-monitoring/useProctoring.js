import { useEffect, useRef, useState } from "react";
import { AnomalyTracker } from "./AnomalyTracker.js";
import { computeHeadPose } from "./headPose.js";
import { computeGaze } from "./gaze.js";
import { classifyHead, classifyGaze } from "./classifiers.js";
import { getFaceMesh } from "./loadFaceMesh.js";
import {
  ANOMALY_MESSAGES,
  DEFAULT_PERSIST_MS,
  CALIBRATION_MS,
} from "./constants.js";

/**
 * Flow:
 *   1. phase = "initializing" — loading the FaceMesh model.
 *   2. phase = "calibrating"  — sampling the user's neutral pose for CALIBRATION_MS.
 *   3. phase = "monitoring"   — firing anomalies relative to the baseline.
 *
 * Usage:
 *   const { webcamRef, status, anomalies, phase } = useProctoring({ enabled });
 *
 * @returns {{
 *   webcamRef: React.RefObject,
 *   phase: "initializing" | "calibrating" | "monitoring",
 *   status: { faces, head, gaze, yaw, pitch, roll },
 *   anomalies: Array<{id,key,message,startTime,endTime?,durationMs?}>
 * }}
 */
export function useProctoring({
  enabled,
  persistMs = DEFAULT_PERSIST_MS,
  onAnomalyStart,
  onAnomalyEnd,
} = {}) {
  const webcamRef = useRef(null);
  const rafRef = useRef(null);
  const faceMeshRef = useRef(null);
  const trackerRef = useRef(null);

  // Calibration state — held in a ref so the render loop has live access
  const baselineRef = useRef(null);
  const calibStateRef = useRef(null);

  const [phase, setPhase] = useState("initializing");
  const statusRef = useRef({
    faces: 0,
    head: "center",
    gaze: "center",
    yaw: 0,
    pitch: 0,
    roll: 0,
  });
  const [anomalies, setAnomalies] = useState([]);

  const cbStart = useRef(onAnomalyStart);
  const cbEnd = useRef(onAnomalyEnd);
  cbStart.current = onAnomalyStart;
  cbEnd.current = onAnomalyEnd;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let tracker = null;
    let faceMesh = null;

    // Anomaly tracker 
    tracker = new AnomalyTracker({
      persistMs,
      onStart: ({ id, key, startTime }) => {
        const entry = {
          id,
          key,
          message: ANOMALY_MESSAGES[key] ?? key,
          startTime,
        };
        setAnomalies((prev) => [entry, ...prev].slice(0, 200));
        cbStart.current?.(entry);
      },
      onEnd: ({ id, endTime, durationMs, key }) => {
        setAnomalies((prev) =>
          prev.map((a) => (a.id === id ? { ...a, endTime, durationMs } : a))
        );
        cbEnd.current?.({ id, key, endTime, durationMs });
      },
    });
    trackerRef.current = tracker;

    const handleResults = (results) => {
      const faces = results.multiFaceLandmarks || [];
      const faceCount = faces.length;

      let pose = { yaw: 0, pitch: 0, roll: 0 };
      let gaze = { x: 0, y: 0 };
      let lm = null;
      if (faceCount > 0) {
        lm = faces[0];
        pose = computeHeadPose(lm);
        gaze = computeGaze(lm);
      }

      //Phase: calibrating 
      const calib = calibStateRef.current;
      if (calib) {
        if (faceCount === 1) {
          calib.samples.push({
            yaw: pose.yaw,
            pitch: pose.pitch,
            roll: pose.roll,
            gazeX: gaze.x,
            gazeY: gaze.y,
          });
        }
        const elapsed = performance.now() - calib.startedAt;
        if (elapsed >= CALIBRATION_MS && calib.samples.length >= 5) {
          const avg = (k) =>
            calib.samples.reduce((s, v) => s + v[k], 0) / calib.samples.length;
          baselineRef.current = {
            yaw: avg("yaw"),
            pitch: avg("pitch"),
            roll: avg("roll"),
            gazeX: avg("gazeX"),
            gazeY: avg("gazeY"),
          };
          calibStateRef.current = null;
          setPhase("monitoring");
        }
        // During calibration, still track a live status but don't fire anomalies.
        statusRef.current = {
          faces: faceCount,
          head: "—",
          gaze: "—",
          yaw: pose.yaw,
          pitch: pose.pitch,
          roll: pose.roll,
        };
        return;
      }

      //Phase: monitoring
      const active = new Set();
      if (faceCount === 0) active.add("no_face");
      if (faceCount > 1) active.add("multiple_faces");

      let headState = null;
      let gazeState = null;
      if (faceCount > 0) {
        headState = classifyHead(pose, baselineRef.current);
        gazeState = classifyGaze(gaze, baselineRef.current);
        if (headState) active.add(headState);
        if (gazeState) active.add(gazeState);
      }

      tracker.update(active);

      statusRef.current = {
        faces: faceCount,
        head: headState ? headState.replace("head_", "") : "center",
        gaze: gazeState ? gazeState.replace("gaze_", "") : "center",
        yaw: pose.yaw,
        pitch: pose.pitch,
        roll: pose.roll,
      };
    };

    //Main detection loop
    const loop = async () => {
      if (cancelled || !faceMesh) return;
      const video = webcamRef.current?.video;
      if (video && video.readyState === 4) {
        // Kick off calibration the moment the video is ready.
        if (!calibStateRef.current && !baselineRef.current && !cancelled) {
          calibStateRef.current = {
            startedAt: performance.now(),
            samples: [],
          };
          setPhase("calibrating");
        }
        try {
          await faceMesh.send({ image: video });
        } catch (err) {
          console.error("[useProctoring] FaceMesh send failed:", err);
        }
      }
      if (!cancelled) rafRef.current = requestAnimationFrame(loop);
    };

    // Main detection loop
    (async () => {
      try {
        faceMesh = await getFaceMesh();
      } catch {
        return;
      }
      if (cancelled || !faceMesh) return;

      faceMesh.reset?.();
      faceMesh.setOptions({
        maxNumFaces: 5,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      faceMesh.onResults(handleResults);
      faceMeshRef.current = faceMesh;
      setPhase((p) => (p === "initializing" ? "calibrating" : p));

      if (!cancelled) loop();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      tracker?.flush();
      faceMeshRef.current = null;
      trackerRef.current = null;
      baselineRef.current = null;
      calibStateRef.current = null;
    };
  }, [enabled, persistMs]);

  return { webcamRef, statusRef, anomalies, phase };
}
