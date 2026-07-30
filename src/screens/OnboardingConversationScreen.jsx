import { ArrowLeft, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

// AI-First Onboarding, Stage 1 (see CLAUDE.md) — a placeholder for Stage 2's real AI conversation
// page, inserted purely to confirm the new flow order is correct before that real page is built:
// Sign Up -> Survey (now reduced to grade/education level/school only) -> this placeholder ->
// Hub. Deliberately minimal — no StepProgress (matching Sign Up/Survey's own "pre-hub, not one of
// the 8 tracked steps" precedent), no real conversation logic, just working Back/Continue
// navigation so the reordered flow can be clicked through end to end. Stage 2 replaces this
// screen's body with the real conversational gathering (interests, passions, prior experience);
// the screen key (`onboardingConversation`) and its place in the flow are what this stage
// actually needed to get right.
export default function OnboardingConversationScreen() {
  const { patch } = useApp();

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'survey' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="page-title">Let's talk about you.</h1>
      <p className="page-sub">
        This is where MyPath will have a real conversation with you — about your interests,
        passions, and anything you've already done — instead of another form to fill out.
      </p>

      <div className="field-block">
        <div className="field-label">
          <Sparkles size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Coming soon
        </div>
        <p className="field-hint">
          The real conversation isn't built yet — this is a placeholder just to confirm the flow
          order (Sign Up → this step → Hub) is correct before it is.
        </p>
      </div>

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'hub' })}>
          Continue
        </button>
      </div>
    </div>
  );
}
