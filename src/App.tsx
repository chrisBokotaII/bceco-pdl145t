import React, { useCallback, useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { AgentProjectsView } from './components/agent/AgentProjectsView';
import { AgentReportsHistoryView } from './components/agent/AgentReportsHistoryView';
import { AgentRoadmapView } from './components/agent/AgentRoadmapView';
import { AgentSyncView } from './components/agent/AgentSyncView';
import { FieldReportForm } from './components/agent/FieldReportForm';
import { LoginScreen } from './components/auth/LoginScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MotionPage } from './components/common/MotionPage';
import { ToastContainer } from './components/common/ToastContainer';
import { AgentsManagementView } from './components/coordinator/AgentsManagementView';
import { AssignmentsView } from './components/coordinator/AssignmentsView';
import { AuditLogsView } from './components/coordinator/AuditLogsView';
import { CoordinatorDashboard } from './components/coordinator/CoordinatorDashboard';
import { ProjectRegisterView } from './components/coordinator/ProjectRegisterView';
import { ReportingEngineView } from './components/coordinator/ReportingEngineView';
import { SubmissionsReviewView } from './components/coordinator/SubmissionsReviewView';
import { AgentLayout, type AgentTab } from './components/layout/AgentLayout';
import { CoordinatorLayout, type CoordinatorSection } from './components/layout/CoordinatorLayout';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { APP_TITLE, INSTITUTION_REF } from './domain/constants';
import {
  persistNavState,
  readNavState,
  useScrollRestoration,
} from './hooks/useScrollRestoration';
import type { FieldReport, Project } from './types/domain';

const COORD_SECTIONS = [
  'dashboard',
  'register',
  'assignments',
  'agents',
  'reviews',
  'reporting',
  'audit',
] as const satisfies readonly CoordinatorSection[];

const AGENT_TABS = [
  'projects',
  'form',
  'roadmap',
  'history',
  'sync',
] as const satisfies readonly AgentTab[];

const NAV_COORD_KEY = 'bceco_pdl145t_nav_coord_v1';
const NAV_AGENT_KEY = 'bceco_pdl145t_nav_agent_v1';

const AppWorkspace: React.FC = () => {
  const { currentUser, authLoading } = useApp();

  // Coordinator Navigation & Cross-Screen Deep-Link State
  const [coordinatorSection, setCoordinatorSectionState] = useState<CoordinatorSection>(() =>
    readNavState(NAV_COORD_KEY, COORD_SECTIONS, 'dashboard')
  );
  const [registerTargetProjectId, setRegisterTargetProjectId] = useState<string | null>(null);
  const [assignTargetProjectId, setAssignTargetProjectId] = useState<string | null>(null);

  // Agent Navigation & Active Editing State
  const [agentTab, setAgentTabState] = useState<AgentTab>(() =>
    readNavState(NAV_AGENT_KEY, AGENT_TABS, 'projects')
  );
  const [activeProjectForForm, setActiveProjectForForm] = useState<Project | null>(null);
  const [activeReportForForm, setActiveReportForForm] = useState<FieldReport | null>(null);

  const setCoordinatorSection = useCallback((section: CoordinatorSection) => {
    setCoordinatorSectionState(section);
    persistNavState(NAV_COORD_KEY, section);
  }, []);

  const setAgentTab = useCallback((tab: AgentTab) => {
    setAgentTabState(tab);
    persistNavState(NAV_AGENT_KEY, tab);
  }, []);

  const scrollScope = currentUser
    ? currentUser.role === 'COORDINATEUR'
      ? `coord:${coordinatorSection}`
      : `agent:${agentTab}`
    : '';

  useScrollRestoration(scrollScope, Boolean(currentUser) && !authLoading);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'COORDINATEUR') {
      persistNavState(NAV_COORD_KEY, coordinatorSection);
    } else {
      persistNavState(NAV_AGENT_KEY, agentTab);
    }
  }, [currentUser, coordinatorSection, agentTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-app-page flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-11 h-11 rounded-lg bg-app-sidebar text-white flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-app-primary">{APP_TITLE}</p>
          <p className="text-xs text-app-secondary">
            {INSTITUTION_REF} — Chargement de la session sécurisée…
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  // Strict Two-Role Routing: COORDINATEUR vs AGENT_TERRAIN
  if (currentUser.role === 'COORDINATEUR') {
    const handleInspectProject = (projectId: string) => {
      setRegisterTargetProjectId(projectId);
      setCoordinatorSection('register');
    };

    const handleAssignProject = (projectId: string) => {
      setAssignTargetProjectId(projectId);
      setCoordinatorSection('assignments');
    };

    return (
      <CoordinatorLayout
        activeSection={coordinatorSection}
        onSelectSection={setCoordinatorSection}
      >
        <MotionPage motionKey={coordinatorSection}>
          {coordinatorSection === 'dashboard' && (
            <CoordinatorDashboard
              onNavigate={setCoordinatorSection}
              onInspectProject={handleInspectProject}
            />
          )}
          {coordinatorSection === 'register' && (
            <ProjectRegisterView
              initialSelectedProjectId={registerTargetProjectId}
              onClearInitialProject={() => setRegisterTargetProjectId(null)}
              onAssignProject={handleAssignProject}
            />
          )}
          {coordinatorSection === 'assignments' && (
            <AssignmentsView
              preselectedProjectId={assignTargetProjectId}
              onConsumePreselectedProject={() => setAssignTargetProjectId(null)}
            />
          )}
          {coordinatorSection === 'agents' && <AgentsManagementView />}
          {coordinatorSection === 'reviews' && <SubmissionsReviewView />}
          {coordinatorSection === 'reporting' && <ReportingEngineView />}
          {coordinatorSection === 'audit' && <AuditLogsView />}
        </MotionPage>
      </CoordinatorLayout>
    );
  }

  // AGENT_TERRAIN Workspace (Mobile-first + Offline PWA)
  const handleStartNewReport = (project: Project) => {
    setActiveReportForForm(null);
    setActiveProjectForForm(project);
    setAgentTab('form');
  };

  const handleEditReport = (report: FieldReport) => {
    setActiveProjectForForm(null);
    setActiveReportForForm(report);
    setAgentTab('form');
  };

  const handleSelectAgentTab = (tab: AgentTab) => {
    if (tab !== 'form') {
      setActiveReportForForm(null);
      setActiveProjectForForm(null);
    }
    setAgentTab(tab);
  };

  const formKey = activeReportForForm
    ? `rep-${activeReportForForm.id}-${activeReportForForm.updatedAt}`
    : activeProjectForForm
    ? `prj-${activeProjectForForm.id}`
    : 'new-blank';

  return (
    <AgentLayout activeTab={agentTab} onSelectTab={handleSelectAgentTab}>
      <MotionPage motionKey={agentTab}>
        {agentTab === 'projects' && (
          <AgentProjectsView
            onStartNewReport={handleStartNewReport}
            onEditReport={handleEditReport}
            onNavigateTab={handleSelectAgentTab}
          />
        )}
        {agentTab === 'form' && (
          <FieldReportForm
            key={formKey}
            initialProject={activeProjectForForm}
            initialReport={activeReportForForm}
            onFinished={(targetTab) => {
              setActiveProjectForForm(null);
              setActiveReportForForm(null);
              setAgentTab(targetTab);
            }}
          />
        )}
        {agentTab === 'roadmap' && <AgentRoadmapView />}
        {agentTab === 'history' && (
          <AgentReportsHistoryView onEditReport={handleEditReport} />
        )}
        {agentTab === 'sync' && <AgentSyncView onEditReport={handleEditReport} />}
      </MotionPage>
    </AgentLayout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <AppWorkspace />
          <ToastContainer />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
