# DermaTrack

Live demo: https://dermatrack-khaki.vercel.app/

A browser-only skin photo observation journal for UnivaBio 2026. DermaTrack proposes outlines with a small unsupervised color-clustering model, requires human review, aligns two masks, visualizes their differences, and stores comparisons in a device-local journal.

**Research prototype only.** No disease classification, probabilities, medical thresholds, urgency recommendations, or physical size estimates. A low image difference does not establish safety. New, changing, itching, or bleeding spots should be discussed with a dermatologist regardless of results.

## Run on a laptop

No GPU, API key, external service, or npm installation is required to run the app.

1. Install Python 3 if needed.
2. Open a terminal in this folder.
3. Run `python -m http.server 8000 --directory dist` (Windows) or `python3 -m http.server 8000 --directory dist` (macOS/Linux).
4. Open http://localhost:8000 in a current Chrome, Edge, Firefox, or Safari browser.
5. Click **Try a simulated example**, review both outlines, check both confirmation boxes, then compare.

Opening index.html directly as a file can block JavaScript modules. Use the local server above. Do not expose the local server to a public network; this application is intended for personal use.

## What is the AI?

The model is deterministic k-means, an unsupervised machine-learning method. It learns four CIELAB color centroids separately for each photo from 9,216 pixel samples, for up to 16 iterations. It has no pretrained weights and no dermatology training dataset. No large-language-model API is used. Explanations are generated from measured values using explicit templates, not medical reasoning.

The AI contribution is proposing the color-based segmentation. Human-reviewed masks feed conventional image registration and measurement. This is a proof of concept, not a clinically trained model.

## Technical flow and code tour

- `dist/analysis.js`: RGB-to-CIELAB conversion; k-means; edge-cluster background estimate; color-distance threshold; majority noise filter; seeded connected component; quality/rejection checks; area, centroid, principal axes, asymmetry, compactness, and color measurements; equal-area registration; rotation search; intersection-over-union and relative color distance.
- `dist/app.js`: photo decoding and center crop; outline review; dates; result rendering; report export; IndexedDB journal; notes; deletion; progressive WebMCP registration.
- `dist/index.html` and `dist/style.css`: accessible, responsive interface and method/limits explanation.
- `dist/fixtures.js`: mathematical image phantoms for the simulated demonstration and deterministic software checks. These are NOT patient photos.
- `tests/analysis.test.mjs`: controlled software tests with explicit tolerances. Run `node tests/analysis.test.mjs` using Node 20+.

## Measurement definitions

- Shape difference = 100 × (1 − intersection / union) of equal-area, aligned masks. This is a descriptive percentage, not a risk score.
- Asymmetry = average fraction of mask area not matched by reflection around each of two principal axes. Difference is in percentage points.
- Color distance = mean CIELAB Euclidean distance of overlapping pixels, relative to each image's surrounding skin color. It is an experimental relative-distance measure, not a standard clinical color score.
- Physical size: not measured. Each image is normalized to equal area, so physical growth cannot be inferred from the map or shape result.

Segmentation uses color distance from estimated surrounding skin and the component containing the selected center. It can segment the wrong object. The outline must be visibly correct before comparison. Quality checks reject a tiny, border-touching, low-contrast, or excessively large mask; they do not guarantee reliability.

## Privacy

Image processing never uploads the photo. There are no analytics, external scripts, remote models, or fetch calls. The site host may process ordinary HTTP request metadata when serving the application. Photos are downsampled to a 192 × 192 center square and stored only when **Save to journal** is clicked. Journal data lives in IndexedDB in that browser profile, not a cloud account. It is not encrypted against someone with access to the device. Clearing browser data or changing browsers can remove records. Export important reports first.

An in-app printable preview and a self-contained HTML report include the two reviewed photos, ChangeMap, notes, experimental metrics, and limits. Choose Print / Save as PDF in the preview, or download the HTML report and open it locally. Do not share exported photos without appropriate permission.

## Evaluation and limitations

Automated checks cover identical images, translation, rotation, deliberate shape/color perturbation, illumination warning, blank input rejection, invalid seed rejection, a darker synthetic background, and black/white CIELAB conversion. A darker mathematical background test is NOT a fairness evaluation.

There is no clinical dataset evaluation, clinician review, longitudinal patient study, melanoma sensitivity/specificity evaluation, or validation across skin tones. Real photos can fail because of light lesions, varied pigmentation, hair, shadows, reflections, camera perspective, cropping, and incorrect masks. PCA alignment and normalized area can hide changes. Clinical validation would require appropriately consented longitudinal images, reference masks, calibration, photometric controls, and clinician-led evaluation. These are future work, not completed features.

## Prior work and health source

This project does not claim to invent longitudinal skin monitoring or ABCDE feature extraction. Its focus is an inspectable browser-only workflow that exposes segmentation and comparison limits.

American Academy of Dermatology. "What to look for: ABCDEs of melanoma." https://www.aad.org/public/diseases/skin-cancer/abcdes-melanoma (accessed October 7, 2026). Educational context only, not clinical endorsement.

Built with ChatGPT/Codex AI coding assistance. The developer should be able to explain each function before presenting to judges. See the submission guide's code walkthrough.

## Vercel deployment

The app is static. Import this repository into Vercel with Framework Preset **Other**, no build command, and Output Directory **dist**. No environment variables are required.

The October 11 production release was deployed from the static files using the Vercel API. Source repository: https://github.com/Shresht-2009/DermaTrack. Vercel can deploy the static dist directory without an install or build step.
