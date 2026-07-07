// Lazy-loads the MediaPipe FaceMesh bundle and provides a singleton preinitialized instance for the exam session.

const BASE_PATH = "/mediapipe/face_mesh";
const FACE_MESH_SRC = `${BASE_PATH}/face_mesh.js`;
const FACE_MESH_ASSETS = [
  "face_mesh.binarypb",
  "face_mesh_solution_packed_assets.data",
  "face_mesh_solution_packed_assets_loader.js",
  "face_mesh_solution_simd_wasm_bin.data",
  "face_mesh_solution_simd_wasm_bin.js",
  "face_mesh_solution_simd_wasm_bin.wasm",
  "face_mesh_solution_wasm_bin.js",
  "face_mesh_solution_wasm_bin.wasm",
];

let loadPromise = null;
let sharedFaceMesh = null;
let sharedFaceMeshPromise = null;

const getAssetUrl = (asset) => `${BASE_PATH}/${asset}`;

export function loadFaceMesh() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("FaceMesh can only be loaded in a browser"));
  }
  if (window.FaceMesh) return Promise.resolve(window.FaceMesh);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${FACE_MESH_SRC}"]`);
    const script = existing || document.createElement("script");

    const onLoad = () => {
      if (window.FaceMesh) {
        resolve(window.FaceMesh);
      } else {
        loadPromise = null;
        reject(
          new Error(
            "MediaPipe FaceMesh script loaded but window.FaceMesh is undefined."
          )
        );
      }
    };

    const onError = () => {
      loadPromise = null;
      reject(new Error(`Failed to load MediaPipe FaceMesh from ${FACE_MESH_SRC}`));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existing) {
      script.src = FACE_MESH_SRC;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    } else if (window.FaceMesh) {
      onLoad();
    }
  });

  return loadPromise;
}

export async function preloadFaceMeshAssets() {
  if (typeof window === "undefined") return;
  await Promise.all(
    [FACE_MESH_SRC, ...FACE_MESH_ASSETS].map((asset) =>
      fetch(getAssetUrl(asset), { cache: "force-cache", mode: "same-origin" }).catch(
        () => null
      )
    )
  );
}

export async function initializeFaceMesh({ locateFile } = {}) {
  if (typeof window === "undefined") {
    return null;
  }
  if (sharedFaceMesh) return sharedFaceMesh;
  if (sharedFaceMeshPromise) return sharedFaceMeshPromise;

  sharedFaceMeshPromise = (async () => {
    await preloadFaceMeshAssets();
    const FaceMeshCtor = await loadFaceMesh();
    if (!FaceMeshCtor) {
      throw new Error("MediaPipe FaceMesh constructor unavailable after load.");
    }

    const faceMesh = new FaceMeshCtor({
      locateFile: locateFile || ((file) => getAssetUrl(file)),
    });

    faceMesh.setOptions({
      maxNumFaces: 5,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    if (typeof faceMesh.initialize === "function") {
      await faceMesh.initialize();
    }

    sharedFaceMesh = faceMesh;
    return sharedFaceMesh;
  })().catch((err) => {
    sharedFaceMeshPromise = null;
    throw err;
  });

  return sharedFaceMeshPromise;
}

export async function getFaceMesh() {
  if (sharedFaceMesh) return sharedFaceMesh;
  return initializeFaceMesh();
}

export function resetFaceMesh() {
  sharedFaceMesh?.reset?.();
}
