# Sample-type validation — proposal only

No backend or production grading-policy changes have been made for this proposal. Read-only SSH to `tunarpi@10.42.0.1` timed out on 2026-11-18, so the contents of `/home/tunarpi/rpi-cam-demo/app.py` and `/home/tunarpi/Desktop/rpicopy/app.py` could not be inspected. Backend details below come from the user's supplied contract, not verified backend source.

## Inspected frontend and current backend contract

The exact kiosk's upload handler calls `runtime.capture` in `src/exact-ui.ts`. JPEG/PNG/WebP uploads are validated and decoded; Pi snapshots follow the same stored-evidence path. Live evidence is saved in IndexedDB before `gradePiImage` runs. `src/piClient.ts` sends multipart `image` and `image_type=sashibocore|tailcut` to `POST /grade`; it expects prediction/capture IDs, grade A/B/C/INVALID, confidence and four class scores. Current response `image_type` must match the requested model. That contract check is **not** independent sample detection.

According to the supplied backend description, two TFLite MobileNetV3Small models grade core and tail images separately. `/grade` selects one by `image_type`. `/status`, `/snapshot`, and `/stream` also exist. Nothing inspected establishes that either grade model detects cut type, or that an independently trained type classifier already exists.

## Proposed pipeline

1. Decode and validate image bytes once. Do not trust filename, extension or selected model to identify the sample.
2. Run a **separate trained sample-type model** with labels `sashibocore`, `tailcut`, and `unknown`. If a suitable existing detector is not available, collect/label station images and train/evaluate one before enabling enforcement.
3. Calibrate an acceptance threshold and ambiguity margin from a held-out validation set. Do not reuse the grading workflow's 80% threshold automatically. Low-confidence, ambiguous, empty, mixed-cut and out-of-distribution images should be rejected as undetermined. A softmax classifier alone does not guarantee unknown-image rejection.
4. Compare accepted type to requested `image_type`.
5. Only for a match, call the existing selected grade model with its existing preprocessing and output mapping. Keep all A/B/C/INVALID grading behavior unchanged.

## Proposed API extension

Keep successful `/grade` responses backward compatible, optionally adding independently measured `detected_sample_type`, `sample_type_confidence` and `sample_type_model_version`.

For rejection return HTTP 422, without invoking either grade model:

```json
{
  "error": "sample_type_mismatch",
  "requested_image_type": "sashibocore",
  "detected_sample_type": "tailcut",
  "sample_type_confidence": 0.97,
  "sample_type_model_version": "validated-model-version",
  "message": "Wrong sample type. Please upload a Sashibo Core image."
}
```

Unknown/ambiguous responses use `error=sample_type_undetermined` and `detected_sample_type=unknown`. Values shown above are examples, not measured detection results. Confidence must never be invented or taken from the grade classifier.

Extend `/status` to advertise whether independent validation is available, enabled, and which model version runs. If required validation is unavailable, return an explicit `sample_type_validation_unavailable` error; do not silently claim validation passed. Initially roll out in evaluation/shadow mode and compare detections with expert labels before enforcement is approved.

## Frontend behavior after approval

Parse only the documented validation error codes; avoid retrying HTTP 422. Keep the user on the same capture step with the entered fish weight, grader and saved image. Show one of the exact messages:

- `Wrong sample type. Please upload a Sashibo Core image.`
- `Wrong sample type. Please upload a Tail-Cut image.`
- `Sample type cannot be determined. Retake or upload another image.`

Do not dispatch `finishAnalysis`, create a graded record, change prior predictions, advance to the next step, or sync a rejected sample as a grading result. A retry can replace only that step's pending image. Existing final-grade decisions, price snapshots and completed records remain unchanged. Local Pi validation must work without internet; only later manual cloud synchronization requires cloud connectivity. Existing records without type-provenance fields remain readable.

The current capture flow saves under a stable session/sample evidence ID before inference. For a safe detector rollout, stage retakes under a new capture-specific evidence ID first. Link/promote a new accepted capture only after successful validation/grading; rejection must not overwrite evidence already referenced by a prior graded record. Test this explicitly with a valid grade followed by a rejected retake.

## Data, tests and rollout required

- Independently labeled core/tail/unknown images from actual chambers, lighting, cameras, orientations and handling conditions. Include empty trays, hands, packaging, whole fish, mixed samples, degraded images and visually similar cuts.
- Split data by fish/capture session and preferably station/date; prevent near-duplicate leakage. Measure per-class confusion, wrong-cut false acceptance, unknown false acceptance and rejection rates on unseen conditions; select thresholds with expert-approved targets.
- Backend tests must spy on both grade models and prove neither runs for mismatches/unknowns; prove the correct grade model runs once for a match and returns unchanged grade results.
- Browser tests must cover both mismatch directions, unknown, malformed validation responses, missing validation model, snapshot and upload, retry, retained prior results, no rejected-record cloud sync, and offline Pi operation.
- Back up backend/model assets, validate in a nonproduction copy first, benchmark Pi latency/memory, and retain a model/config rollback path. Production edits/deployment require approval after the inspected backend patch, detector evidence and test results are reviewable.

Next dependency: read the actual backend and model input/output metadata when the Pi is reachable (or from a local copy), then prepare a concrete nonproduction patch. No image-identity enforcement is claimed in the current release.
