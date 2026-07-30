import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import SchoolSearchField from '../components/SchoolSearchField';
import { SCHOOLS, COLLEGE_SCHOOLS, TRANSFER_HS_SCHOOLS } from '../data/schools';
import MascotWidget from '../components/MascotWidget';
import { useMarkMascotSeen, useMascotRevisitOnce } from '../hooks/useMascotSeen';
import { getMascotLine } from '../data/mascotDialogue';

const LEVELS = [
  { id: 'highschool', label: 'High School' },
  { id: 'undergraduate', label: 'Undergraduate' },
  { id: 'transfer', label: 'Transfer' },
];

const YEAR_OPTIONS = {
  highschool: [
    { id: 9, label: '9th (Freshman)' },
    { id: 10, label: '10th (Sophomore)' },
    { id: 11, label: '11th (Junior)' },
    { id: 12, label: '12th (Senior)' },
  ],
  undergraduate: [
    { id: 1, label: '1st year' },
    { id: 2, label: '2nd year' },
    { id: 3, label: '3rd year' },
    { id: 4, label: '4th year' },
  ],
  transfer: [
    { id: 1, label: '1st year' },
    { id: 2, label: '2nd year' },
    { id: 3, label: '3rd year' },
  ],
};

// Ask Transfer Students Directly When They Plan to Transfer (see CLAUDE.md) — options are relative
// to the student's own current year (schoolYear above), capped at this app's own existing "3rd
// year" ceiling for transfer students (there's no "4th year" option in YEAR_OPTIONS.transfer to
// target beyond it). `gap` is the real value stored (state.transferTargetGap) and read by
// resolveStageNames() (trunkSteps.js) — the number of full years between current and target, not
// the absolute target year itself, so the stored answer stays meaningful even if schoolYear is
// later revisited (though changing it resets this question — see the schoolYear pill's own
// onClick below, since the available OPTIONS themselves depend on the current year).
const TRANSFER_TARGET_OPTIONS = {
  1: [
    { gap: 0, label: 'After this year' },
    { gap: 1, label: 'After my 2nd year' },
    { gap: 2, label: 'After my 3rd year' },
  ],
  2: [
    { gap: 0, label: 'After this year' },
    { gap: 1, label: 'After my 3rd year' },
  ],
  3: [
    { gap: 0, label: 'After this year' },
  ],
};

// Exported so the Dashboard/Guide hub (Stage 3, see CLAUDE.md) can check "is the survey done" for
// its own tile-unlock gates, using the EXACT same formula this screen's own Continue button
// already gates on — extracted once so the two can never independently drift the way this
// codebase's own getStage0TargetLabel precedent already fixed a real bug for (see trunkSteps.js).
// A Transfer student additionally can't complete the survey without a real answer to "When do you
// plan to transfer?" (state.transferTargetGap !== null, NOT a truthy check — 0 is itself a real,
// valid answer, "after this year") now that plan length is always driven by that answer rather
// than inferred from schoolYear alone.
//
// AI-First Onboarding, Stage 1 (see CLAUDE.md) — no longer requires `state.interestTags.length >
// 0`. Interests/passions used to be gathered here directly; that question (and the free-text
// "describe your own passion" box) was removed from this screen entirely, since Stage 2's AI
// conversation page will gather that conversationally instead. `state.interestTags`/`passionText`
// themselves are untouched (still real DEFAULT_STATE fields other code reads/writes) — only this
// screen's own UI for collecting them is gone; until Stage 2 exists, they simply stay whatever
// they were (empty, for a fresh sign-up), which is an accepted, expected intermediate state.
export function isSurveyComplete(state) {
  const isHighSchool = state.educationLevel === 'highschool';
  const isTransfer = state.educationLevel === 'transfer';
  return !!state.educationLevel && !!state.schoolYear
    && (!isHighSchool || !!state.currentSchool)
    && (!isTransfer || state.transferTargetGap !== null);
}

// Dashboard/Guide feature, Stage 5 (see CLAUDE.md) — SurveyScreen has no internal sub-screens
// (it's one continuous page), so unlike Discovery's careers/majors/programs, its "landing on a
// new sub-step" moment is FIELD-completion-driven rather than screen-navigation-driven. This
// mirrors Stage 4's own GUIDED_SEQUENCE/getNextGuidedStep pattern (HubScreen.jsx) at the field
// level: find the first step whose precondition is currently true AND hasn't been shown yet. Each
// key is marked seen (via useMarkMascotSeen) the moment it's shown, so as the student fills in
// one field after another in a single sitting, they naturally see educationLevel -> schoolYear ->
// school in sequence, each exactly once — not re-triggered on every keystroke within a field,
// since each key only ever satisfies "not yet seen" once.
//
// AI-First Onboarding, Stage 1 — the old first, no-precondition step ('survey-interests', tied to
// the now-removed interest-tag question) is gone; `survey-educationLevel` is now the genuine first
// step, always eligible from the moment this screen mounts.
const SURVEY_MASCOT_SEQUENCE = [
  { key: 'survey-educationLevel', when: () => true },
  { key: 'survey-schoolYear', when: (state) => !!state.educationLevel },
  {
    key: 'survey-school',
    when: (state) => !!state.schoolYear
      && (state.educationLevel === 'highschool' || state.educationLevel === 'undergraduate' || state.educationLevel === 'transfer'),
  },
];

// How long a queued step stays on screen before the next one auto-advances (see the effect
// below). Long enough to actually read a 1-2 sentence line, short enough that a fast-moving
// user doesn't have to wait it out — this is a judgment call, not a measured value.
const MASCOT_STEP_DELAY_MS = 2200;

function pendingMascotSteps(state) {
  return SURVEY_MASCOT_SEQUENCE
    .filter((s) => s.when(state) && !state.mascotSeenKeys.includes(s.key))
    .map((s) => s.key);
}

export default function SurveyScreen() {
  const { state, patch } = useApp();

  // The school selector (and, downstream, Transcript & GPA / Course Selection) applies to High
  // School (Roslyn) and, as of the UC Davis partner-school addition, to Undergraduate/Transfer
  // too (UC Davis) — see CLAUDE.md's "UC Davis Partner School" sections. Unlike High School
  // (where Roslyn is the only supported school and picking it is mandatory to continue), the
  // college field is deliberately OPTIONAL — most Undergraduate/Transfer students don't attend
  // UC Davis, and requiring them to pick it anyway would break "the existing generic flow,
  // completely unaffected" for the vast majority of college-level users. Only High School keeps
  // the hard requirement.
  const isHighSchool = state.educationLevel === 'highschool';
  const isCollege = state.educationLevel === 'undergraduate' || state.educationLevel === 'transfer';
  const isTransfer = state.educationLevel === 'transfer';
  const hasSchoolField = isHighSchool || isCollege;
  const canContinue = isSurveyComplete(state);

  // Resolved into local state via an effect gated on the REAL progress fields only — not
  // recomputed directly in the render body on every render. Marking a key seen (below) itself
  // changes `state.mascotSeenKeys`, which would otherwise trigger an immediate re-render whose
  // fresh resolution already sees THIS key as seen and instantly resolves the NEXT eligible step
  // too, cascading through the whole sequence within milliseconds — before the user ever had a
  // chance to read the first line (confirmed directly, back when this sequence still had two
  // no-precondition steps at the front: an unguarded version of this marked BOTH of them seen
  // within the same render pass on a fresh mount). Gating the recompute on the actual field
  // values means it only re-runs when the user genuinely does something — filling in the next
  // field — not as a side effect of the mascot's own bookkeeping.
  //
  // A single trigger can leave MORE than one step eligible+unseen at once — e.g. picking an
  // education level makes 'survey-schoolYear' eligible on the very same tick
  // 'survey-educationLevel' (itself eligible from mount) might still be showing. An earlier
  // version of this resolved only the first eligible+unseen step per
  // trigger, which starved every step after the first "free" one until some LATER, unrelated
  // field change happened to fire the effect again — in practice a field's own prompt (e.g. "Now,
  // where are you in your journey right now?") only appeared AFTER the user had already answered
  // it, one action late, not before. Queuing every currently-eligible-unseen step as a plain
  // snapshot and revealing them one at a time on a short timer fixes this without reintroducing
  // the cascade above — each reveal still only marks ONE key seen, and the queue itself is never
  // recomputed against a mid-walk `mascotSeenKeys`.
  const [mascotKey, setMascotKey] = useState(null);
  useEffect(() => {
    const queue = pendingMascotSteps(state);
    if (queue.length === 0) {
      setMascotKey(isSurveyComplete(state) ? 'survey-revisit' : null);
      return undefined;
    }
    let cancelled = false;
    let timer;
    const revealAt = (i) => {
      if (cancelled) return;
      setMascotKey(queue[i]);
      if (i + 1 < queue.length) timer = setTimeout(() => revealAt(i + 1), MASCOT_STEP_DELAY_MS);
    };
    revealAt(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.educationLevel, state.schoolYear, state.currentSchool]);
  useMarkMascotSeen(mascotKey && mascotKey !== 'survey-revisit' ? mascotKey : null);
  // Bug fix (see CLAUDE.md) — 'survey-revisit' used to repeat on every fresh re-entry to an
  // already-complete Survey (deliberately excluded from useMarkMascotSeen above, since it was
  // designed to repeat freely, matching the original per-screen "revisit lines repeat forever"
  // rule). That rule is now "shown once, ever" for a screen-specific revisit line — the same fix
  // applied to every other screen's own revisit text — so this now goes through
  // useMascotRevisitOnce instead of being read directly off `mascotKey`.
  const surveyRevisitText = useMascotRevisitOnce(mascotKey === 'survey-revisit', 'survey-revisit');
  const mascotDisplayText = mascotKey === 'survey-revisit' ? surveyRevisitText : getMascotLine(mascotKey);

  return (
    <div>
      <MascotWidget text={mascotDisplayText} />
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'signup' })}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* AI-First Onboarding, Stage 1 (see CLAUDE.md) — no StepProgress here, matching Sign Up's
          own established precedent: this is now a genuine pre-hub step (Sign Up -> this minimal
          form -> the Stage 2 AI conversation -> Hub), not one of the 8 tracked survey-through-plan
          steps. The interest-tag picker and the free-text "describe your own passion" box that
          used to live here are both gone — both will be gathered conversationally in Stage 2
          instead, once that page exists. */}
      <h1 className="page-title">Just a few basics.</h1>
      <p className="page-sub">
        Your education level, grade, and school — the minimum we need before your plan can start
        taking shape.
      </p>

      <div className="field-block">
        <div className="field-label">What is your current education level?</div>
        <p className="field-hint">This shapes everything else in your plan.</p>
        <div className="pill-group">
          {LEVELS.map((lvl) => (
            <button
              type="button"
              key={lvl.id}
              className={`pill${state.educationLevel === lvl.id ? ' selected' : ''}`}
              onClick={() => patch({
                educationLevel: lvl.id, schoolYear: null, currentSchool: '', currentMajor: '',
                transferHighSchool: '', transferTargetGap: null,
              })}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {state.educationLevel && (
        <div className="field-block">
          {/* Both High School and Undergraduate/Transfer ask "entering / about to start" rather
              than the ambiguous "What year/grade are you in?" — the earlier wording was
              genuinely ambiguous between "the year you're currently completing" and "the year
              you're about to start," and the app's own Course Selection/Transcript targeting for
              UC Davis (mirroring the same fix already applied to Roslyn) was built assuming the
              former (register now for year+1's courses) while a real incoming first-year student
              answering "1st year" means the latter. Applied to all 3 levels uniformly — this
              question is asked BEFORE the school-selection field further down, so wording can't
              be conditioned on which school (Roslyn vs. UC Davis) the student will pick next, and
              the clearer phrasing doesn't hurt Undergraduate/Transfer students who won't end up
              at UC Davis either. */}
          <div className="field-label">
            {state.educationLevel === 'highschool' ? 'What grade are you entering / about to start?' : 'What year are you entering / about to start?'}
          </div>
          <p className="field-hint">This scales your plan to how much time you actually have.</p>
          <div className="pill-group">
            {YEAR_OPTIONS[state.educationLevel].map((y) => (
              <button
                type="button"
                key={y.id}
                className={`pill${state.schoolYear === y.id ? ' selected' : ''}`}
                onClick={() => patch({ schoolYear: y.id, transferTargetGap: null })}
              >
                {y.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ask Transfer Students Directly When They Plan to Transfer (see CLAUDE.md) — replaces the
          old assumption-based plan-length logic (1st year always got a 2-year plan, 2nd/3rd year
          always got 1) with a direct question, since plenty of students want to transfer after
          just one year regardless of their current year. Required to complete the survey (see
          isSurveyComplete above) — plan length now always comes from this real answer, never
          inferred from schoolYear alone. Options are relative to the student's own current year
          (TRANSFER_TARGET_OPTIONS[state.schoolYear]), so this only renders once schoolYear is
          actually answered. */}
      {isTransfer && !!state.schoolYear && (
        <div className="field-block">
          <div className="field-label">When do you plan to transfer?</div>
          <p className="field-hint">This determines how much time your plan has to work with.</p>
          <div className="pill-group">
            {TRANSFER_TARGET_OPTIONS[state.schoolYear].map((opt) => (
              <button
                type="button"
                key={opt.gap}
                className={`pill${state.transferTargetGap === opt.gap ? ' selected' : ''}`}
                onClick={() => patch({ transferTargetGap: opt.gap })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasSchoolField && (
        <div className="field-block">
          <div className="field-label">What school do you currently attend?</div>
          <p className="field-hint">
            {isHighSchool
              ? 'Only Roslyn High School is available right now — more schools are coming soon.'
              : 'Only UC Davis is available right now — more schools are coming soon.'}
          </p>
          <SchoolSearchField
            schools={isHighSchool ? SCHOOLS : COLLEGE_SCHOOLS}
            value={state.currentSchool}
            onChange={(school) => patch({ currentSchool: school })}
          />
        </div>
      )}

      {/* "Current Major" field for College Students (see CLAUDE.md) — deliberately separate from
          the Discovery flow's own career/major/program selections (state.selectedCareerIds/
          selectedMajorIds/selectedProgramKeys), which are about FUTURE goals (grad school or a
          transfer destination). This is about what an Undergraduate/Transfer student is ALREADY
          studying right now at their current college — only shown once a real partner school
          (currently just UC Davis) is actually selected, since "current major" has no honest
          meaning for a student with no current college on file yet. Free-text, matching this
          app's own established optional-field convention (uncontrolled, defaultValue + onBlur, an
          .optional-badge pill — Sign-Up's country/avatar/voice fields) rather than a dropdown — this app's own
          curated `MAJORS` dataset (majors.js) is scoped to Discovery's FUTURE-major selection use
          case, and its ~47 entries don't necessarily cover every real current major a college
          student might already be declared in, so forcing a pick from that list here would risk
          silently misrepresenting a real student's actual major. */}
      {isCollege && !!state.currentSchool && (
        <div className="field-block">
          <div className="field-label">
            What's your current major? <span className="optional-badge">Optional</span>
          </div>
          <p className="field-hint">
            This is what you're already studying now at {state.currentSchool} — separate from any future
            career/major goals you'll explore later in Discovery.
          </p>
          <label className="task-form-field">
            <input
              type="text"
              defaultValue={state.currentMajor}
              onBlur={(e) => patch({ currentMajor: e.target.value.trim() })}
              placeholder="e.g. Managerial Economics"
            />
          </label>
        </div>
      )}

      {/* High School Selection + Transcript for Transfer Students (see CLAUDE.md), Task 1 — Transfer
          track specifically, NOT general Undergraduate: a transfer applicant's admissions file
          typically still includes their high school record, which the general Undergraduate flow
          (already several years removed from high school for most of that cohort) has no
          equivalent need for. Same search/select pattern SchoolSearchField already established for
          "What school do you currently attend?" above, reused directly rather than a different
          control. Optional, matching that same field's own precedent (most transfer students won't
          have attended Roslyn specifically) — Continue is never gated on this. */}
      {isTransfer && (
        <div className="field-block">
          <div className="field-label">
            Which high school did you attend? <span className="optional-badge">Optional</span>
          </div>
          <p className="field-hint">
            Roslyn High School is the only school we have real course/grading data for right now —
            select "Other" if yours isn't listed. This helps give your plan richer context, since
            transfer applications typically consider your high school record too.
          </p>
          <SchoolSearchField
            schools={TRANSFER_HS_SCHOOLS}
            value={state.transferHighSchool}
            onChange={(school) => patch({ transferHighSchool: school })}
          />
        </div>
      )}

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canContinue}
          onClick={() => patch({ screen: 'onboardingConversation' })}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
