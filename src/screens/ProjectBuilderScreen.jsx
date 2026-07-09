import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Rocket, HeartHandshake, Microscope, Cpu, BookOpen, Palette,
  Clock, ListOrdered, Wrench, CheckCircle2, Sparkles, Flag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PROJECT_CATEGORIES, findCategory, findProjectType } from '../data/projects';
import { generateRoadmap } from '../utils/roadmapGenerator';
import { parseDateInputValue, realDaysBetween, formatDate } from '../utils/dates';
import { makeTaskId } from '../utils/ids';
import AddTaskModal from '../components/AddTaskModal';

const CATEGORY_ICONS = { Rocket, HeartHandshake, Microscope, Cpu, BookOpen, Palette };
// Cycles through the app's existing accent tokens rather than introducing new colors — 6
// categories over 4 tokens means two repeats, which is fine since the icon (always distinct)
// carries the real identity, not the color.
const CATEGORY_COLORS = ['var(--gold)', 'var(--teal)', 'var(--rust)', 'var(--stone)', 'var(--teal)', 'var(--gold)'];

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
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const roadmap = useMemo(() => generateRoadmap(state), [state]);
  const allNodes = useMemo(() => {
    const list = [...roadmap.spine];
    roadmap.spine.forEach((n) => { if (n.hasBranch) list.push(...n.branchSteps); });
    return list;
  }, [roadmap]);

  const skip = () => patch({ screen: 'plan' });

  const openCategory = (id) => { setCategoryId(id); setProjectTypeId(null); setView('category'); };
  const openProjectType = (id) => { setProjectTypeId(id); setShowStartPicker(false); setStartDate(''); setView('projectType'); };
  const goBack = () => {
    if (view === 'projectType') { setShowStartPicker(false); setView('category'); return; }
    if (view === 'category') { setCategoryId(null); setView('categories'); return; }
    patch({ screen: 'opportunities' });
  };

  const category = categoryId ? findCategory(categoryId) : null;
  const found = categoryId && projectTypeId ? findProjectType(categoryId, projectTypeId) : null;
  const projectType = found?.projectType || null;

  const startedTask = projectType
    ? (state.customTasks || []).find((t) => t.projectMeta?.projectTypeId === projectType.id)
    : null;
  const milestones = startedTask
    ? (state.customTasks || []).filter((t) => t.parentProjectId === startedTask.id)
    : [];

  const findNearbyConflict = (dateStr) => {
    if (!dateStr) return null;
    const chosen = parseDateInputValue(dateStr);
    return allNodes.find((n) => Math.abs(realDaysBetween(n.date, chosen)) <= CONFLICT_WINDOW_DAYS) || null;
  };
  const conflict = findNearbyConflict(startDate);

  const confirmStart = () => {
    if (!startDate || !category || !projectType) return;
    const newTask = {
      id: makeTaskId('project'),
      title: projectType.name,
      date: startDate,
      desc: projectType.overview,
      projectMeta: { categoryId: category.id, projectTypeId: projectType.id },
    };
    patch({ customTasks: [...(state.customTasks || []), newTask] });
    setShowStartPicker(false);
    setStartDate('');
  };

  const addMilestone = (task) => {
    patch({
      customTasks: [...(state.customTasks || []), { id: makeTaskId('milestone'), parentProjectId: startedTask.id, ...task }],
    });
    setShowMilestoneForm(false);
  };

  return (
    <div>
      <div className="pb-topbar">
        <button type="button" className="btn btn-ghost" onClick={goBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <button type="button" className="btn btn-ghost pb-skip" onClick={skip}>
          Skip for now <ArrowRight size={14} />
        </button>
      </div>

      <div className="eyebrow">Step 5 of 6</div>

      {view === 'categories' && <CategoriesView onOpenCategory={openCategory} />}

      {view === 'category' && category && (
        <CategoryView
          category={category}
          onOpenProjectType={openProjectType}
          customTasks={state.customTasks || []}
        />
      )}

      {view === 'projectType' && category && projectType && (
        <ProjectTypeView
          category={category}
          projectType={projectType}
          startedTask={startedTask}
          milestones={milestones}
          showStartPicker={showStartPicker}
          startDate={startDate}
          conflict={conflict}
          onStartClick={() => setShowStartPicker(true)}
          onCancelStart={() => { setShowStartPicker(false); setStartDate(''); }}
          onChangeStartDate={setStartDate}
          onConfirmStart={confirmStart}
          onAddMilestone={() => setShowMilestoneForm(true)}
          onGoToPlan={() => patch({ screen: 'plan' })}
        />
      )}

      {showMilestoneForm && startedTask && (
        <AddTaskModal
          title={`Add a milestone for ${projectType.name}`}
          eyebrow="Milestone"
          eyebrowColor="var(--teal)"
          submitLabel="Add milestone"
          onCancel={() => setShowMilestoneForm(false)}
          onSubmit={addMilestone}
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
        {PROJECT_CATEGORIES.map((cat, i) => {
          const Icon = CATEGORY_ICONS[cat.icon];
          const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
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

function CategoryView({ category, onOpenProjectType, customTasks }) {
  const Icon = CATEGORY_ICONS[category.icon];
  return (
    <>
      <div className="pb-icon-badge pb-icon-badge-lg" style={{ '--pb-accent': 'var(--teal)' }}>
        <Icon size={30} />
      </div>
      <h1 className="page-title">{category.label}</h1>
      <p className="page-sub">{category.description}</p>

      <div className="pb-example-box">
        <div className="pb-example-eyebrow"><Sparkles size={13} /> Example project</div>
        <p className="pb-example-text">{category.example}</p>
        <p className="pb-example-caveat">Just an example to get you thinking — not a real submission from another student.</p>
      </div>

      <div className="field-label" style={{ marginTop: 28 }}>Pick a project type</div>
      <div className="pb-projecttype-grid">
        {category.projectTypes.map((pt) => {
          const started = customTasks.some((t) => t.projectMeta?.projectTypeId === pt.id);
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
  category, projectType, startedTask, milestones, showStartPicker, startDate, conflict,
  onStartClick, onCancelStart, onChangeStartDate, onConfirmStart, onAddMilestone, onGoToPlan,
}) {
  const Icon = CATEGORY_ICONS[category.icon];
  return (
    <>
      <div className="pb-category-chip">
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

      {!startedTask && !showStartPicker && (
        <button type="button" className="btn btn-primary pb-start-btn" onClick={onStartClick}>
          <Rocket size={16} /> Start This Project!
        </button>
      )}

      {!startedTask && showStartPicker && (
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

      {startedTask && (
        <div className="pb-started-banner">
          <div className="pb-started-headline">
            <CheckCircle2 size={18} /> Started — on your Academic Plan for {formatDate(parseDateInputValue(startedTask.date))}
          </div>

          <div className="pb-milestones">
            <div className="pb-milestones-title"><Flag size={14} /> Your milestones ({milestones.length})</div>
            {milestones.length > 0 && (
              <ul className="pb-milestone-list">
                {milestones.map((m) => (
                  <li key={m.id}>{m.title} <span className="pb-milestone-due">— {formatDate(parseDateInputValue(m.date))}</span></li>
                ))}
              </ul>
            )}
            <p className="field-hint" style={{ margin: '8px 0 0' }}>
              This project has no fixed end date — add milestones as you go to track real progress.
            </p>
          </div>

          <div className="task-form-actions" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
            <button type="button" className="btn btn-ghost" onClick={onAddMilestone}>+ Add a milestone</button>
            <button type="button" className="btn btn-primary" onClick={onGoToPlan}>Go to my Academic Plan</button>
          </div>
        </div>
      )}
    </>
  );
}
