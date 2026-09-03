import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Rocket, HeartHandshake, Microscope, Cpu, BookOpen, Palette,
  Clock, ListOrdered, Wrench, CheckCircle2, Sparkles, Heart, Circle, Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PROJECT_CATEGORIES, findCategory, findProjectType, BUILD_YOUR_OWN_CATEGORY_ID } from '../data/projects';
import { generateRoadmap } from '../utils/roadmapGenerator';
import { compileStudentProfile } from '../utils/profileCompiler';
import { requestBuildYourOwnChatReply } from '../utils/buildYourOwnChatRequest';
import {
  parseDateInputValue, realDaysBetween, formatDate, computeMilestoneDueDates,
} from '../utils/dates';
import { makeTaskId } from '../utils/ids';
import { isMilestoneDone } from '../utils/milestones';
import StepProgress from '../components/StepProgress';
import MascotWidget from '../components/MascotWidget';
import MascotIcon from '../components/MascotIcon';
import ChatConversation from '../components/ChatConversation';
import ModuleReviewWidget from '../components/ModuleReviewWidget';
import { useMarkMascotSeen, useMascotSeenSnapshot, useMascotRevisitOnce } from '../hooks/useMascotSeen';
import { useModuleReview } from '../hooks/useModuleReview';
import { getMascotLine } from '../data/mascotDialogue';

// Move: Build Your Own (see CLAUDE.md) — the real, AI-powered feature originally built as AI
// Personalization Stage 3 (a general "creative connection" behind the Hub's own "Ask MyPath AI
// anything" button). `BUILD_YOUR_OWN_PROJECT_TYPE_ID` is a synthetic sentinel — it never matches a
// real `projectType.id` in any category's own curated `projectTypes` array (confirmed: no curated
// id looks like this), so `findProjectType`'s own real lookup can never accidentally collide with
// it. `HONESTY_NOTE` is the one standing, ALWAYS-VISIBLE disclaimer (never conditional on what the
// model itself reports) — baked verbatim into a started project's own first step description at
// creation time, matching the exact honesty framing this feature has required since it was first
// built: never presenting a specific unverified organization/contact as confirmed.
//
// Passion Field + Enhanced Conversational "Build Your Own" (see CLAUDE.md) — Consolidate "Build
// Your Own" to One Top-Level Entry (Task 2): this no longer lives inside each of the 6 categories
// — it's its own top-level option, alongside them, with no real category behind it at all. A
// started project from it now carries the synthetic `BUILD_YOUR_OWN_CATEGORY_ID` (data/projects.js
// — exported once there so this screen and profileCompiler.js both read the identical string).
const BUILD_YOUR_OWN_PROJECT_TYPE_ID = 'build-your-own';
const HONESTY_NOTE = 'This is a direction to explore — specific organizations or contacts are for you to find and verify yourself.';

// Task 3's own starter prompts, spanning different project types rather than assuming one
// category (there IS no category context anymore — see Task 2 above) — reduces the blank-page
// problem without pre-committing to a subject area the way the old category-scoped presets did.
const BUILD_YOUR_OWN_PRESETS = [
  'Get a genuinely creative project idea based on my own real profile — not a generic suggestion',
  'Help me find a unique project idea combining my interests',
  'Suggest a project based on my own profile',
];

// Unify All Project Types Under the Conversational System (see CLAUDE.md), Task 3 — the SAME
// blank-page-reducing motivation `BUILD_YOUR_OWN_PRESETS` already serves, just scoped to the real
// picked project type instead of generic, since there's a real starting point to react to here.
function buildSeededPresets(projectTypeName) {
  return [
    `Help me adapt "${projectTypeName}" to something I'm genuinely interested in`,
    'What would make my own version of this stand out?',
    "I like this direction — let's talk through how to make it specifically mine",
  ];
}

// Task 2 — a real, scripted opening message (client-side, no API call — the same "a static,
// always-the-same first-run line doesn't need a real request" precedent
// useOnboardingChat.js's own buildOnboardingGreeting() already established) referencing the real
// curated content already written for the picked project type, seeded exactly once, the very
// first time this specific conversation is opened. Framed explicitly as a starting point, never a
// final answer, per the task's own literal example wording ("You picked X — let's figure out what
// your specific version of this actually looks like").
function buildSeededProjectGreeting(seedContext) {
  const {
    projectTypeName, overview, timeCommitment, example, resources,
  } = seedContext;
  const resourceList = (resources || []).join(', ');
  return `You picked "${projectTypeName}" — let's figure out what your specific version of this actually looks like.\n\nAs a starting point: ${overview} It typically takes about ${timeCommitment}. One example of this kind of project (from a past student, illustrative only): "${example}" And tools like ${resourceList} tend to come in handy.\n\nBut that's just a starting point, not a final answer. Tell me a bit about your own situation — what actually interests you here, what you have access to, what would make this feel like yours — and we'll shape it into something that's really your own.`;
}

// Shared by every real "AI-developed project" creation path — the blank-slate Build Your Own
// conversation AND every curated, conversation-seeded project type alike. Task 1 removes the old
// "pick a start date and begin immediately" flat-steps creation entirely for NEW projects; every
// one now goes through this one real shape (Two-Phase Generation's own `overviewMilestones`),
// regardless of which conversation produced the plan or whether it started from a real curated
// type or a blank slate. A pre-existing, already-started project created under the OLD flat-steps
// shape (from before this feature shipped) is completely untouched by this — nothing here ever
// migrates/rewrites it, and every other piece of this app that reads a started project
// (Roadmap.jsx, roadmapGenerator.js, ProjectTypeView's own timeline rendering below) already
// branches correctly on `overviewMilestones` presence, so both shapes keep working side by side.
function createOverviewProject({
  categoryId, projectTypeId, plan, startDate,
}) {
  const dueDates = computeMilestoneDueDates(startDate, plan.milestones, plan.milestoneDayOffsets);
  return {
    id: makeTaskId('project'),
    categoryId,
    projectTypeId,
    projectName: plan.projectName,
    status: 'active',
    aiSuggested: true,
    startDate,
    overviewMilestones: plan.milestones.map((title, i) => ({
      id: makeTaskId('milestone'),
      title,
      desc: `Part of your ${plan.projectName} project, developed through a conversation with MyPath AI. ${HONESTY_NOTE}`,
      dueDate: dueDates[i],
      targetDate: null,
      subSteps: [],
      chatHistory: [],
    })),
  };
}

const CATEGORY_ICONS = {
  Rocket, HeartHandshake, Microscope, Cpu, BookOpen, Palette, Sparkles,
};
// Palette repaint, Opportunity Finder/Project Builder batch (see CLAUDE.md) — Task 2's own
// "give each of the 6 project categories a distinct color" requirement. Plain index-cycling
// through 6 of the 7 "bloom" accent tokens (the same set TrackVisuals.jsx cycles through for
// interest tracks), NOT a track-based lookup — these categories don't correspond 1:1 to
// interest tracks, and mapping them through getTrackColor() would risk real collisions (verified
// while planning this: at least 2 of the 6 would land on the same color if naively mapped via
// their "closest" conceptual track). `--bloom-green` is deliberately left out here — that's the
// one color already reserved app-wide as the universal "selected/verified" signal (Opportunity
// Finder's own selected-card border, the hub's unlock accent), so keeping it out of the
// per-category identity set avoids a category's own resting color ever being confused with that
// meaning. 6 categories over 6 remaining tokens means every one is genuinely distinct.
const CATEGORY_COLORS = [
  'var(--bloom-purple)', 'var(--bloom-yellow)', 'var(--bloom-teal)',
  'var(--bloom-orange)', 'var(--bloom-pink)', 'var(--bloom-blue)',
];
// Shared by every view (category grid, a category's own detail page, a project type's detail
// page) so the SAME category always shows the SAME color everywhere it appears, rather than the
// category grid alone knowing about `CATEGORY_COLORS` and every other view falling back to a
// single hardcoded teal the way this screen did before this batch. Build Your Own (now top-level,
// see Task 2 above) gets its own fixed `--bloom-ai` identity instead of falling into the 6-color
// cycle — it isn't one of the real `PROJECT_CATEGORIES` entries, and giving it a genuinely
// different, reserved-for-AI-markers color keeps it visually distinct from all 6 real categories
// rather than coincidentally reusing one of their colors (index -1 % 6 would otherwise silently
// collide with index 0's own color).
function getCategoryColor(categoryId) {
  if (categoryId === BUILD_YOUR_OWN_CATEGORY_ID) return 'var(--bloom-ai)';
  const i = PROJECT_CATEGORIES.findIndex((c) => c.id === categoryId);
  return CATEGORY_COLORS[(i < 0 ? 0 : i) % CATEGORY_COLORS.length];
}
// The pseudo-category ProjectTypeView's header reads when rendering a Build Your Own project —
// there's no real PROJECT_CATEGORIES entry to look up (Task 2), so this stands in for it, carrying
// just the two fields that view actually reads (`label`, `icon`).
const BUILD_YOUR_OWN_PSEUDO_CATEGORY = { id: BUILD_YOUR_OWN_CATEGORY_ID, label: 'Build Your Own', icon: 'Sparkles' };

// AI-First Onboarding, Stage 4 (see CLAUDE.md) — `isMilestoneDone` moved to the shared
// `utils/milestones.js` once MyNarrativeScreen.jsx needed the identical function too, rather than
// a second, drifting copy — imported at the top of this file now.

// How close (in days) a chosen project start date has to land to an existing roadmap commitment
// before we surface a heads-up. Soft only — never blocks confirming the start date.
const CONFLICT_WINDOW_DAYS = 3;

export default function ProjectBuilderScreen() {
  const { state, patch } = useApp();
  // Local, unpersisted browse state — refreshing mid-browse just lands back on the category
  // grid, which is an acceptable reset for a "browse and explore" screen (unlike survey answers
  // or selections elsewhere, nothing here is lost if you re-pick your path).
  const [view, setView] = useState('categories'); // 'categories' | 'category' | 'projectType' | 'projectBrainstorm' | 'buildYourOwn'
  const [categoryId, setCategoryId] = useState(null);
  const [projectTypeId, setProjectTypeId] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  // Passion Field + Enhanced Conversational "Build Your Own" (see CLAUDE.md), Task 6, generalized
  // by "Unify All Project Types Under the Conversational System" (see CLAUDE.md) to serve BOTH the
  // blank-slate Build Your Own conversation AND every curated, conversation-seeded project type —
  // only one conversation's plan is ever "in flight" being started at a time within one screen
  // visit, so one shared slot is fine (matching the original single-slot precedent). `chosenPlan`
  // (`{ projectName, milestones }`) is the plan the student explicitly chose to start from by
  // clicking "Start This Project" inside a conversation — NOT just the latest plan the AI happens
  // to have proposed (the conversation can keep evolving the plan turn to turn; this freezes the
  // exact one the student committed to). `startedBuildYourOwnProject` is still Build-Your-Own-
  // specific: the just-created project once a start date is confirmed, tracked directly here (NOT
  // derived by looking up `state.startedProjects` via `projectTypeId`) because every "Build Your
  // Own" project shares the SAME synthetic `BUILD_YOUR_OWN_PROJECT_TYPE_ID` — unlike a real
  // curated projectType, that id can't uniquely identify "this one specific project." A curated,
  // conversation-seeded project needs no such workaround — its own real, unique `projectType.id`
  // already lets `startedProject` (below) derive correctly the instant `state.startedProjects`
  // gains the new entry.
  const [chosenPlan, setChosenPlan] = useState(null);
  const [startedBuildYourOwnProject, setStartedBuildYourOwnProject] = useState(null);

  const roadmap = useMemo(() => generateRoadmap(state), [state]);
  const allNodes = useMemo(() => {
    const list = [...roadmap.spine];
    roadmap.spine.forEach((n) => { if (n.hasBranch) list.push(...n.branchSteps); });
    return list;
  }, [roadmap]);

  // Return-to-Hub routing restructure (see CLAUDE.md) — both exits (Skip and Back-from-the-
  // top-level category grid) return to the hub now, not the old chain's next/previous screen.
  // Bug fix (see CLAUDE.md) — Skip now also sets `projectBuilderSkipped`, the same real
  // "explicitly skipped" signal HubScreen.jsx's GUIDED_SEQUENCE reads for this step's own `isDone`
  // — without this, the hub kept treating an explicitly-skipped Project Builder as still pending
  // forever, repeatedly pointing back at it instead of recognizing the primary sequence as
  // finished. `goBack`'s own top-level exit (below) is a genuine "leave without deciding" action,
  // not an explicit skip, so it deliberately does NOT set this flag — only this dedicated button
  // counts as "the student was asked and chose to skip."
  const skip = () => patch({ screen: 'hub', projectBuilderSkipped: true });

  // Reactive Conversation Layer for Tutorial Modules (see CLAUDE.md) — this screen has no single
  // forced "Continue" exit the way the other 5 modules do (Back and "Go to my Academic Plan" have
  // always both been reachable at any time, since Project Builder is explicitly optional/
  // skippable by design — see this file's own established precedent). The real "done with this
  // module" moment here is genuinely STARTING a project (curated or Build Your Own) — that's the
  // real, specific choice worth reacting to — so `confirmStart()` below triggers the review right
  // after a project is actually created, rather than gating a screen-exit button. `onConfirm` is a
  // no-op: unlike the other 5 modules, there's no real "advance" action to run afterward — the
  // student simply keeps browsing/adding steps or leaves whenever they choose, exactly as before.
  const moduleReview = useModuleReview('projectBuilder', 'projectBuilder-intro', () => {});

  const openCategory = (id) => { setCategoryId(id); setProjectTypeId(null); setView('category'); };
  // Unify All Project Types Under the Conversational System (see CLAUDE.md), Task 1 — clicking a
  // NOT-yet-started project type now opens the real conversation (`'projectBrainstorm'`) instead
  // of the old static overview-then-immediate-start page; a project type that ALREADY has a real
  // started project (this session or a prior one — checked via its own real, unique id, which is
  // exactly what still lets this dedup correctly) still routes to the existing `'projectType'`
  // view, completely unchanged, showing that real project's own started-state banner/timeline.
  const openProjectType = (id) => {
    setProjectTypeId(id);
    setShowStartPicker(false);
    setStartDate('');
    setChosenPlan(null);
    const alreadyStarted = (state.startedProjects || []).some((p) => p.projectTypeId === id);
    setView(alreadyStarted ? 'projectType' : 'projectBrainstorm');
  };
  // Consolidate "Build Your Own" to One Top-Level Entry (see CLAUDE.md), Task 2 — reachable
  // directly from the top-level category grid now, with no category to remember/reset.
  const openBuildYourOwn = () => {
    setChosenPlan(null);
    setStartedBuildYourOwnProject(null);
    setShowStartPicker(false);
    setStartDate('');
    setView('buildYourOwn');
  };
  const goBack = () => {
    if (view === 'projectType') { setShowStartPicker(false); setView('category'); return; }
    if (view === 'projectBrainstorm') {
      // Same "one level at a time" granularity as Build Your Own's own Back below: if a plan is
      // locked in (chosen mid-conversation) but not yet actually started, Back returns to the
      // live conversation instead of leaving it entirely.
      if (chosenPlan && !startedProject) { setChosenPlan(null); setShowStartPicker(false); return; }
      setShowStartPicker(false);
      setView('category');
      return;
    }
    if (view === 'buildYourOwn') {
      // If the student clicked "Start This Project" (a plan is locked in) but hasn't actually
      // confirmed a start date yet, Back returns to the live conversation instead of leaving it
      // entirely — the same "one level at a time" granularity a curated project type's own Back
      // (project type -> category, not project type -> categories) already has.
      if (chosenPlan && !startedBuildYourOwnProject) { setChosenPlan(null); setShowStartPicker(false); return; }
      setShowStartPicker(false);
      setView('categories');
      return;
    }
    if (view === 'category') { setCategoryId(null); setView('categories'); return; }
    patch({ screen: 'hub' });
  };

  const category = categoryId ? findCategory(categoryId) : null;
  const found = categoryId && projectTypeId ? findProjectType(categoryId, projectTypeId) : null;
  const projectType = found?.projectType || null;

  const startedProject = view === 'buildYourOwn'
    ? startedBuildYourOwnProject
    : (projectType ? (state.startedProjects || []).find((p) => p.projectTypeId === projectType.id) : null);

  const findNearbyConflict = (dateStr) => {
    if (!dateStr) return null;
    const chosen = parseDateInputValue(dateStr);
    return allNodes.find((n) => Math.abs(realDaysBetween(n.date, chosen)) <= CONFLICT_WINDOW_DAYS) || null;
  };
  const conflict = findNearbyConflict(startDate);

  // Two-Phase Generation (see CLAUDE.md) — starting a project now creates ALL of its small set of
  // overview PHASES up front (Task 1's own `chosenPlan.milestones`, a short 4-7-item overview
  // list, not a granular plan) as `overviewMilestones`, each with empty `subSteps`/`chatHistory` —
  // only the FIRST phase is reachable/unlockable at this point (real locking is computed fresh
  // from `completedNodes` every time the roadmap regenerates, see roadmapGenerator.js's
  // `buildOverviewMilestoneChains`, not stored here). `startDate` (the picked Project Start Date)
  // becomes `project.startDate`, milestone 0's own real anchor date — every later phase's own date
  // is likewise computed fresh, never stored.
  //
  // Unify All Project Types Under the Conversational System (see CLAUDE.md), Task 1 — this
  // REPLACES the old `guideSteps`/flat `steps` immediate-start shape entirely for EVERY NEW
  // project, curated or blank-slate alike (see `createOverviewProject`'s own header comment for
  // why a pre-existing, already-started project under the old shape is unaffected). Task 4 — "same
  // 'Start This Project' outcome... already used everywhere else" holds literally: both branches
  // below call the exact same shared `createOverviewProject` helper, differing only in which real
  // (or synthetic, for blank Build Your Own) `categoryId`/`projectTypeId` gets attached.
  const confirmStart = () => {
    if (!startDate || !chosenPlan) return;
    if (view === 'buildYourOwn') {
      const newProject = createOverviewProject({
        categoryId: BUILD_YOUR_OWN_CATEGORY_ID,
        projectTypeId: BUILD_YOUR_OWN_PROJECT_TYPE_ID,
        plan: chosenPlan,
        startDate,
      });
      patch({ startedProjects: [...(state.startedProjects || []), newProject] });
      setStartedBuildYourOwnProject(newProject);
      setShowStartPicker(false);
      setStartDate('');
      moduleReview.beginReview();
      return;
    }
    if (view === 'projectBrainstorm') {
      if (!category || !projectType) return;
      const newProject = createOverviewProject({
        categoryId: category.id,
        projectTypeId: projectType.id,
        plan: chosenPlan,
        startDate,
      });
      patch({ startedProjects: [...(state.startedProjects || []), newProject] });
      // No extra local tracking needed here, unlike Build Your Own above — a real curated
      // `projectType.id` is genuinely unique, so `startedProject` (derived above from
      // `state.startedProjects`) already correctly picks up this new project the instant `patch()`
      // commits, with zero disambiguation workaround required.
      setShowStartPicker(false);
      setStartDate('');
      moduleReview.beginReview();
    }
  };

  // Dashboard/Guide feature, Stage 5 (see CLAUDE.md) — the intro line is a one-time, ever line
  // regardless of which of the 3 sub-views the student is on (it's about the FEATURE, not a
  // specific category/project type). The revisit line ("Ready to add another step to your
  // project?") is deliberately gated on an actually-active started project, not just "has seen
  // the intro before" — a student who's browsed this screen once but never started anything has
  // no next step to be nudged toward, so they see nothing on a return visit instead.
  const hasActiveProject = (state.startedProjects || []).some((p) => p.status === 'active');
  // Snapshotted, not a live check — see useMascotSeen.js's own comment.
  const pbIntroSeen = useMascotSeenSnapshot('projectBuilder-intro');
  useMarkMascotSeen(pbIntroSeen ? null : 'projectBuilder-intro');
  // Bug fix (see CLAUDE.md) — the revisit line used to show every time hasActiveProject was true,
  // including on every fresh re-entry to this screen while the same project was still in
  // progress. useMascotRevisitOnce gives it the same "shown once, ever" treatment the intro
  // already has, chained one step later, instead of repeating for as long as the precondition
  // stays true.
  const pbRevisitText = useMascotRevisitOnce(pbIntroSeen && hasActiveProject, 'projectBuilder-revisit');
  const mascotText = !pbIntroSeen ? getMascotLine('projectBuilder-intro') : pbRevisitText;

  return (
    <div>
      <MascotWidget text={mascotText} />
      <div className="pb-topbar">
        <button type="button" className="btn btn-ghost" onClick={goBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <button type="button" className="btn btn-ghost pb-skip" onClick={skip}>
          Skip for now <ArrowRight size={14} />
        </button>
      </div>

      <StepProgress step={7} total={8} />

      {view === 'categories' && <CategoriesView onOpenCategory={openCategory} onOpenBuildYourOwn={openBuildYourOwn} />}

      {view === 'category' && category && (
        <CategoryView
          category={category}
          onOpenProjectType={openProjectType}
          startedProjects={state.startedProjects || []}
        />
      )}

      {view === 'projectType' && category && projectType && (
        <ProjectTypeView
          category={category}
          projectType={projectType}
          startedProject={startedProject}
          completedNodes={state.completedNodes}
          showStartPicker={showStartPicker}
          startDate={startDate}
          conflict={conflict}
          onStartClick={() => setShowStartPicker(true)}
          onCancelStart={() => { setShowStartPicker(false); setStartDate(''); }}
          onChangeStartDate={setStartDate}
          onConfirmStart={confirmStart}
          onGoToPlan={() => patch({ screen: 'plan' })}
        />
      )}

      {/* Unify All Project Types Under the Conversational System (see CLAUDE.md), Task 1/2 — a
          NOT-yet-started curated project type opens this real conversation instead of the old
          static overview page, seeded with its own real curated content (Task 2). `chatKey` is the
          real, unique `projectType.id`, so this conversation's own thread never mixes with any
          other project type's, or with blank Build Your Own's own thread. */}
      {view === 'projectBrainstorm' && category && projectType && (
        <ProjectConversationView
          state={state}
          patch={patch}
          chatKey={projectType.id}
          seedContext={{
            projectTypeName: projectType.name,
            overview: projectType.overview,
            timeCommitment: projectType.timeCommitment,
            example: category.example,
            resources: projectType.resources,
          }}
          category={category}
          plan={chosenPlan}
          onChoosePlan={setChosenPlan}
          startedProject={startedProject}
          completedNodes={state.completedNodes}
          showStartPicker={showStartPicker}
          startDate={startDate}
          conflict={conflict}
          onStartClick={() => setShowStartPicker(true)}
          onCancelStart={() => { setShowStartPicker(false); setStartDate(''); }}
          onChangeStartDate={setStartDate}
          onConfirmStart={confirmStart}
          onGoToPlan={() => patch({ screen: 'plan' })}
        />
      )}

      {view === 'buildYourOwn' && (
        <ProjectConversationView
          state={state}
          patch={patch}
          chatKey={BUILD_YOUR_OWN_PROJECT_TYPE_ID}
          seedContext={null}
          category={null}
          plan={chosenPlan}
          onChoosePlan={setChosenPlan}
          startedProject={startedProject}
          completedNodes={state.completedNodes}
          showStartPicker={showStartPicker}
          startDate={startDate}
          conflict={conflict}
          onStartClick={() => setShowStartPicker(true)}
          onCancelStart={() => { setShowStartPicker(false); setStartDate(''); }}
          onChangeStartDate={setStartDate}
          onConfirmStart={confirmStart}
          onGoToPlan={() => patch({ screen: 'plan' })}
        />
      )}

      <ModuleReviewWidget review={moduleReview} label="Project Builder" />
    </div>
  );
}

function CategoriesView({ onOpenCategory, onOpenBuildYourOwn }) {
  return (
    <>
      <h1 className="page-title">Build a Project</h1>
      <p className="page-sub">
        Ready to build something of your own? Browse real project ideas across six areas, or build
        your own from scratch with a real AI brainstorming partner — pick one that sparks
        something, or skip straight to your plan. Nothing here is required.
      </p>

      <div className="pb-category-grid">
        {/* Consolidate "Build Your Own" to One Top-Level Entry (see CLAUDE.md), Task 2 — a 7th
            option sitting alongside the 6 real categories, not nested inside any one of them.
            Reuses `.pb-category-card` wholesale (same size/layout/hover as every real category)
            with its own reserved `--bloom-ai` accent (see `getCategoryColor`'s own comment) plus a
            small dashed-border modifier so it still reads as a genuinely different KIND of
            capability, not one more subject area. */}
        <button
          type="button"
          className="pb-category-card pb-build-your-own-category-card"
          onClick={onOpenBuildYourOwn}
          style={{ '--pb-accent': getCategoryColor(BUILD_YOUR_OWN_CATEGORY_ID) }}
        >
          <div className="pb-icon-badge"><Sparkles size={26} /></div>
          <div className="pb-category-label">Build Your Own</div>
          <p className="pb-category-desc">
            Develop a genuinely original project idea with a real AI brainstorming partner, based
            on your own profile — not a generic suggestion.
          </p>
        </button>
        {PROJECT_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon];
          const color = getCategoryColor(cat.id);
          return (
            <button
              type="button"
              key={cat.id}
              className="pb-category-card"
              onClick={() => onOpenCategory(cat.id)}
              style={{ '--pb-accent': color }}
            >
              <div className="pb-icon-badge"><Icon size={26} /></div>
              <div className="pb-category-label">{cat.label}</div>
              <p className="pb-category-desc">{cat.description}</p>
            </button>
          );
        })}
      </div>
    </>
  );
}

// Task 2's own "simple avatar-style icons for the illustrative usernames" — a plain colored
// initial-circle, cycled through the same 6-color category set (not a real avatar image; this
// is still explicitly mocked/illustrative content, see the header comment in data/projects.js).
// Cycled by the post's OWN index within its category's array (passed in), not the category's
// own color, so the two posts in one category still read as two distinct "people" rather than
// both wearing the category's single accent color.
const AVATAR_COLORS = [
  'var(--bloom-blue)', 'var(--bloom-pink)', 'var(--bloom-teal)',
  'var(--bloom-orange)', 'var(--bloom-purple)', 'var(--bloom-yellow)',
];

function CategoryView({ category, onOpenProjectType, startedProjects }) {
  const Icon = CATEGORY_ICONS[category.icon];
  const color = getCategoryColor(category.id);
  return (
    <>
      <div className="pb-icon-badge pb-icon-badge-lg" style={{ '--pb-accent': color }}>
        <Icon size={30} />
      </div>
      <h1 className="page-title">{category.label}</h1>
      <p className="page-sub">{category.description}</p>

      <div className="pb-example-box">
        <div className="pb-example-eyebrow"><Sparkles size={13} /> Example project</div>
        <p className="pb-example-text">{category.example}</p>
        <p className="pb-example-caveat">Just an example to get you thinking — not a real submission from another student.</p>
      </div>

      {category.communityExamples?.length > 0 && (
        <div className="pb-community-section">
          <div className="field-label" style={{ marginTop: 28 }}>Community Project Examples</div>
          <p className="field-hint">
            A preview of what a Community feature could look like — not real, not submittable yet.
          </p>
          <div className="pb-community-grid">
            {category.communityExamples.map((post, i) => (
              <div className="pb-community-card" key={post.name}>
                <div className="pb-community-header">
                  <div className="pb-community-avatar" style={{ '--avatar-accent': AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                    {post.handle.replace('@', '').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="pb-community-handle">{post.handle}</div>
                    <div className="pb-community-grade">{post.grade}</div>
                  </div>
                </div>
                <div className="pb-community-name">{post.name}</div>
                <p className="pb-community-blurb">{post.blurb}</p>
                <div className="pb-community-footer">
                  <span className="pb-like-pill"><Heart size={12} /> {post.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="field-label" style={{ marginTop: 28 }}>Pick a project type</div>
      <div className="pb-projecttype-grid">
        {category.projectTypes.map((pt) => {
          const started = startedProjects.some((p) => p.projectTypeId === pt.id);
          return (
            <button
              type="button"
              key={pt.id}
              className="pb-projecttype-card"
              onClick={() => onOpenProjectType(pt.id)}
            >
              <div className="pb-projecttype-name">{pt.name}</div>
              <p className="pb-projecttype-teaser">{pt.overview}</p>
              {started && <span className="pb-started-tag"><CheckCircle2 size={12} /> Started</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

function ProjectTypeView({
  category, projectType, startedProject, completedNodes, showStartPicker, startDate, conflict,
  onStartClick, onCancelStart, onChangeStartDate, onConfirmStart, onGoToPlan,
}) {
  const Icon = CATEGORY_ICONS[category.icon];
  const color = getCategoryColor(category.id);
  return (
    <>
      <div className="pb-category-chip" style={{ '--pb-accent': color }}>
        <Icon size={14} /> {category.label}
      </div>
      <h1 className="page-title">{projectType.name}</h1>
      <p className="page-sub">{projectType.overview}</p>

      <div className="pb-stat-row">
        <div className="pb-stat">
          <Clock size={16} />
          <div>
            <div className="pb-stat-label">Estimated Time Commitment</div>
            <div className="pb-stat-value">{projectType.timeCommitment}</div>
          </div>
        </div>
      </div>

      <div className="pb-detail-section">
        <div className="field-label"><ListOrdered size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />Step-by-Step Guide</div>
        <ol className="pb-steps-list">
          {projectType.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </div>

      <div className="pb-detail-section">
        <div className="field-label"><Wrench size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />Recommended Tools & Resources</div>
        <ul className="pb-resources-list">
          {projectType.resources.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </div>

      {!startedProject && !showStartPicker && (
        <button type="button" className="btn btn-primary pb-start-btn" onClick={onStartClick}>
          <Rocket size={16} /> Start This Project!
        </button>
      )}

      {!startedProject && showStartPicker && (
        <div className="pb-start-panel">
          <label className="task-form-field">
            <span className="label">Project Start Date</span>
            <input type="date" value={startDate} onChange={(e) => onChangeStartDate(e.target.value)} required />
          </label>
          {conflict && (
            <div className="pb-conflict-warning">
              Heads up — <strong>{conflict.title}</strong> is due {formatDate(conflict.date)}, close to this
              date. You can still start here — nothing's blocked.
            </div>
          )}
          <div className="task-form-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancelStart}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={!startDate} onClick={onConfirmStart}>
              Confirm Start
            </button>
          </div>
        </div>
      )}

      {startedProject && (
        <div className="pb-started-banner">
          {startedProject.status === 'completed' ? (
            <div className="pb-started-headline">
              <CheckCircle2 size={18} /> Project complete! Great work.
            </div>
          ) : (
            <div className="pb-started-headline">
              <CheckCircle2 size={18} /> Started — on your Academic Plan
            </div>
          )}

          {/* Task 2's own "satisfying transition animation each time a new step is revealed" —
              the actual reveal MECHANIC (Roadmap.jsx's toggleDone, out of this repaint's scope
              per CLAUDE.md) is completely untouched; this is a purely visual, read-only timeline
              of the SAME `startedProject.steps`/`state.completedNodes` data that mechanic already
              writes. Every step gets its own `<li key={step.id}>`, so a step that's genuinely new
              (added by that mechanic since the last render) mounts as a new DOM node and its
              `pb-timeline-step-in` entrance animation plays automatically — the same "new key =
              new node = the CSS animation just replays" pattern this codebase already uses for
              every other reveal (hub tiles, transcript rows, Program-Specific sections) — no extra
              JS state needed to detect "which step is new." */}
          {/* Two-Phase Generation (see CLAUDE.md) — a NEW-style Build Your Own project has no flat
              `steps` array at all (see roadmapGenerator.js's `buildOverviewMilestoneChains`); its
              real, dated, lock-aware timeline lives on the Academic Plan itself (each phase a
              spine item with its own scoped planning chat), so this preview is deliberately a
              simpler, date-free overview list — just which phases exist and their current
              done/locked/active state, using the exact same `isMilestoneDone` rule the real
              roadmap generator uses for locking, not a second concept. */}
          <ol className="pb-timeline">
            {startedProject.overviewMilestones ? (
              startedProject.overviewMilestones.map((m, i) => {
                const done = isMilestoneDone(m, completedNodes);
                const locked = i > 0 && !isMilestoneDone(startedProject.overviewMilestones[i - 1], completedNodes);
                const isCurrent = !done && !locked;
                return (
                  <li
                    key={m.id}
                    className={`pb-timeline-step${done ? ' done' : ''}${isCurrent ? ' current' : ''}`}
                  >
                    <span className="pb-timeline-marker">
                      {done ? <CheckCircle2 size={16} /> : locked ? <Lock size={14} /> : <Circle size={16} />}
                    </span>
                    <div className="pb-timeline-body">
                      <div className="pb-timeline-title">{m.title}</div>
                      <div className="pb-timeline-date">
                        {done ? 'Complete' : locked ? 'Locked' : 'Plan this phase on your Academic Plan'}
                      </div>
                    </div>
                  </li>
                );
              })
            ) : startedProject.steps.map((step, i) => {
              const done = !!completedNodes?.[step.id];
              const isCurrent = !done && i === startedProject.steps.length - 1;
              return (
                <li
                  key={step.id}
                  className={`pb-timeline-step${done ? ' done' : ''}${isCurrent ? ' current' : ''}`}
                >
                  <span className="pb-timeline-marker">
                    {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </span>
                  <div className="pb-timeline-body">
                    <div className="pb-timeline-title">{step.title}</div>
                    <div className="pb-timeline-date">
                      {done ? 'Completed' : 'Due'} {formatDate(parseDateInputValue(step.date))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {startedProject.status !== 'completed' && startedProject.overviewMilestones && (
            <p className="field-hint" style={{ margin: '10px 0 0' }}>
              Open the currently unlocked phase on your Academic Plan to plan its concrete steps —
              finishing it unlocks the next one.
            </p>
          )}
          {startedProject.status !== 'completed' && !startedProject.overviewMilestones && (
            <p className="field-hint" style={{ margin: '10px 0 0' }}>
              Mark the current step complete on your Academic Plan to reveal what's next — this
              project has no fixed end date, so it only grows one step at a time.
            </p>
          )}

          <div className="task-form-actions" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
            <button type="button" className="btn btn-primary" onClick={onGoToPlan}>Go to my Academic Plan</button>
          </div>
        </div>
      )}
    </>
  );
}

// Passion Field + Enhanced Conversational "Build Your Own" (see CLAUDE.md) — replaces the old
// single-question/single-answer flow entirely with a real, ongoing brainstorming conversation
// (Tasks 3-5), reusing the shared `ChatConversation` UI (Task 4's own "do not build a third,
// separate chat implementation"). Once the conversation has developed a plan the student commits
// to (Task 6, `plan` prop — set by the parent's `onChoosePlan` the moment "Start This Project" is
// clicked), this reuses `ProjectTypeView` WHOLESALE via a synthetic `projectType`-shaped object
// built from that plan's own AI-generated milestones — the same "same existing mechanism,
// unchanged" requirement this feature has always held, satisfied literally rather than
// reimplementing a parallel date-picker/conflict-check/start-button flow.
//
// Unify All Project Types Under the Conversational System (see CLAUDE.md) — renamed from
// `BuildYourOwnView`/generalized to serve EVERY project type, not just the top-level blank-slate
// one — Task 3's own "reuse the exact same underlying conversational logic, not a separate/lesser
// implementation" is satisfied by this being the literal SAME component/mechanism for both, never
// a second copy. `chatKey` (the real, unique conversation identifier — either
// `BUILD_YOUR_OWN_PROJECT_TYPE_ID` for the blank-slate case, or a real curated `projectType.id`)
// is what keeps each project type's own conversation genuinely separate in
// `state.projectBrainstormChats`. `seedContext` (`null` for blank Build Your Own) is the real
// curated content a curated project type seeds its conversation with (Task 2) — both the client's
// own scripted opening message AND the real request sent to the AI read it, so the model's own
// first reply and everything after it can genuinely build on this real starting point rather than
// ignoring it. `category` is the REAL category object for a curated conversation (used for the
// header chip and, once a plan is chosen, the resulting preview's own category context) or `null`
// for blank Build Your Own (which falls back to `BUILD_YOUR_OWN_PSEUDO_CATEGORY`, unchanged).
function ProjectConversationView({
  state, patch, chatKey, seedContext, category, plan, onChoosePlan, startedProject, completedNodes,
  showStartPicker, startDate, conflict, onStartClick, onCancelStart, onChangeStartDate,
  onConfirmStart, onGoToPlan,
}) {
  const chatHistory = (state.projectBrainstormChats || {})[chatKey] || [];
  const [loading, setLoading] = useState(false);

  // Task 2 — a real, scripted opening message referencing the picked project type's own real
  // curated content, seeded exactly once, the very first time THIS specific conversation
  // (identified by `chatKey`) is opened — see `buildSeededProjectGreeting`'s own header comment.
  // Blank Build Your Own (`seedContext` null) has nothing specific to reference yet, so it
  // correctly gets no scripted opener, exactly as before this feature.
  useEffect(() => {
    if (seedContext && chatHistory.length === 0) {
      patch({
        projectBrainstormChats: {
          ...state.projectBrainstormChats,
          [chatKey]: [{ role: 'assistant', content: buildSeededProjectGreeting(seedContext) }],
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatKey]);

  // Add Explicit "Not Satisfied, Keep Refining" Option (see CLAUDE.md) — a dismiss for the
  // "Start This Project" footer that hides it WITHOUT touching any persisted data (the chat
  // history/planReady/milestones fields are completely untouched — this is purely a local,
  // session-only "I've seen this readiness prompt, hide it for now" flag), the same "dismissing
  // is just an ordinary visual state, never a data mutation" posture MascotWidget's own dismiss
  // already established. Tracked by the ready message's own index rather than a plain boolean, so
  // dismissing THIS turn's prompt doesn't also suppress a LATER, genuinely new one — if the
  // student keeps talking and a later reply reaches planReady again (whether refined or
  // unchanged), its own index differs, so the footer reappears for that new turn automatically.
  const [dismissedReadyIndex, setDismissedReadyIndex] = useState(-1);

  // Task 6 — scans the persisted conversation for the MOST RECENT assistant turn that reported a
  // genuinely complete plan, so "Start This Project" always reflects the latest thinking even if
  // the student keeps refining after an earlier turn already reached planReady. This is derived
  // straight from `chatHistory` (no separate state to keep in sync) — since each message's own
  // `planReady`/`projectName`/`milestones` fields are persisted right alongside its `content`,
  // this survives a reload exactly like the rest of the conversation does.
  const latestReadyPlan = useMemo(() => {
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const m = chatHistory[i];
      if (m.role === 'assistant' && m.planReady && m.projectName && m.milestones?.length) {
        return {
          projectName: m.projectName,
          milestones: m.milestones,
          // Generalize the Overview/lock system to Every Multi-Step Chain (see CLAUDE.md), Task 4
          // — carried straight through to confirmStart's own computeMilestoneDueDates call.
          milestoneDayOffsets: m.milestoneDayOffsets || null,
          sourceIndex: i,
        };
      }
    }
    return null;
  }, [chatHistory]);

  // Opt-In Voice Per Message in Chat + Editable Messages (see CLAUDE.md) — `sendFrom` is shared by
  // a normal send (from the full current history) and `editMessage` (from history truncated to
  // just before the edited message), the same refactor `useHubChat.js` already applies to the hub/
  // Map-2-widget conversation. Voice is no longer auto-triggered here either — no more
  // `setSpeakingText`/`useMascotSpeech` call — `ChatConversation` renders its own per-message
  // Play/Stop button instead.
  const sendFrom = (baseHistory, trimmed) => {
    const history = baseHistory.map((m) => ({ role: m.role, content: m.content }));
    const afterUser = [...baseHistory, { role: 'user', content: trimmed }];
    const writeChat = (nextHistory) => patch({
      projectBrainstormChats: { ...state.projectBrainstormChats, [chatKey]: nextHistory },
    });
    writeChat(afterUser);
    setLoading(true);
    // Task 2 — the full Stage 1 profile (not the bounded Stage-2-only variant), same reasoning
    // this feature has always used: student-initiated and infrequent, so Stage 2's own
    // cost-bounding concern for auto-triggered suggestions doesn't apply here. Includes the
    // Survey's own optional `passionText` field verbatim (Task 1), giving the brainstorm
    // something more specific/personal than a tag list alone to ground ideas in.
    const profileSummary = compileStudentProfile(state);
    requestBuildYourOwnChatReply(
      {
        history, prompt: trimmed, profileSummary, seedContext,
      },
      {
        onResult: (proposal) => {
          setLoading(false);
          if (!proposal || typeof proposal.reply !== 'string' || !proposal.reply.trim()) {
            writeChat([...afterUser, { role: 'assistant', content: "Sorry, I couldn't think of anything just now — try again." }]);
            return;
          }
          writeChat([...afterUser, {
            role: 'assistant',
            content: proposal.reply,
            planReady: proposal.planReady,
            projectName: proposal.projectName,
            milestones: proposal.milestones,
            milestoneDayOffsets: proposal.milestoneDayOffsets,
          }]);
        },
        onError: () => {
          setLoading(false);
          writeChat([...afterUser, { role: 'assistant', content: 'Sorry, something went wrong — try again in a moment.' }]);
        },
      },
    );
  };
  const sendMessage = (trimmed) => sendFrom(chatHistory, trimmed);
  const editMessage = (index, newContent) => sendFrom(chatHistory.slice(0, index), newContent);

  // Once the student has explicitly committed to a plan (clicked "Start This Project"), this
  // reuses ProjectTypeView exactly like every other project type/the old single-idea flow did —
  // `resources: []` since there's no curated tool list for a freeform conversational idea, and
  // `steps: plan.milestones` shows the FULL developed arc as the "Step-by-Step Guide" preview,
  // same as a curated project type's own full guide shows before starting. Uses the REAL `category`
  // when this conversation was seeded from one, so the resulting preview shows real category
  // context instead of the synthetic Build-Your-Own pseudo-category.
  if (plan) {
    const aiProjectType = {
      id: chatKey,
      name: plan.projectName,
      overview: 'Developed through a real conversation with MyPath AI, grounded in your own profile.',
      timeCommitment: 'Up to you — shaped by your own conversation.',
      steps: plan.milestones,
      resources: [],
    };
    return (
      <ProjectTypeView
        category={category || BUILD_YOUR_OWN_PSEUDO_CATEGORY}
        projectType={aiProjectType}
        startedProject={startedProject}
        completedNodes={completedNodes}
        showStartPicker={showStartPicker}
        startDate={startDate}
        conflict={conflict}
        onStartClick={onStartClick}
        onCancelStart={onCancelStart}
        onChangeStartDate={onChangeStartDate}
        onConfirmStart={onConfirmStart}
        onGoToPlan={onGoToPlan}
      />
    );
  }

  const ChipIcon = category ? CATEGORY_ICONS[category.icon] : Sparkles;
  const chipAccent = category ? getCategoryColor(category.id) : 'var(--bloom-ai)';
  const presets = seedContext ? buildSeededPresets(seedContext.projectTypeName) : BUILD_YOUR_OWN_PRESETS;

  return (
    <>
      <div className="pb-category-chip" style={{ '--pb-accent': chipAccent }}>
        <ChipIcon size={14} /> {category ? category.label : 'Build Your Own'}
      </div>
      <h1 className="page-title">
        {seedContext ? `Let’s shape your ${seedContext.projectTypeName}` : 'Let’s build something together'}
      </h1>
      <p className="page-sub">
        {seedContext
          ? "A real back-and-forth with MyPath AI, starting from this project type's own real overview — tailored specifically to you. Keep talking until it feels like your own plan, then start it whenever you're ready."
          : "A real back-and-forth with MyPath AI to develop a genuinely original project idea based on your own profile — not a single generic suggestion. Keep talking until it feels like a real plan, then start it whenever you're ready."}
      </p>

      <div className="chat-header" style={{ marginBottom: 16 }}>
        <MascotIcon size={44} />
        <div>
          <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
          <h2 className="hub-chat-title" style={{ fontSize: 16 }}>Brainstorming partner</h2>
        </div>
      </div>

      {/* Task 3 — starter prompts, either generic (blank Build Your Own, no category to scope
          them to) or scoped to the real picked project type (a curated, seeded conversation),
          shown only before the very first message so they don't clutter an already-ongoing
          conversation. Blank Build Your Own's own scripted opener is `null`, so its own presets
          show alongside an empty history exactly as before; a seeded conversation's scripted
          greeting already occupies history slot 0 by the time this ever renders, so its presets
          are shown alongside that ONE real message, not a genuinely empty list. */}
      {(seedContext ? chatHistory.length <= 1 : chatHistory.length === 0) && (
        <div className="creative-preset-list">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="creative-preset-btn"
              onClick={() => sendMessage(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      )}

      <ChatConversation
        messages={chatHistory}
        loading={loading}
        onSend={sendMessage}
        onEditMessage={editMessage}
        emptyHint={chatHistory.length === 0 ? 'Or ask your own question below to get started.' : undefined}
        placeholder="Describe your own idea, or ask a question…"
        footer={latestReadyPlan && latestReadyPlan.sourceIndex !== dismissedReadyIndex && (
          <div className="chat-task-confirm">
            <p>
              <strong>{latestReadyPlan.projectName}</strong> — {latestReadyPlan.milestones.length} milestones
              developed so far. Keep talking to refine it, or start it whenever you're ready.
            </p>
            <div className="task-form-actions">
              <button type="button" className="btn btn-primary" onClick={() => onChoosePlan(latestReadyPlan)}>
                <Rocket size={14} /> Start This Project
              </button>
              {/* Add Explicit "Not Satisfied, Keep Refining" Option (see CLAUDE.md) — a real,
                  visible second action, not something the student has to guess they can do by
                  just typing more. Only ever hides THIS footer (see dismissedReadyIndex's own
                  comment above) — nothing in chatHistory/planReady/milestones is touched, so
                  nothing is lost; the conversation (and its input box, already always visible)
                  is immediately ready for more discussion. */}
              <button type="button" className="btn btn-ghost" onClick={() => setDismissedReadyIndex(latestReadyPlan.sourceIndex)}>
                Not quite right — keep refining
              </button>
            </div>
          </div>
        )}
      />
    </>
  );
}
