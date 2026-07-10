import { Compass } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import WelcomeScreen from './screens/WelcomeScreen';
import SurveyScreen from './screens/SurveyScreen';
import AdmissionsOverviewScreen from './screens/AdmissionsOverviewScreen';
import DiscoveryScreen from './screens/DiscoveryScreen';
import OpportunityFinderScreen from './screens/OpportunityFinderScreen';
import ProjectBuilderScreen from './screens/ProjectBuilderScreen';
import AcademicPlanScreen from './screens/AcademicPlanScreen';

const SCREENS = {
  welcome: WelcomeScreen,
  survey: SurveyScreen,
  admissions: AdmissionsOverviewScreen,
  discovery: DiscoveryScreen,
  opportunities: OpportunityFinderScreen,
  projectBuilder: ProjectBuilderScreen,
  plan: AcademicPlanScreen,
};

// Screens that get the shared fade+slide page transition (Task 2 of the animation/polish pass).
// Welcome is excluded since it has its own bespoke entrance sequence; Plan is excluded because
// the whole Academic Plan screen is out of scope for that pass (see CLAUDE.md).
const TRANSITION_SCREENS = new Set(['survey', 'admissions', 'discovery', 'opportunities', 'projectBuilder']);

function AppShell() {
  const { state } = useApp();
  const screenKey = SCREENS[state.screen] ? state.screen : 'survey';
  const Screen = SCREENS[screenKey];
  const isPlan = screenKey === 'plan';

  // The Plan screen is full-bleed/full-viewport (see .app-shell-plan in global.css) — every
  // other screen keeps the normal centered/padded/scrolling .app-shell untouched.
  return (
    <div className={`app-shell${isPlan ? ' app-shell-plan' : ' polish'}`}>
      {state.screen !== 'welcome' && (
        <div className="brand">
          <Compass />
          MyPath — prototype
        </div>
      )}
      {TRANSITION_SCREENS.has(screenKey) ? (
        <div className="screen-transition" key={screenKey}>
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
