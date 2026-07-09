// Shared "Step X of Y" indicator — replaces the plain eyebrow text previously duplicated across
// Survey/Admissions/Discovery/OpportunityFinder/ProjectBuilder with an animated dot track (reusing
// the same .step-track/.step-dot language DiscoveryScreen already used for its careers/majors/
// programs sub-steps) plus the existing .eyebrow text underneath, so no information is lost.
// AcademicPlanScreen is intentionally NOT switched to this component — it's out of scope for this
// pass.
export default function StepProgress({ step, total, label }) {
  return (
    <div className="step-progress">
      <div className="step-track">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`step-dot${i + 1 === step ? ' active' : ''}${i + 1 < step ? ' done' : ''}`}
          />
        ))}
      </div>
      <div className="eyebrow">Step {step} of {total}{label ? ` · ${label}` : ''}</div>
    </div>
  );
}
