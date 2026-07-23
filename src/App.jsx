import { Compass, Volume2, VolumeX } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import WelcomeScreen from './screens/WelcomeScreen';
import SignUpScreen from './screens/SignUpScreen';
import HubScreen from './screens/HubScreen';
import SurveyScreen from './screens/SurveyScreen';
import DiscoveryScreen from './screens/DiscoveryScreen';
import TranscriptScreen from './screens/TranscriptScreen';
import CourseSelectionScreen from './screens/CourseSelectionScreen';
import ProgramSummaryScreen from './screens/ProgramSummaryScreen';
import OpportunityFinderScreen from './screens/OpportunityFinderScreen';
import ProjectBuilderScreen from './screens/ProjectBuilderScreen';
import AcademicPlanScreen from './screens/AcademicPlanScreen';
import ProfileScreen from './screens/ProfileScreen';

const SCREENS = {
  welcome: WelcomeScreen,
  signup: SignUpScreen,
  hub: HubScreen,
  survey: SurveyScreen,
  discovery: DiscoveryScreen,
  transcript: TranscriptScreen,
  courseSelection: CourseSelectionScreen,
  // Sits right before Opportunities for every education level — after Course Selection for High
  // School, right after Discovery for Undergraduate/Transfer (who skip Course Selection
  // entirely). See ProgramSummaryScreen.jsx's own header comment.
  programSummary: ProgramSummaryScreen,
  opportunities: OpportunityFinderScreen,
  projectBuilder: ProjectBuilderScreen,
  plan: AcademicPlanScreen,
  // Prior Experience Collection + New Profile Page (see CLAUDE.md) — a new, standalone hub tile
  // destination, not part of the 8-step survey-through-plan sequence (same reason `hub` itself
  // isn't tracked by StepProgress either).
  profile: ProfileScreen,
};

// Screens that get the shared fade+slide page transition (Task 2 of the animation/polish pass).
// Welcome is excluded since it has its own bespoke entrance sequence. `plan` isn't listed here
// directly — Map 2 (the full per-year roadmap) is still excluded, same as the whole Academic
// Plan screen originally was, but Map 1 (the Year Overview) now opts back in via the
// `needsTransition` check below, since it's a normal lightweight screen, not the full-bleed one.
const TRANSITION_SCREENS = new Set([
  'signup', 'hub', 'survey', 'discovery', 'transcript', 'courseSelection', 'programSummary', 'opportunities', 'projectBuilder', 'profile',
]);

function AppShell() {
  const { state, patch } = useApp();
  const screenKey = SCREENS[state.screen] ? state.screen : 'hub';
  const Screen = SCREENS[screenKey];
  // The Plan screen now has two sub-views (see AcademicPlanScreen.jsx): Map 1 (the Year
  // Overview, `planYearIndex === null`) is a normal, lightweight screen; Map 2 (the full
  // per-year task roadmap) is the full-bleed/full-viewport one (see .app-shell-plan in
  // global.css). Only Map 2 gets the full-bleed treatment — Map 1 gets the same centered/
  // padded/scrolling shell (and .polish button/card treatment) every other screen gets.
  const isPlanDetail = screenKey === 'plan' && state.planYearIndex !== null;
  const needsTransition = TRANSITION_SCREENS.has(screenKey) || (screenKey === 'plan' && !isPlanDetail);
  // Hub redesign (see CLAUDE.md) — the hub gets its own full-bleed shell + color palette, scoped
  // via `.app-shell-hub` the same way `.app-shell-plan` already gets its own full-bleed treatment
  // for Map 2. Deliberately excluded from `.polish` (like `.app-shell-plan` already is) since the
  // hub's own tile/card hover-press treatment is redesigned from scratch below, not the shared
  // one every other `.card`-based screen uses — applying both would double up or fight each other.
  const isHub = screenKey === 'hub';
  // Palette repaint (see CLAUDE.md) — Welcome and Sign-Up were the first batch moved onto the
  // "bloom" palette (the colorful set first established for the hub redesign); Survey and
  // Discovery (Careers of Interest / Related College Majors / Recommended Programs — all one
  // `discovery` screenKey) were the second; Transcript & GPA and Course Selection were the third;
  // Opportunity Finder and Project Builder were the fourth; the Academic Plan's Map 1 (Year
  // Overview) is the fifth; Program Summary (Your School List) was the sixth, closing out that
  // rollout — every screen that existed at the time was on the "bloom" palette. The new Profile
  // screen (Prior Experience Collection + New Profile Page) was simply built directly on it from
  // day one, since there's no separate "unpainted" state to migrate later for a brand-new screen.
  // `.app-shell-bloom`
  // scopes the shared-chrome color overrides (`.btn-primary`, `.card`, `.tag`, `.pill`,
  // `.rms-badge`, etc. — global.css), same scoping precedent `.app-shell-hub`/`.app-shell-plan`
  // already established. Added ALONGSIDE `.polish` (not instead of it, unlike the hub) — none of
  // these screens built their own custom button/card interaction system the way the hub did, so
  // they still want the shared press/hover feedback (and the staggered card-reveal entrance, and
  // the selection-pulse+checkmark) `.polish` already provides everywhere else. Map 1 only, NOT Map
  // 2 — Map 2 (the full per-year roadmap, Roadmap.jsx) is the separate `.app-shell-plan` full-bleed
  // system and was recolored directly in its own exclusive classes instead (see CLAUDE.md's own
  // Academic Plan repaint section for why `.app-shell-bloom` scoping doesn't apply there at all).
  const isMap1 = screenKey === 'plan' && state.planYearIndex === null;
  const isBloomScreen = screenKey === 'welcome' || screenKey === 'signup'
    || screenKey === 'survey' || screenKey === 'discovery'
    || screenKey === 'transcript' || screenKey === 'courseSelection'
    || screenKey === 'opportunities' || screenKey === 'projectBuilder'
    || screenKey === 'programSummary' || screenKey === 'profile' || isMap1;

  return (
    <div className={`app-shell${isPlanDetail ? ' app-shell-plan' : isHub ? ' app-shell-hub' : ' polish'}${isBloomScreen ? ' app-shell-bloom' : ''}`}>
      {/* Radial-layout pass (see CLAUDE.md) — the hub renders its own dedicated top bar (logo,
          search, notifications, avatar, PLUS the same real mute control this generic header
          carries) instead of this one, so the two don't stack. Every other screen is unaffected. */}
      {!isHub && state.screen !== 'welcome' && (
        <div className="app-header">
          <div className="brand">
            <Compass />
            MyPath — prototype
          </div>
          {/* ElevenLabs Voice integration (see CLAUDE.md) — the mute toggle now always renders,
              unconditionally: it used to be gated on `isSpeechAvailable()` (a real client-side
              feature-detection question for the old browser SpeechSynthesis API), but a remote TTS
              API has no such static "is this supported on this device" question to ask — it either
              succeeds or fails per request, handled entirely by speech.js's own graceful fallback,
              never by hiding the control itself. The separate "Choose mascot voice" gear/settings
              panel is gone entirely along with it — this app now speaks in exactly one fixed voice,
              so there's nothing left to choose between. */}
          <div className="header-actions">
            <button
              type="button"
              className="header-icon-btn voice-mute-toggle"
              onClick={() => patch({ voiceMuted: !state.voiceMuted })}
              aria-label={state.voiceMuted ? 'Unmute mascot voiceover' : 'Mute mascot voiceover'}
              aria-pressed={state.voiceMuted}
              title={state.voiceMuted ? 'Unmute mascot voiceover' : 'Mute mascot voiceover'}
            >
              {state.voiceMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>
      )}
      {needsTransition ? (
        <div className="screen-transition" key={`${screenKey}:${isPlanDetail ? 'detail' : 'overview'}`}>
          <Screen />
        </div>
      ) : (
        <Screen />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
