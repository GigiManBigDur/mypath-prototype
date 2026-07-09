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

function AppShell() {
  const { state } = useApp();
  const Screen = SCREENS[state.screen] || SurveyScreen;

  return (
    <div className="app-shell">
      {state.screen !== 'welcome' && (
        <div className="brand">
          <Compass />
          MyPath — prototype
        </div>
      )}
      <Screen />
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
