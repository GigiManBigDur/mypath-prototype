import { ArrowLeft, GraduationCap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeTaskId } from '../utils/ids';
import PriorExperiencesEditor, { SAMPLE_PRIOR_EXPERIENCES } from '../components/PriorExperiencesEditor';
import MascotWidget from '../components/MascotWidget';
import { useMascotIntroThenRevisit } from '../hooks/useMascotSeen';
import { isDevToolsEnabled } from '../utils/devTools';
import { hasRealTranscriptFlow } from '../utils/transcriptEligibility';
import { calculateUnweightedGpa, calculateWeightedGpa, calculate4ScaleGpa } from '../utils/gpa';
import { calculateUCDavisGpa } from '../utils/ucdavisGpa';

// Guarantee the Transcript & GPA Trigger + guaranteed EC hand-off (see CLAUDE.md), Task 2 — a
// real, in-place summary of whichever real transcript/GPA variant applies to this student
// (Roslyn/UC Davis/Transfer-high-school), computed from the exact same real derivation functions
// TranscriptScreen.jsx's own 3 variants already use (never a second, possibly-drifting copy of
// that math) — "view" happens right here; "edit" reuses that SAME real, already-built screen via a
// new mode (see TranscriptScreen.jsx's own `fromProfile`), not a second, duplicated form.
function TranscriptSummarySection({ state, patch }) {
  const isHighSchool = state.educationLevel === 'highschool';
  const isCollegeAtUCDavis = (state.educationLevel === 'undergraduate' || state.educationLevel === 'transfer')
    && state.currentSchool === 'UC Davis';
  const eligible = hasRealTranscriptFlow(state);

  const openEditor = () => patch({ transcriptOpenedFromProfile: true, screen: 'transcript' });

  let summaryLine = null;
  if (eligible) {
    if (isHighSchool) {
      const transcript = state.transcript || [];
      const gpa4 = calculate4ScaleGpa(transcript);
      const unweighted = calculateUnweightedGpa(transcript);
      const weighted = calculateWeightedGpa(transcript);
      summaryLine = transcript.length === 0
        ? "You haven't entered any courses yet."
        : `${transcript.length} course${transcript.length === 1 ? '' : 's'} entered — 4.0-scale GPA: ${gpa4 ?? '—'} (unweighted: ${unweighted ?? '—'}, weighted: ${weighted ?? '—'}).`;
    } else if (isCollegeAtUCDavis) {
      const ucTranscript = state.ucdavisTranscript || [];
      const gpa = calculateUCDavisGpa(ucTranscript);
      summaryLine = ucTranscript.length === 0
        ? "You haven't entered any UC Davis courses yet."
        : `${ucTranscript.length} course${ucTranscript.length === 1 ? '' : 's'} entered — GPA: ${gpa ?? '—'}.`;
    } else {
      // Transfer, not at UC Davis — no current-college transcript exists in this app, only the
      // optional high school record (see TransferHighSchoolTranscript.jsx); state.gpa is never
      // written for this case regardless, so a course count is the one honest thing to show.
      const hsCount = (state.transferHsTranscript || []).length + (state.transferHsOtherCourses || []).length;
      summaryLine = hsCount === 0
        ? "You haven't added your high school record yet."
        : `${hsCount} high school course${hsCount === 1 ? '' : 's'} on file.`;
    }
  }

  return (
    <div className="field-block">
      <div className="field-label">
        <GraduationCap size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Transcript & GPA
      </div>
      {eligible ? (
        <>
          <p className="field-hint">{summaryLine}</p>
          <button type="button" className="btn btn-outline" onClick={openEditor}>
            {state.transcriptCompleted ? 'Edit Transcript & GPA' : 'Enter Transcript & GPA'}
          </button>
        </>
      ) : (
        <p className="field-hint">
          This app doesn't have a real transcript/GPA form for your current education level yet.
        </p>
      )}
    </div>
  );
}

// Prior Experience Collection + New Profile Page (see CLAUDE.md), Task 3 — a new hub tile/screen,
// deliberately small in scope right now: it only shows and manages `state.priorExperiences`, the
// same array Opportunity Finder's own one-time entry prompt already writes to. Framed explicitly
// as "the start of a broader profile area" (this screen's own copy) rather than a finished
// feature — later profile content is expected to land here too, but nothing about that is built
// yet. No `StepProgress` — like the hub itself, this is a standalone utility screen reachable
// anytime, not one of the 8 tracked survey-through-plan steps.
//
// Guarantee the Transcript & GPA Trigger + guaranteed EC hand-off (see CLAUDE.md), Task 2/3 —
// this screen now serves TWO real purposes: the ongoing, anytime-accessible hub tile it already
// was, AND (Task 3) the real destination "Our Conversation" hands the student off to when they
// already have real, existing activities & experiences to confirm. Both share the exact same
// editor/state below with zero duplication — only the Back/Done navigation target changes.
export default function ProfileScreen() {
  const { state, patch } = useApp();
  const experiences = state.priorExperiences || [];
  // Guaranteed EC hand-off (Task 3) — set by useNarrativeSession.js's own `beginEcHandoff` right
  // before navigating here. Unlike TranscriptScreen.jsx's own onboarding-pause mode (which has a
  // real, staged, uncommitted form the student could genuinely "back out of" without saving),
  // every edit here is already committed live via `patch()` the instant it happens — there's no
  // meaningful difference between "confirmed" and "backed out" to distinguish, so both Back and
  // Done resolve the hand-off identically: leaving this screen at all counts as having reviewed it.
  const ecHandoffActive = !!state.onboardingEcHandoffActive;

  const leaveProfile = () => {
    if (ecHandoffActive) {
      patch({
        ecHandoffCompleted: true,
        onboardingEcHandoffActive: false,
        pendingOnboardingEcResume: true,
        screen: 'onboardingConversation',
      });
      return;
    }
    patch({ screen: 'hub' });
  };

  const addExperience = (exp) => {
    patch({ priorExperiences: [...experiences, { id: makeTaskId('prior-experience'), ...exp }] });
  };
  const editExperience = (id, updated) => {
    patch({ priorExperiences: experiences.map((e) => (e.id === id ? { ...e, ...updated } : e)) });
  };
  const removeExperience = (id) => {
    patch({ priorExperiences: experiences.filter((e) => e.id !== id) });
  };
  // Add Testing-Only Prefill Buttons for Transcript & Experiences (see CLAUDE.md), Task 2 — one
  // real, whole-array write (replacing whatever's currently there), not a loop over `addExperience`
  // — see PriorExperiencesEditor.jsx's own header comment for why that would be a real bug here.
  const fillSampleExperiences = () => {
    patch({
      priorExperiences: SAMPLE_PRIOR_EXPERIENCES.map((exp) => ({ id: makeTaskId('prior-experience'), ...exp })),
    });
  };

  const mascotText = useMascotIntroThenRevisit('profile-intro', 'profile-revisit');

  return (
    <div>
      <MascotWidget text={mascotText} />
      <button type="button" className="btn btn-ghost" onClick={leaveProfile}>
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="page-title">Your Profile</h1>
      <p className="page-sub">
        {ecHandoffActive
          ? "You've got real activities & experiences on file — take a look, add or update anything, then click Done to pick up right where we left off in our conversation."
          : "The start of your broader profile — more will live here over time. For now, this is where your real transcript/GPA and past experiences & activities live. MyPath's AI features (Stage 2 suggestions, the chat assistant, Build Your Own) use these for richer context; your Careers of Interest, Related Majors, and Recommended Programs are unaffected by anything here."}
      </p>

      <TranscriptSummarySection state={state} patch={patch} />

      {experiences.length === 0 && (
        <p className="field-hint" style={{ marginBottom: 18 }}>
          You haven't added anything yet — add your first experience below.
        </p>
      )}

      <PriorExperiencesEditor
        experiences={experiences}
        onAdd={addExperience}
        onEdit={editExperience}
        onRemove={removeExperience}
        onFillSample={isDevToolsEnabled() ? fillSampleExperiences : undefined}
      />

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={leaveProfile}>
          {ecHandoffActive ? 'Done — return to our conversation' : 'Done'}
        </button>
      </div>
    </div>
  );
}
