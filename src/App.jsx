import { Compass } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import SurveyScreen from './screens/SurveyScreen';
import AdmissionsOverviewScreen from './screens/AdmissionsOverviewScreen';
import DiscoveryScreen from './screens/DiscoveryScreen';
import OpportunityFinderScreen from './screens/OpportunityFinderScreen';
import AcademicPlanScreen from './screens/AcademicPlanScreen';

const SCREENS = {
  survey: SurveyScreen,
  admissions: AdmissionsOverviewScreen,
  discovery: DiscoveryScreen,
  opportunities: OpportunityFinderScreen,
  plan: AcademicPlanScreen,
};

function AppShell() {
  const { state } = useApp();
  const Screen = SCREENS[state.screen] || SurveyScreen;

  return (
    <div className="app-shell">
      <div className="brand">
        <Compass />
        MyPath — prototype
      </div>
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
