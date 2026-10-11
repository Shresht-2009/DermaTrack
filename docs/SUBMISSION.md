# DermaTrack submission pack

## Project name
DermaTrack

## Elevator pitch
An explainable, browser-only journal that helps people compare skin photos, inspect visual differences, and document questions for a clinician.

## Inspiration
A photo from last month and a photo from today may look different because of a spot, lighting, or camera position. We wanted to make that uncertainty visible and give people a simple way to preserve observations. DermaTrack focuses on documentation, with no disease classification or medical risk score.

## What it does
DermaTrack compares two photographs of the same skin spot. A small clustering model proposes an outline for each image. The user can select the spot's center, adjust the segmentation, and must confirm that both outlines are correct. The app aligns the reviewed masks and displays a ChangeMap, experimental shape difference, relative color distance, and asymmetry change. Comparisons and notes can be saved in a browser-local journal or exported as a printable report. An in-app printable report preview and an explicitly simulated example make the workflow easy to explore without using personal medical photographs.

## How we built it
The app uses plain JavaScript, HTML, CSS, Canvas, and IndexedDB. A deterministic k-means model learns four color clusters from each photograph in CIELAB color space. It uses the edge-dominant cluster to estimate surrounding skin color. Color-distance segmentation, majority filtering, and a connected component around a user-selected center produce a proposed mask. Centroid and principal-axis alignment, a rotation search, and equal-area normalization support shape comparison. Intersection-over-union quantifies the aligned outline difference; background-relative CIELAB distances describe color differences. The entire photo pipeline runs on the user's device. There are no pretrained clinical weights, cloud model calls, paid APIs, or GPU requirements. Vite supports development preview; the deployed application is static.

## Challenges
Aligning photographs can remove capture artifacts while also hiding relevant changes. We therefore disclose that equal-area normalization removes physical growth information and do not estimate diameter in millimeters. Color segmentation can choose the wrong object, so the interface requires outline review and supports rejection instead of producing a confident number for every image. Lighting warnings and transparent measurement definitions help users interpret uncertainty.

## Accomplishments
The implemented workflow combines local machine learning, visible human review, shape registration, a difference visualization, a persistent journal, and a printable report. Nine automated software checks cover identical images, translation, rotation, altered shape/color, lighting, blank images, invalid centers, a darker mathematical background, and color conversion. Identical images give 0% shape difference; translation gives 0.18%; rotation gives 1.77%; the deliberately altered fixture gives 17.09%. These controlled checks are not evidence of clinical effectiveness or fairness.

## What we learned
A health prototype benefits from showing what it can measure and where it can fail. A small unsupervised model can support a useful technical demonstration on an ordinary laptop, but it cannot replace a clinically evaluated dermatology model or a clinician. Human review and honest limits are part of the product, not an afterthought.

## What's next
Clinician-led evaluation with appropriately consented longitudinal photographs, reference segmentation masks, calibrated size markers, and consistent capture conditions. Performance across pigmentation, skin tones, camera devices, and common artifacts must be studied before real-world medical use. These are planned research steps, not completed features.

## Built with
JavaScript, HTML, CSS, Canvas API, IndexedDB, k-means clustering, CIELAB, Vite.

## AI assistance disclosure
Built with ChatGPT/Codex coding assistance. The model in the app is per-image unsupervised k-means; the prototype does not use a pretrained medical neural network. The developer should understand the code and be prepared to walk judges through it.

## Links and deliverables
- Prototype: https://dermatrack-khaki.vercel.app/ (public Vercel production deployment; verified October 11, 2026)
- One-page description: DermaTrack-project.pdf
- Complete authored code: DermaTrack-code.pdf
- Source package: DermaTrack-source.zip
- Demo: DermaTrack-demo.mp4 (2 minutes 42 seconds; captured app states with synthetic narration)

## Submission status
The Vercel production app is publicly accessible. On October 11, 2026, the deployed app was checked through simulated example loading, outline review, comparison, journal saving, and printable report preview. All nine automated analysis checks passed again.

No Devpost entry has been created or submitted. The assistant browser is signed out; the user's regular browser session is separate. The current Devpost submission page displays October 20, 2026 at 11:45 PM EDT. The rules body has older dates; check organizer announcements when submitting.

Source repository: https://github.com/Shresht-2009/DermaTrack. GitHub is connected as Shresht-2009. A hosted video URL may still be required by Devpost; the demo MP4 is included in the submission package but has not been published to a video host.

## Understand your code before judging
1. **Pixels and color:** Each photo becomes a 192 x 192 center crop. `lab()` converts RGB to a color space where brightness and color components are separate.
2. **The model:** `cluster()` repeatedly assigns sampled pixels to their closest color centroid and recomputes the four means. It learns from the current photo, not a disease dataset.
3. **The outline:** `segment()` estimates background from the photo edges, finds pixels different from that background, removes isolated noise, and keeps the connected region containing the chosen center.
4. **Human review:** `refreshAnalysis()` redraws the mask. Both confirmations are required. If the mask is wrong, don't confirm it. Changing a mask invalidates the result.
5. **Features:** `measure()` computes area, center, principal axes, color variation, and mirror asymmetry. These mathematical descriptions are not validated clinical scores.
6. **Alignment:** `normalized()` centers, rotates, and normalizes the area. `compare()` searches small rotations and a 180-degree flip, selecting the largest overlap. This deliberately removes size change.
7. **The map:** Shared pixels are gray; earlier-only pixels are amber; later-only pixels are teal. The number is 100 x (1 - shared area / union area).
8. **Storage:** `tx()` writes saved records to IndexedDB. Photos don't leave the device. Browser data can be lost, so export important reports.
9. **Reports:** `exportReport()` makes a self-contained HTML report, with photos, measurements, notes, and limits. Open it and print to PDF.
10. **Honesty:** No melanoma accuracy, sensitivity, specificity, fairness, clinical validation, or improved outcomes have been demonstrated.

## Suggested demo narration (about 90 seconds)
“DermaTrack is a device-local skin photo journal. Its purpose is to help people document observations for a clinician, without assigning a diagnosis or medical risk score.

I can upload two photos of the same spot. For this demonstration, I am using explicitly simulated images, not patient photographs. Clicking Review learns four color clusters separately from each photo, then proposes a spot outline. I can click the center and adjust the outline sensitivity. I must inspect and confirm both outlines before comparing.

The ChangeMap aligns the reviewed shapes. Gray pixels are shared, amber appears only in the earlier outline, and teal appears only in the later outline. The result describes experimental shape and color differences. It does not tell whether a spot is cancerous. Physical size is not measured, because this comparison normalizes area and has no calibrated millimeter reference.

I can save the comparison to this browser's journal, add notes, and export a report. Photos stay on the device.

The model is a small unsupervised clustering model, not a pretrained dermatology network. Nine controlled software tests pass, including unchanged images, pose changes, and rejection paths. Medical accuracy and performance across skin tones have not been validated. The next step is clinician-led evaluation with consented longitudinal photos. DermaTrack makes image comparison transparent while keeping those limits visible.”
