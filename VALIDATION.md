# Validation

Nine controlled analysis tests pass. See analysis-tests.txt for exact measurements.

Browser verification completed on the supervised preview using mathematical PNG fixtures:
- Both actual file-picker controls load photos and the uploaded-image comparison completes.
- Simulated example, clustering, outlines, confirmation gating, and ChangeMap render correctly.
- An outline edit clears the comparison and requires confirmation again.
- Journal records and notes persist after reload.
- The printable report preview contains photos, measurements, ChangeMap, notes, and limits.

The cloud browser did not expose the HTML download event, so the download transfer was not independently verified. The printable preview is verified. Mobile layout and WebMCP support were not tested in a supported browser context. No clinical evaluation was performed.

## October 11, 2026: Vercel migration

- All nine analysis checks passed again.
- Public production origin returned HTTP 200 without authentication.
- Live browser workflow passed: simulated example, outline review, confirmed comparison, save to journal, printable report preview.
- Live fixture: 17.2% shape difference, 7.2 relative color distance, +9.1 percentage points asymmetry. Minor differences from direct array fixtures follow browser Canvas decoding.
- No clinical effectiveness or fairness claim follows from these software checks.
