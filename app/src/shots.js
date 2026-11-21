// Deterministic screenshot scenes. Shot mode is driven by the URL query:
//   ?shot=cover&photo=boulevard&caption=NEON%20VICE
//   ?shot=cover2&photo=pier&caption=PIER%20PRESSURE
//   ?shot=editor / ?shot=editor2
// No Date, no unseeded randomness: every shot renders the same every run.

export const SHOT_PARAM = "shot";

export function shotParams() {
  const q = new URLSearchParams(location.search);
  return {
    shot: q.get("shot") || "",
    photo: q.get("photo") || "boulevard",
    caption: q.get("caption") || "",
  };
}

export function isShotMode() {
  return shotParams().shot !== "";
}

function photoSrc(name) {
  return name === "pier" ? "samples/pier.jpg" : "samples/boulevard.jpg";
}

// Apply a scene to a fresh state object. Returns the scene kind:
// "cover" hides the editor chrome, "editor" keeps it.
export function applyShot(state, params) {
  const other = params.photo === "pier" ? "boulevard" : "pier";
  const pick = (i) => (i % 2 === 0 ? photoSrc(params.photo) : photoSrc(other));
  state.seed = 42;
  state.grain = true;
  state.vignette = true;
  state.halftone = true;
  state.panels.forEach((p, i) => {
    p.src = pick(i);
    p.zoom = 1;
    p.x = 0;
    p.y = 0;
  });
  if (params.caption) state.title = params.caption.toUpperCase();
  switch (params.shot) {
    case "cover":
      state.layout = "hero3";
      state.grade = "sunset";
      state.subtitle = "Vice City Nights";
      state.badge = "EST. 2026";
      state.heat = 5;
      return "cover";
    case "cover2":
      state.layout = "tilted";
      state.grade = "neon";
      state.subtitle = "Midnight on the Pier";
      state.badge = "VICE CITY";
      state.heat = 4;
      return "cover";
    case "editor2":
      state.layout = "six";
      state.grade = "vice";
      state.subtitle = "Pink Hour Drive";
      state.badge = "EST. 2026";
      state.heat = 3;
      return "editor";
    case "editor":
    default:
      state.layout = "nine";
      state.grade = "sunset";
      state.subtitle = "Vice City Nights";
      state.badge = "EST. 2026";
      state.heat = 4;
      return "editor";
  }
}
