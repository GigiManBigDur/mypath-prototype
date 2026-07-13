import { Compass } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import WelcomeScreen from './screens/WelcomeScreen';
import SurveyScreen from './screens/SurveyScreen';
import AdmissionsOverviewScreen from './screens/AdmissionsOverviewScreen';
import DiscoveryScreen from './screens/DiscoveryScreen';
import TranscriptScreen from './screens/TranscriptScreen';
import CourseSelectionScreen from './screens/CourseSelectionScreen';
import ProgramSummaryScreen from './screens/ProgramSummaryScreen';
import OpportunityFinderScreen from './screens/OpportunityFinderScreen';
import ProjectBuilderScreen from './screens/ProjectBuilderScreen';
import AcademicPlanScreen from './screens/AcademicPlanScreen';

const SCREENS = {
  welcome: WelcomeScreen,
  survey: SurveyScreen,
  admissions: AdmissionsOverviewScreen,
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
  'survey', 'admissions', 'discovery', 'transcript', 'courseSelection', 'programSummary', 'opportunities', 'projectBuilder',
]);

function AppShell() {
  const { state } = useApp();
  const screenKey = SCREENS[state.screen] ? state.screen : 'survey';
  const Screen = SCREENS[screenKey];
  // The Plan screen now has two sub-views (see AcademicPlanScreen.jsx): Map 1 (the Year
  // Overview, `planYearIndex === null`) is a normal, lightweight screen; Map 2 (the full
  // per-year task roadmap) is the full-bleed/full-viewport one (see .app-shell-plan in
  // global.css). Only Map 2 gets the full-bleed treatment — Map 1 gets the same centered/
  // padded/scrolling shell (and .polish button/card treatment) every other screen gets.
  const isPlanDetail = screenKey === 'plan' && state.planYearIndex !== null;
  const needsTransition = TRANSITION_SCREENS.has(screenKey) || (screenKey === 'plan' && !isPlanDetail);

  return (
    <div className={`app-shell${isPlanDetail ? ' app-shell-plan' : ' polish'}`}>
      {state.screen !== 'welcome' && (
        <div className="brand">
          <Compass />
          MyPath — prototype
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
