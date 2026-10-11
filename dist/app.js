import { SIZE, segment, compare } from "./analysis.js";
import { phantom } from "./fixtures.js";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const state = {
  photos: [null, null],
  analyses: [null, null],
  approved: [false, false],
  result: null,
  simulated: false,
  revision: 0,
};
function today() {
  return new Date().toLocaleDateString("en-CA");
}
function showStatus(t) {
  $("status").textContent = t;
}
function invalidate() {
  state.revision++;
  state.analyses = [null, null];
  state.result = null;
  state.approved = [false, false];
  $("review").hidden = true;
  $("results").hidden = true;
  $("analyze").disabled = !state.photos.every(Boolean);
}
function photoCards() {
  $("photoCards").innerHTML = [0, 1]
    .map(
      (i) =>
        `<article class="photo"><div class="photohead"><h3>${i ? "Later" : "Earlier"} photo</h3><label>Date<input id="date${i}" type="date" value="${today()}" aria-label="${i ? "Later" : "Earlier"} photo date"></label></div><label class="upload" id="drop${i}"><input id="file${i}" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose ${i ? "later" : "earlier"} photo"><div id="preview${i}"><span class="plus">+</span><strong>Choose a photo</strong><br><small>or drop it here · JPG, PNG, WebP · up to 15 MB</small></div></label><div class="filename" id="filename${i}">No photo selected</div><p>Use the same spot, similar lighting, and visible surrounding skin.</p></article>`,
    )
    .join("");
  for (let i = 0; i < 2; i++) {
    $("file" + i).addEventListener("change", (e) => {
      if (e.target.files[0]) loadFile(e.target.files[0], i);
    });
    $("date" + i).addEventListener("change", () => {
      if (state.result) {
        state.result = null;
        $("results").hidden = true;
      }
    });
    $("drop" + i).addEventListener("dragover", (e) => e.preventDefault());
    $("drop" + i).addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0], i);
    });
  }
}
function canvasOf(p) {
  const c = document.createElement("canvas");
  c.width = p.w;
  c.height = p.h;
  c.getContext("2d").putImageData(new ImageData(p.data, p.w, p.h), 0, 0);
  return c;
}
function setPhoto(p, i, name) {
  state.photos[i] = p;
  const uri = canvasOf(p).toDataURL("image/png");
  state.photos[i].uri = uri;
  $("preview" + i).innerHTML =
    `<img src="${uri}" alt="${i ? "Later" : "Earlier"} selected photo">`;
  $("filename" + i).textContent = name;
  invalidate();
  showStatus(
    state.photos.every(Boolean)
      ? "Both photos ready. Review the outlines next."
      : "Add the other photo to continue.",
  );
}
async function loadFile(file, i) {
  try {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw Error("Use a JPG, PNG, or WebP photo.");
    if (file.size > 15 * 1024 * 1024)
      throw Error("Choose a photo smaller than 15 MB.");
    const bitmap = await createImageBitmap(file);
    if (bitmap.width < 96 || bitmap.height < 96) {
      bitmap.close();
      throw Error("Use a photo at least 96 pixels on each side.");
    }
    // Preserve aspect ratio; use a central square crop, disclosed in the UI. Native decoding handles EXIF orientation.
    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    const ctx = c.getContext("2d"),
      side = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      SIZE,
      SIZE,
    );
    bitmap.close();
    state.simulated = false;
    setPhoto(
      { data: ctx.getImageData(0, 0, SIZE, SIZE).data, w: SIZE, h: SIZE },
      i,
      file.name + " · center square crop",
    );
  } catch (e) {
    showStatus(e.message);
  }
}
function demo() {
  state.simulated = true;
  setPhoto(phantom(), 0, "Simulated baseline · not a patient photo");
  setPhoto(
    phantom({ change: 1, dx: 5, dy: -4, angle: 0.12 }),
    1,
    "Simulated changed shape/color · not a patient photo",
  );
  $("date0").value = "2026-09-01";
  $("date1").value = "2026-10-01";
  $("spotName").value = "Simulated example";
  showStatus("Simulated test fixtures loaded. Review the outlines to compare.");
  view("compare");
}
function drawOutline(i) {
  const a = state.analyses[i],
    ctx = $("outline" + i).getContext("2d");
  ctx.drawImage(canvasOf(state.photos[i]), 0, 0, 384, 384);
  if (!a) return;
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskCanvas.height = SIZE;
  const mc = maskCanvas.getContext("2d"),
    id = mc.createImageData(SIZE, SIZE);
  for (let j = 0; j < a.mask.length; j++)
    if (a.mask[j]) {
      const x = j % SIZE,
        y = Math.floor(j / SIZE),
        edge =
          !a.mask[j - 1] ||
          !a.mask[j + 1] ||
          !a.mask[j - SIZE] ||
          !a.mask[j + SIZE];
      id.data.set([65, 235, 195, edge ? 255 : 45], j * 4);
    }
  mc.putImageData(id, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(maskCanvas, 0, 0, 384, 384);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#12343e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(a.seed.x * 384, a.seed.y * 384, 4, 0, 7);
  ctx.fill();
  ctx.stroke();
}
function reviewReady() {
  $("compareBtn").disabled =
    !state.analyses.every(Boolean) || !state.approved.every(Boolean);
}
function refreshAnalysis(
  i,
  seed = state.analyses[i]?.seed || { x: 0.5, y: 0.5 },
) {
  state.result = null;
  $("results").hidden = true;
  state.approved[i] = false;
  $("approve" + i).checked = false;
  try {
    const p = state.photos[i],
      a = segment(p.data, p.w, p.h, Number($("level" + i).value), seed);
    a.seed = seed;
    state.analyses[i] = a;
    $("quality" + i).textContent =
      `${a.model.samples.toLocaleString()} samples · ${a.model.iterations} learning iterations. ${a.warnings.join(" ") || "Review the outline before continuing."}`;
    $("approve" + i).disabled = false;
  } catch (e) {
    state.analyses[i] = null;
    $("quality" + i).textContent = e.message;
    $("approve" + i).disabled = true;
  }
  drawOutline(i);
  reviewReady();
}
function review() {
  if (!state.photos.every(Boolean)) return;
  $("reviewCards").innerHTML = [0, 1]
    .map(
      (i) =>
        `<article class="photo"><h3>${i ? "Later" : "Earlier"} outline</h3><canvas id="outline${i}" class="outlineCanvas" width="384" height="384" tabindex="0" aria-label="${i ? "Later" : "Earlier"} photo outline. Click inside the spot to select its center. Arrow keys move the center."></canvas><label>Outline sensitivity<input type="range" id="level${i}" min="-25" max="45" value="0"></label><p id="quality${i}"></p><label class="check"><input type="checkbox" id="approve${i}">The outline follows the spot</label></article>`,
    )
    .join("");
  $("results").hidden = true;
  state.result = null;
  $("review").hidden = false;
  for (let i = 0; i < 2; i++) {
    $("level" + i).addEventListener("change", () => refreshAnalysis(i));
    $("approve" + i).addEventListener("change", (e) => {
      state.approved[i] = e.target.checked;
      state.result = null;
      $("results").hidden = true;
      reviewReady();
    });
    $("outline" + i).addEventListener("click", (e) => {
      const r = e.target.getBoundingClientRect();
      refreshAnalysis(i, {
        x: (e.clientX - r.left) / r.width,
        y: (e.clientY - r.top) / r.height,
      });
    });
    $("outline" + i).addEventListener("keydown", (e) => {
      const delta = {
        ArrowLeft: [-0.02, 0],
        ArrowRight: [0.02, 0],
        ArrowUp: [0, -0.02],
        ArrowDown: [0, 0.02],
      }[e.key];
      if (delta) {
        e.preventDefault();
        const s = state.analyses[i]?.seed || { x: 0.5, y: 0.5 };
        refreshAnalysis(i, {
          x: Math.max(0, Math.min(1, s.x + delta[0])),
          y: Math.max(0, Math.min(1, s.y + delta[1])),
        });
      }
    });
    refreshAnalysis(i);
  }
  showStatus("Review each outline. Only confirm it if it follows the spot.");
  $("review").scrollIntoView({ behavior: "smooth", block: "start" });
}
function doCompare() {
  if (!state.approved.every(Boolean) || !state.analyses.every(Boolean)) return;
  if (!$("date0").value || !$("date1").value) {
    showStatus("Choose a date for each photo.");
    return;
  }
  if ($("date1").value < $("date0").value) {
    showStatus("The later photo date must be on or after the earlier date.");
    return;
  }
  state.result = compare(...state.analyses);
  renderResult();
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}
function fmt(v, d = 1) {
  return Number(v).toFixed(d);
}
const signed = (v) => (v >= 0 ? "+" : "") + fmt(v);
function renderResult() {
  const r = state.result;
  $("results").hidden = false;
  $("resultCaption").textContent =
    ($("spotName").value || "Unnamed spot") +
    " · " +
    $("date0").value +
    " to " +
    $("date1").value +
    (state.simulated ? " · simulated images" : "");
  const m = [
    [
      "Shape difference",
      fmt(r.shapeDifference) + "%",
      "Of aligned outline union",
    ],
    ["Color distance", fmt(r.colorDistance), "Relative CIELAB units"],
    [
      "Asymmetry change",
      signed(r.asymmetryDelta) + " pp",
      "Percentage points, experimental",
    ],
    ["Physical size", "Not measured", "No calibrated scale reference"],
  ];
  $("metrics").innerHTML = m
    .map(
      (v) =>
        `<div class="metric"><span>${v[0]}</span><strong>${v[1]}</strong><small>${v[2]}</small></div>`,
    )
    .join("");
  const c = $("changeMap"),
    ctx = c.getContext("2d"),
    small = document.createElement("canvas");
  small.width = small.height = r.n;
  const sc = small.getContext("2d"),
    id = sc.createImageData(r.n, r.n),
    colors = [
      [13, 52, 61, 255],
      [92, 130, 138, 255],
      [246, 182, 111, 255],
      [83, 219, 189, 255],
    ];
  r.map.forEach((v, i) => id.data.set(colors[v], i * 4));
  sc.putImageData(id, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, c.width, c.height);
  $("explanation").innerHTML =
    `<h3>What these images show</h3><p>The reviewed outlines differ across ${fmt(r.shapeDifference)}% of their aligned union. Color distance is ${fmt(r.colorDistance)} relative CIELAB units. These numbers describe the photographs; they cannot establish whether the spot itself changed or what that means medically. Compare the originals and discuss any concerns with a clinician.</p>`;
  $("warnings").innerHTML =
    r.warnings.map((t) => `<div class="warning">${esc(t)}</div>`).join("") +
    (state.simulated
      ? '<div class="warning">Simulated test images. This example demonstrates software behavior, not medical accuracy.</div>'
      : "");
  $("save").textContent = "Save to journal";
  $("save").disabled = false;
}
function record() {
  const r = state.result;
  return {
    id:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join(""),
    name: $("spotName").value.trim() || "Unnamed spot",
    earlier: $("date0").value,
    later: $("date1").value,
    created: new Date().toISOString(),
    simulated: state.simulated,
    images: state.photos.map((p) => p.uri),
    notes: "",
    measurements: {
      shapeDifference: r.shapeDifference,
      colorDistance: r.colorDistance,
      asymmetryDelta: r.asymmetryDelta,
      backgroundDelta: r.backgroundDelta,
    },
    warnings: r.warnings,
    map: $("changeMap").toDataURL("image/png"),
    method:
      "dermatrack-v1.0-kmeans-lab; equal-area alignment; no physical size; not clinical",
    outlines: state.analyses.map((a) => ({
      seed: a.seed,
      areaPixels: a.features.area,
      model: a.model,
    })),
  };
}
async function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("dermatrack-journal", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("records", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        Error("This browser cannot save records. Export the report instead."),
      );
  });
}
async function tx(action, argument) {
  const conn = await db();
  return new Promise((resolve, reject) => {
    const t = conn.transaction(
        "records",
        action === "getAll" ? "readonly" : "readwrite",
      ),
      req = t.objectStore("records")[action](argument);
    let result;
    req.onsuccess = () => (result = req.result);
    t.oncomplete = () => {
      conn.close();
      resolve(result);
    };
    t.onerror = () => {
      conn.close();
      reject(
        Error(
          "The journal could not be updated. Export your report before closing.",
        ),
      );
    };
  });
}
async function updateCount() {
  try {
    $("count").textContent = (await tx("getAll")).length;
  } catch {
    $("count").textContent = "—";
  }
}
async function save() {
  if (!state.result) return;
  $("save").disabled = true;
  try {
    await tx("put", record());
    $("save").textContent = "Saved on this device";
    $("save").disabled = true;
    await updateCount();
  } catch (e) {
    showStatus(e.message);
    $("save").textContent = "Save failed — export report";
    $("save").disabled = false;
  }
}
function download(name, blob) {
  const a = document.createElement("a"),
    u = URL.createObjectURL(blob);
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function exportReport(rec = record()) {
  const v = rec.measurements,
    html = `<!doctype html><html><head><meta charset="utf-8"><title>DermaTrack observation report</title><style>body{font:16px/1.5 Arial;color:#12343e;max-width:850px;margin:35px auto;padding:25px}h1{font-size:30px}.imgs{display:flex;gap:20px}img{width:220px}table{border-collapse:collapse;width:100%;margin:24px 0}td,th{border-bottom:1px solid #ccc;text-align:left;padding:10px}.notice{background:#eef3f5;padding:16px}button{padding:10px}@media print{button{display:none}body{margin:0}}</style></head><body><button onclick="window.print()">Print / save as PDF</button><h1>DermaTrack observation report</h1><p>${esc(rec.name)} · ${esc(rec.earlier)} to ${esc(rec.later)}</p><p class="notice">Research prototype. Not a diagnosis or a clinical assessment. Low measured difference does not establish safety. Contact a dermatologist for new, changing, itching, or bleeding spots.</p>${rec.simulated ? "<p><b>Simulated images, not patient data.</b></p>" : ""}<div class="imgs"><div><h3>Earlier photo</h3><img src="${rec.images[0]}" alt="Earlier photo"></div><div><h3>Later photo</h3><img src="${rec.images[1]}" alt="Later photo"></div></div><table><tr><th>Experimental measurement</th><th>Value</th></tr><tr><td>Aligned shape difference</td><td>${fmt(v.shapeDifference)}%</td></tr><tr><td>Relative CIELAB color distance</td><td>${fmt(v.colorDistance)}</td></tr><tr><td>Asymmetry change</td><td>${signed(v.asymmetryDelta)} percentage points</td></tr><tr><td>Physical size</td><td>Not measured</td></tr></table><h3>Aligned ChangeMap</h3><img src="${rec.map}" alt="Change map"><p>Gray: shared outline. Amber: earlier only. Teal: later only. Equal-area normalization removes growth information.</p><h3>Notes</h3><p>${esc(rec.notes || "No notes recorded.")}</p><h3>Limits</h3><p>Unvalidated k-means color segmentation, manually reviewed. Lighting, skin tone, hair, framing, camera angle, and segmentation errors can alter results. No disease probabilities or medical thresholds are used.</p>${rec.warnings.map((t) => "<p>" + esc(t) + "</p>").join("")}<p>Method: ${esc(rec.method)}</p><p>Education source: American Academy of Dermatology, https://www.aad.org/public/diseases/skin-cancer/abcdes-melanoma</p></body></html>`;
  let dialog = document.getElementById("reportDialog");
  if (dialog) dialog.remove();
  dialog = document.createElement("dialog");
  dialog.id = "reportDialog";
  dialog.className = "reportDialog";
  dialog.innerHTML =
    '<div class="reportToolbar"><strong>Observation report</strong><div><button class="secondary" id="reportDownload">Download HTML</button><button class="secondary" id="reportClose">Close report</button></div></div><iframe title="Printable observation report" sandbox="allow-scripts allow-modals"></iframe>';
  dialog.querySelector("iframe").srcdoc = html;
  dialog.querySelector("#reportDownload").onclick = () =>
    download("DermaTrack-report.html", new Blob([html], { type: "text/html" }));
  dialog.querySelector("#reportClose").onclick = () => dialog.close();
  document.body.append(dialog);
  dialog.showModal();
}
async function journal() {
  try {
    const records = (await tx("getAll")).sort((a, b) =>
      b.created.localeCompare(a.created),
    );
    $("journal").innerHTML = records.length
      ? records
          .map(
            (rec) =>
              `<article class="journalitem" data-id="${rec.id}"><div class="sectionhead"><div><h2>${esc(rec.name)}</h2><p>${esc(rec.earlier)} to ${esc(rec.later)} ${rec.simulated ? "· simulated example" : ""}</p></div><span class="pill">On this device</span></div><div class="thumbs">${rec.images.map((src, i) => `<img src="${src}" alt="${i ? "Later" : "Earlier"} saved photo">`).join("")}</div><p>Shape difference <b>${fmt(rec.measurements.shapeDifference)}%</b> · Color distance <b>${fmt(rec.measurements.colorDistance)}</b> · Physical size not measured</p><label>Observation notes<textarea maxlength="2000" placeholder="Changes you noticed or questions for your clinician">${esc(rec.notes)}</textarea></label><button class="secondary note">Save notes</button><button class="secondary report">Export report</button><button class="textbutton remove">Delete record</button><span class="notestatus" role="status"></span></article>`,
          )
          .join("")
      : '<div class="empty"><h2>No saved comparisons yet.</h2><p>Compare photos and save the result to begin your journal.</p><button class="primary" id="emptyCompare">Compare photos</button></div>';
    if ($("emptyCompare")) $("emptyCompare").onclick = () => view("compare");
    for (const el of $("journal").querySelectorAll(".journalitem")) {
      const rec = records.find((r) => r.id === el.dataset.id);
      el.querySelector(".note").onclick = async () => {
        try {
          rec.notes = el.querySelector("textarea").value;
          await tx("put", rec);
          el.querySelector(".notestatus").textContent = "Notes saved.";
        } catch (e) {
          el.querySelector(".notestatus").textContent = e.message;
        }
      };
      el.querySelector(".report").onclick = () =>
        exportReport({ ...rec, notes: el.querySelector("textarea").value });
      el.querySelector(".remove").onclick = async () => {
        if (
          confirm("Delete this comparison and its photos from this device?")
        ) {
          try {
            await tx("delete", rec.id);
            await journal();
            await updateCount();
          } catch (e) {
            el.querySelector(".notestatus").textContent = e.message;
          }
        }
      };
    }
  } catch (e) {
    $("journal").textContent = e.message;
  }
}
function view(v) {
  for (const n of ["compare", "history", "method"])
    $(n + "View").hidden = n !== v;
  document
    .querySelectorAll(".nav")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  if (v === "history") journal();
  window.scrollTo(0, 0);
}
photoCards();
updateCount();
document
  .querySelectorAll(".nav")
  .forEach((b) => (b.onclick = () => view(b.dataset.view)));
$("demo").onclick = demo;
$("analyze").onclick = review;
$("compareBtn").onclick = doCompare;
$("save").onclick = save;
$("export").onclick = () => exportReport();
// Agent tools call exactly the same actions as the visible interface.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  for (const tool of [
    {
      name: "load_simulated_example",
      description:
        "Load the explicitly simulated comparison images into the visible photo form.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(input) {
        if (!input || Object.keys(input).length)
          throw Error("Expected an empty object.");
        demo();
        return { loaded: true, simulated: true };
      },
    },
    {
      name: "read_visual_comparison",
      description:
        "Read the current completed experimental photo measurements. No diagnosis.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        if (!input || Object.keys(input).length)
          throw Error("Expected an empty object.");
        if (!state.result) throw Error("No completed reviewed comparison.");
        const r = state.result;
        return {
          shapeDifference: r.shapeDifference,
          colorDistance: r.colorDistance,
          asymmetryDelta: r.asymmetryDelta,
          physicalSize: "not measured",
          clinicalValidation: false,
          simulated: state.simulated,
        };
      },
    },
  ]) {
    try {
      Promise.resolve(
        document.modelContext.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  }
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
