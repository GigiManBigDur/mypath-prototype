import { useEffect, useState } from 'react';
import { Compass, Volume2, VolumeX, Settings2 } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { isSpeechAvailable, primeVoices } from './utils/speech';
import VoiceSettingsPanel from './components/VoiceSettingsPanel';
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
};

// Screens that get the shared fade+slide page transition (Task 2 of the animation/polish pass).
// Welcome is excluded since it has its own bespoke entrance sequence. `plan` isn't listed here
// directly — Map 2 (the full per-year roadmap) is still excluded, same as the whole Academic
// Plan screen originally was, but Map 1 (the Year Overview) now opts back in via the
// `needsTransition` check below, since it's a normal lightweight screen, not the full-bleed one.
const TRANSITION_SCREENS = new Set([
  'signup', 'hub', 'survey', 'discovery', 'transcript', 'courseSelection', 'programSummary', 'opportunities', 'projectBuilder',
]);

function AppShell() {
  const { state, patch } = useApp();
  // "Show Available Voice Options" feature (see CLAUDE.md) — local, unpersisted UI state (the
  // panel itself is always closed on a fresh load, matching every other transient overlay in
  // this app; the STUDENT'S ACTUAL PICK, state.voiceURI, is what's persisted, not whether this
  // panel happens to be open).
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
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

  // Dashboard/Guide feature, Stage 6 (see CLAUDE.md) — prime the browser's voice list once, as
  // early as possible in the app's lifetime, so it's very likely already populated by the time
  // the first real mascot line needs to speak (which requires navigating past Welcome/Sign Up
  // first) — see speech.js's own comment for why this matters on Chrome specifically.
  useEffect(() => {
    primeVoices();
  }, []);

  return (
    <div className={`app-shell${isPlanDetail ? ' app-shell-plan' : isHub ? ' app-shell-hub' : ' polish'}`}>
      {state.screen !== 'welcome' && (
        <div className="app-header">
          <div className="brand">
            <Compass />
            MyPath — prototype
          </div>
          {isSpeechAvailable() && (
            <div className="header-actions">
              <button
                type="button"
                className="header-icon-btn voice-settings-toggle"
                onClick={() => setVoiceSettingsOpen(true)}
                aria-label="Choose mascot voice"
                title="Choose mascot voice"
              >
                <Settings2 size={16} />
              </button>
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
          )}
        </div>
      )}
      <VoiceSettingsPanel isOpen={voiceSettingsOpen} onClose={() => setVoiceSettingsOpen(false)} />
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
