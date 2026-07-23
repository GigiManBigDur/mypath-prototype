import { useEffect, useState } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronUp, Dumbbell, GraduationCap, Palette, Cpu, Users, Briefcase,
  Heart, Film, Sparkles,
} from 'lucide-react';
import { CATEGORIES } from '../data/interests';
import { useApp } from '../context/AppContext';
import StepProgress from '../components/StepProgress';
import SchoolSearchField from '../components/SchoolSearchField';
import { SCHOOLS, COLLEGE_SCHOOLS, TRANSFER_HS_SCHOOLS } from '../data/schools';
import MascotWidget from '../components/MascotWidget';
import { useMarkMascotSeen, useMascotRevisitOnce } from '../hooks/useMascotSeen';
import { getMascotLine } from '../data/mascotDialogue';

// Palette repaint, Discovery batch (see CLAUDE.md) — the name->component map for each category's
// own `icon` string (interests.js), matching this codebase's standing "data holds icon NAMES, the
// screen owns the map" convention. `CATEGORY_COLORS` cycles the same shared 7-color "bloom" accent
// palette the hub/Sign-Up already use, by each category's own position in the CATEGORIES array —
// there are 9 categories and 7 colors, so the last 2 deliberately repeat an earlier color (same
// "cycle, don't invent extra colors" precedent HubScreen's own TILE_ACCENTS already established
// for 10 tiles against the same 7-color set).
const CATEGORY_ICON_MAP = { Dumbbell, GraduationCap, Palette, Cpu, Users, Briefcase, Heart, Film, Sparkles };
const CATEGORY_COLORS = [
  'var(--bloom-purple)', 'var(--bloom-yellow)', 'var(--bloom-teal)', 'var(--bloom-orange)',
  'var(--bloom-pink)', 'var(--bloom-blue)', 'var(--bloom-green)',
];

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

// Exported so the Dashboard/Guide hub (Stage 3, see CLAUDE.md) can check "is the survey done" for
// its own Let's Build Your Plan -> Careers of Interest unlock gate, using the EXACT same formula
// this screen's own Continue button already gates on — extracted once so the two can never
// independently drift the way this codebase's own getStage0TargetLabel precedent already fixed a
// real bug for (see trunkSteps.js).
export function isSurveyComplete(state) {
  const isHighSchool = state.educationLevel === 'highschool';
  return state.interestTags.length > 0 && !!state.educationLevel && !!state.schoolYear
    && (!isHighSchool || !!state.currentSchool);
}

// Dashboard/Guide feature, Stage 5 (see CLAUDE.md) — SurveyScreen has no internal sub-screens
// (it's one continuous page), so unlike Discovery's careers/majors/programs, its "landing on a
// new sub-step" moment is FIELD-completion-driven rather than screen-navigation-driven. This
// mirrors Stage 4's own GUIDED_SEQUENCE/getNextGuidedStep pattern (HubScreen.jsx) at the field
// level: find the first step whose precondition is currently true AND hasn't been shown yet. Each
// key is marked seen (via useMarkMascotSeen) the moment it's shown, so as the student fills in
// one field after another in a single sitting, they naturally see intro -> interests ->
// educationLevel -> schoolYear -> school in sequence, each exactly once — not re-triggered on
// every keystroke within a field, since each key only ever satisfies "not yet seen" once.
const SURVEY_MASCOT_SEQUENCE = [
  { key: 'survey-interests', when: () => true },
  { key: 'survey-educationLevel', when: (state) => state.interestTags.length > 0 },
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
  const [openCategory, setOpenCategory] = useState(null);

  const toggleTag = (name) => {
    const has = state.interestTags.includes(name);
    patch({
      interestTags: has
        ? state.interestTags.filter((t) => t !== name)
        : [...state.interestTags, name],
    });
  };

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
  // interest makes 'survey-educationLevel' eligible on the very same tick 'survey-interests'
  // might still be showing. An earlier version of this resolved only the first eligible+unseen
  // step per
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
  }, [state.interestTags.length, state.educationLevel, state.schoolYear, state.currentSchool]);
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
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'hub' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={1} total={8} />
      <h1 className="page-title">Let's build your plan.</h1>
      <p className="page-sub">
        Answer a few quick questions and we'll put together a personalized roadmap — no
        account, no guesswork.
      </p>

      <div className="field-block">
        <div className="field-label">What are your biggest passions or interests?</div>
        <p className="field-hint">Pick as many as you'd like, across any categories below.</p>
        <div className="selection-count">{state.interestTags.length} selected</div>

        {CATEGORIES.map((cat, i) => {
          const isOpen = openCategory === cat.id;
          const selectedInCat = cat.tags.filter((t) => state.interestTags.includes(t.name)).length;
          const CatIcon = CATEGORY_ICON_MAP[cat.icon];
          const accent = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
          return (
            <div className="tag-category" key={cat.id} style={{ '--tag-accent': accent }}>
              <button
                type="button"
                className="tag-category-header"
                onClick={() => setOpenCategory(isOpen ? null : cat.id)}
              >
                <span className="tag-category-title">
                  <span className="tag-category-icon"><CatIcon size={16} /></span>
                  {cat.label}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {selectedInCat > 0 && <span className="tag-category-count">{selectedInCat} selected</span>}
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>
              {isOpen && (
                <div className="tag-list">
                  {cat.tags.map((t) => {
                    const selected = state.interestTags.includes(t.name);
                    return (
                      <button
                        type="button"
                        key={t.name}
                        className={`tag${selected ? ' selected' : ''}`}
                        onClick={() => toggleTag(t.name)}
                      >
                        <CatIcon size={14} className="tag-icon" />
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Passion Field + Enhanced Conversational "Build Your Own", Task 1 (see CLAUDE.md) — a
          richer, free-text complement to the tag picker above: tags alone can't capture something
          specific/personal the way a sentence or two can. Optional, matching this app's own
          established "optional-badge pill next to the field label" convention (Sign-Up's country/
          avatar/voice fields). Uncontrolled (defaultValue + onBlur, not value + onChange) — the
          same "buffer locally, commit once" trade Roadmap.jsx's own task-outcome textarea already
          established, so this doesn't re-patch state (and re-persist to localStorage) on every
          keystroke. Included verbatim in the Stage 1 compiled profile (profileCompiler.js) so both
          the Stage 2 suggestion feature and Build Your Own's conversation can read it. */}
      <div className="field-block">
        <div className="field-label">
          Want to describe your own passion in your own words? <span className="optional-badge">Optional</span>
        </div>
        <p className="field-hint">
          Tags are a start — if there's something more specific that excites you, tell us about it here.
        </p>
        <label className="task-form-field">
          <textarea
            defaultValue={state.passionText}
            onBlur={(e) => patch({ passionText: e.target.value.trim() })}
            placeholder="e.g. I've spent the last year restoring an old motorcycle with my dad, and I keep wondering if there's a way to combine that with my interest in engineering..."
          />
        </label>
      </div>

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
                transferHighSchool: '',
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
                onClick={() => patch({ schoolYear: y.id })}
              >
                {y.label}
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
          meaning for a student with no current college on file yet. Free-text, matching the same
          optional-field convention passionText already established above (uncontrolled,
          defaultValue + onBlur, an .optional-badge pill) rather than a dropdown — this app's own
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
          onClick={() => patch({ screen: 'hub' })}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
