import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeTaskId } from '../utils/ids';
import PriorExperiencesEditor from '../components/PriorExperiencesEditor';
import MascotWidget from '../components/MascotWidget';
import { useMascotIntroThenRevisit } from '../hooks/useMascotSeen';

// Prior Experience Collection + New Profile Page (see CLAUDE.md), Task 3 — a new hub tile/screen,
// deliberately small in scope right now: it only shows and manages `state.priorExperiences`, the
// same array Opportunity Finder's own one-time entry prompt already writes to. Framed explicitly
// as "the start of a broader profile area" (this screen's own copy) rather than a finished
// feature — later profile content is expected to land here too, but nothing about that is built
// yet. No `StepProgress` — like the hub itself, this is a standalone utility screen reachable
// anytime, not one of the 8 tracked survey-through-plan steps.
export default function ProfileScreen() {
  const { state, patch } = useApp();
  const experiences = state.priorExperiences || [];

  const addExperience = (exp) => {
    patch({ priorExperiences: [...experiences, { id: makeTaskId('prior-experience'), ...exp }] });
  };
  const editExperience = (id, updated) => {
    patch({ priorExperiences: experiences.map((e) => (e.id === id ? { ...e, ...updated } : e)) });
  };
  const removeExperience = (id) => {
    patch({ priorExperiences: experiences.filter((e) => e.id !== id) });
  };

  const mascotText = useMascotIntroThenRevisit('profile-intro', 'profile-revisit');

  return (
    <div>
      <MascotWidget text={mascotText} />
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'hub' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="page-title">Your Profile</h1>
      <p className="page-sub">
        The start of your broader profile — more will live here over time. For now, this is where
        your past experiences and activities live. MyPath's AI features (Stage 2 suggestions, the
        chat assistant, Build Your Own) use these for richer context; your Careers of Interest,
        Related Majors, and Recommended Programs are unaffected by anything here.
      </p>

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
      />

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'hub' })}>
          Done
        </button>
      </div>
    </div>
  );
}
