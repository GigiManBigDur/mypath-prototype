import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useOnboardingChat } from './useOnboardingChat';
import { getMascotLine } from '../data/mascotDialogue';

// Reactive Conversation Layer for Tutorial Modules (see CLAUDE.md) — the one shared mechanism all
// six applicable modules (Careers of Interest, Related College Majors, Recommended Programs,
// Course Selection, Opportunity Finder, Project Builder) use, so this is genuinely ONE
// implementation instantiated six times with per-module content, not six independent copies.
//
// `moduleId` is a real, short id ('careers' | 'majors' | 'programs' | 'courseSelection' |
// 'opportunities' | 'projectBuilder') matching api/onboarding-chat.js's own MODULE_LABELS keys.
// `introKey` is the EXISTING mascotDialogue.js key already written for that module's own tutorial
// line (Task 5) — reused verbatim as the reactive conversation's own opening message, not
// discarded or replaced. `onConfirm` is the module's own REAL, already-existing "advance" action
// (in every one of the six real cases, `() => patch({ screen: 'hub' })`) — this hook never
// invents a new navigation target, it only decides WHEN that real action finally runs.
//
// Task 1 — `beginReview()` is the ONLY way this ever activates; nothing here fires on a plain
// selection click. `state.activeModuleReview` (AppContext.jsx) is the one flat, app-wide flag —
// safe as a single value rather than a per-module map, since a student is only ever on one module
// screen at a time. `isActive` is simply "does the current flag equal MY OWN moduleId," so only
// the screen that actually triggered a review ever reacts to it.
//
// Task 2/3 — `phase` ('idle' | 'reviewing' | 'chat') drives the reviewing-animation beat before
// the real conversation appears: the moment `isActive` becomes true, `phase` becomes 'reviewing'
// for REVIEW_DURATION_MS, then 'chat' — the exact same "local phase + setTimeout" shape
// OnboardingConversationScreen.jsx's own choreographed entrance already established, just much
// shorter, since this is a small in-context beat, not a whole-screen "first meeting."
const REVIEW_DURATION_MS = 1400;

export function useModuleReview(moduleId, introKey, onConfirm) {
  const { state, patch } = useApp();
  const { chatHistory, loading, sendMessage, editMessage, triggerModuleReaction } = useOnboardingChat();
  const isActive = state.activeModuleReview === moduleId;
  const [phase, setPhase] = useState('idle');
  // A plain ref, not just the `phase === 'chat'` check alone — guards against React 18
  // StrictMode's dev-only mount/remount replay double-invoking the effect below and firing two
  // real requests for the same activation, the same "set a ref synchronously before the async
  // request starts" discipline this app's own finalReview/transcript-resume triggers already
  // establish.
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      firedRef.current = false;
      return undefined;
    }
    setPhase('reviewing');
    const t = setTimeout(() => setPhase('chat'), REVIEW_DURATION_MS);
    return () => clearTimeout(t);
  }, [isActive]);

  // Task 4/5 — once the reviewing beat finishes, append the module's own EXISTING scripted line
  // (verbatim, Task 5) as the opening message — but only the FIRST time this specific module's
  // reactive conversation has ever activated, tracked by checking for a real, persisted marker on
  // the message itself (`moduleReviewOpening: moduleId`) rather than the app's own separate
  // mascotSeenKeys mechanism (which likely already marked this exact intro key "seen" the moment
  // the student first landed on this screen, well before they ever made a selection — reusing that
  // signal here would mean the opening line could never actually appear in the reactive
  // conversation at all). A later re-trigger (after "keep refining," Task 6) skips straight to a
  // fresh AI reaction with no repeated opening line, avoiding the same scripted text cluttering
  // the persisted transcript on every reconsideration.
  useEffect(() => {
    if (phase !== 'chat' || firedRef.current) return;
    firedRef.current = true;
    const alreadyOpened = chatHistory.some((m) => m.moduleReviewOpening === moduleId);
    const openingLine = getMascotLine(introKey);
    const baseHistory = (alreadyOpened || !openingLine)
      ? chatHistory
      : [...chatHistory, { role: 'assistant', content: openingLine, moduleReviewOpening: moduleId }];
    // Explicitly patched here (not left for triggerModuleReaction's own eventual result) so the
    // opening line renders immediately, with the AI's real reaction following visibly afterward
    // (a real "thinking" beat in between) — rather than both appearing at once only once the
    // network round trip finishes.
    if (baseHistory !== chatHistory) patch({ onboardingChatHistory: baseHistory });
    // Passed explicitly rather than relying on this hook's own `chatHistory` closure, which
    // wouldn't reflect the just-appended opening line until the next render — the same
    // "effectiveState, not a stale closure" precedent this app's own Stage 2 suggestion trigger
    // already established.
    triggerModuleReaction(moduleId, baseHistory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Task 1's own trigger — called by the module's own real Continue/Confirm button instead of
  // that button navigating directly.
  const beginReview = () => patch({ activeModuleReview: moduleId });

  // Task 6 — the only two ways this ever resolves, both an explicit student action, never the AI
  // unilaterally deciding. Confirm clears the flag AND runs the module's own real, already-existing
  // advance action (unchanged from what that button always did before this feature). "Keep
  // refining" only clears the flag — the module's own selection UI was never navigated away from
  // in the first place (see ModuleReviewWidget.jsx), so the student is simply looking at it again,
  // free to change their choice and trigger a fresh review whenever they're ready.
  //
  // Bug fix (see CLAUDE.md, "Course Selection stuck locked" follow-up) — Confirm is also where
  // `state.moduleReviewsConfirmed[moduleId]` gets set, for every module uniformly (not just the
  // two that currently read it — see AppContext.jsx's own comment on that field). This is the one
  // real, unambiguous "this module is genuinely done" moment: reaching Confirm always requires
  // having clicked that module's own real Continue button first, regardless of whether anything
  // was actually selected there.
  const confirm = () => {
    patch({
      activeModuleReview: null,
      moduleReviewsConfirmed: { ...state.moduleReviewsConfirmed, [moduleId]: true },
    });
    onConfirm();
  };
  const keepRefining = () => patch({ activeModuleReview: null });

  return { isActive, phase, chatHistory, loading, sendMessage, editMessage, beginReview, confirm, keepRefining };
}
