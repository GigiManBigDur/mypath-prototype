import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Rocket, HeartHandshake, Microscope, Cpu, BookOpen, Palette,
  Clock, ListOrdered, Wrench, CheckCircle2, Sparkles, Heart, Circle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PROJECT_CATEGORIES, findCategory, findProjectType } from '../data/projects';
import { generateRoadmap } from '../utils/roadmapGenerator';
import { parseDateInputValue, realDaysBetween, formatDate } from '../utils/dates';
import { makeTaskId } from '../utils/ids';
import StepProgress from '../components/StepProgress';
import MascotWidget from '../components/MascotWidget';
import { useMarkMascotSeen, useMascotSeenSnapshot, useMascotRevisitOnce } from '../hooks/useMascotSeen';
import { getMascotLine } from '../data/mascotDialogue';

const CATEGORY_ICONS = { Rocket, HeartHandshake, Microscope, Cpu, BookOpen, Palette };
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
// single hardcoded teal the way this screen did before this batch.
function getCategoryColor(categoryId) {
  const i = PROJECT_CATEGORIES.findIndex((c) => c.id === categoryId);
  return CATEGORY_COLORS[(i < 0 ? 0 : i) % CATEGORY_COLORS.length];
}

// How close (in days) a chosen project start date has to land to an existing roadmap commitment
// before we surface a heads-up. Soft only — never blocks confirming the start date.
const CONFLICT_WINDOW_DAYS = 3;

export default function ProjectBuilderScreen() {
  const { state, patch } = useApp();
  // Local, unpersisted browse state — refreshing mid-browse just lands back on the category
  // grid, which is an acceptable reset for a "browse and explore" screen (unlike survey answers
  // or selections elsewhere, nothing here is lost if you re-pick your path).
  const [view, setView] = useState('categories'); // 'categories' | 'category' | 'projectType'
  const [categoryId, setCategoryId] = useState(null);
  const [projectTypeId, setProjectTypeId] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [startDate, setStartDate] = useState('');

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

  const openCategory = (id) => { setCategoryId(id); setProjectTypeId(null); setView('category'); };
  const openProjectType = (id) => { setProjectTypeId(id); setShowStartPicker(false); setStartDate(''); setView('projectType'); };
  const goBack = () => {
    if (view === 'projectType') { setShowStartPicker(false); setView('category'); return; }
    if (view === 'category') { setCategoryId(null); setView('categories'); return; }
    patch({ screen: 'hub' });
  };

  const category = categoryId ? findCategory(categoryId) : null;
  const found = categoryId && projectTypeId ? findProjectType(categoryId, projectTypeId) : null;
  const projectType = found?.projectType || null;

  const startedProject = projectType
    ? (state.startedProjects || []).find((p) => p.projectTypeId === projectType.id)
    : null;

  const findNearbyConflict = (dateStr) => {
    if (!dateStr) return null;
    const chosen = parseDateInputValue(dateStr);
    return allNodes.find((n) => Math.abs(realDaysBetween(n.date, chosen)) <= CONFLICT_WINDOW_DAYS) || null;
  };
  const conflict = findNearbyConflict(startDate);

  // Starting a project creates just its first node — the project type's own first guide step,
  // dated to the chosen Start Date (Task 1/2 of the growing-chain spec) — not the whole guide
  // pre-populated. `guideStepsUsed: 1` reflects that this first slot is already spent; every
  // later step is revealed one at a time from Roadmap.jsx as the previous one is completed.
  const confirmStart = () => {
    if (!startDate || !category || !projectType) return;
    const newProject = {
      id: makeTaskId('project'),
      categoryId: category.id,
      projectTypeId: projectType.id,
      projectName: projectType.name,
      status: 'active',
      guideStepsUsed: 1,
      steps: [{ id: makeTaskId('project-step'), title: projectType.steps[0], date: startDate, desc: projectType.overview }],
    };
    patch({ startedProjects: [...(state.startedProjects || []), newProject] });
    setShowStartPicker(false);
    setStartDate('');
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

      {view === 'categories' && <CategoriesView onOpenCategory={openCategory} />}

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
    </div>
  );
}

function CategoriesView({ onOpenCategory }) {
  return (
    <>
      <h1 className="page-title">Build a Project</h1>
      <p className="page-sub">
        Ready to build something of your own? Browse real project ideas across six areas — pick
        one that sparks something, or skip straight to your plan. Nothing here is required.
      </p>

      <div className="pb-category-grid">
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
          <ol className="pb-timeline">
            {startedProject.steps.map((step, i) => {
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

          {startedProject.status !== 'completed' && (
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
