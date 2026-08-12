import { AdminDashboard, AdminProject } from "./components/AdminDashboard";
import { AuthScreen } from "./components/AuthScreen";
import { Collector } from "./components/Collector";
import { ConsentScreen } from "./components/ConsentScreen";
import { ContributorHome } from "./components/ContributorHome";
import { ConfirmationDialog } from "./components/ui";
import { Icon } from "./components/Icon";
import { NewProjectWizard } from "./components/NewProjectWizard";
import { ProjectOverview } from "./components/ProjectOverview";
import { SyncSheet } from "./components/SyncSheet";
import { TopBar } from "./components/TopBar";
import { useAppController } from "./app/useAppController";

export default function App() {
  const {
    state,
    surface,
    configured,
    hydrated,
    authLoading,
    requiresAuthentication,
    session,
    syncSheetOpen,
    isSyncing,
    syncProgress,
    isSaving,
    storageError,
    toast,
    collectorPreview,
    consentState,
    consentVersion,
    requirePasswordSetup,
    selectedObservations,
    hasDraft,
    confirmation,
    actions: {
      showToast,
      resolveConfirmation,
      navigate,
      selectProject,
      signOut,
      updateDraft,
      submitObservation,
      openSyncSheetAndSync,
      closeSyncSheet,
      syncNow,
      exportRecoveryPackage,
      publishProject,
      exportCheckpoint,
      toggleProjectStatus,
      beginContributorPreview,
      completeContributorPreview,
      cancelContributorPreview,
      applySchemaPublished,
      unlockPreview,
      dismissStorageError,
      dismissToast,
      recordConsent,
      completePasswordSetup,
    },
  } = useAppController();

  if (!hydrated || authLoading || requiresAuthentication) {
    return (
      <AuthScreen
        role={surface}
        configured={configured}
        onPreview={!configured ? unlockPreview : undefined}
        requirePasswordSetup={requirePasswordSetup}
        onPasswordSet={() => void completePasswordSetup("")}
      />
    );
  }

  if (session && consentState === "required" && consentVersion) {
    return (
      <ConsentScreen
        text={consentVersion.text}
        version={consentVersion.version}
        onAccept={() => void recordConsent().catch(() => showToast("Consent could not be recorded yet"))}
        onDecline={() => void signOut()}
      />
    );
  }

  return (
    <div
      className="app-shell"
      data-mode={surface}
      data-surface={surface}
      data-view={state.view}
    >
      <TopBar
        mode={state.mode}
        view={state.view}
        onNavigate={navigate}
        userEmail={session?.user.email}
        isPreview={!configured}
        onSignOut={() => void signOut()}
      />

      <div className="main-shell">
        {state.mode === "contributor" && state.view === "home" && (
          <ContributorHome
            projects={
              state.projects?.length
                ? state.projects
                : state.project.id === "empty-project"
                  ? []
                  : [state.project]
            }
            activeProject={state.project}
            observations={state.observations}
            hasDraft={hasDraft}
            onStartObservation={(project) =>
              selectProject(project, "collector")
            }
            onOpenProject={(project) => selectProject(project, "project")}
            onChooseProject={(project) => selectProject(project, "home")}
            onResumeObservation={() => navigate("collector")}
          />
        )}

        {state.mode === "contributor" && state.view === "project" && (
          <ProjectOverview
            project={state.project}
            observations={selectedObservations}
            onNavigate={navigate}
            onOpenSync={openSyncSheetAndSync}
          />
        )}

        {state.mode === "contributor" && state.view === "collector" && (
          <Collector
            project={state.project}
            draft={state.draft}
            lastSavedAt={state.lastSavedAt}
            onDraftChange={updateDraft}
            onSubmit={
              collectorPreview ? completeContributorPreview : submitObservation
            }
            onBack={
              collectorPreview
                ? cancelContributorPreview
                : () => navigate("project")
            }
            isSaving={isSaving}
            preview={collectorPreview}
          />
        )}

        {state.mode === "admin" && state.view === "admin" && (
          <AdminDashboard
            project={state.project}
            projects={state.projects}
            observations={state.observations}
            onNavigate={navigate}
            onSelectProject={(project) =>
              selectProject(project, "admin-project")
            }
          />
        )}

        {state.mode === "admin" && state.view === "admin-project" && (
          <AdminProject
            project={state.project}
            observations={selectedObservations}
            onBack={() => navigate("admin")}
            onToast={showToast}
            onExport={() => void exportCheckpoint()}
            onSchemaPublished={applySchemaPublished}
            onToggleStatus={() => void toggleProjectStatus()}
            onPreviewContributor={beginContributorPreview}
          />
        )}

        {state.mode === "admin" && state.view === "new-project" && (
          <NewProjectWizard
            onBack={() => navigate("admin")}
            onPublish={publishProject}
          />
        )}
      </div>

      {syncSheetOpen && (
        <SyncSheet
          observations={state.observations}
          lastSyncAt={state.lastSyncAt}
          isSyncing={isSyncing}
          progress={syncProgress}
          onClose={closeSyncSheet}
          onSync={syncNow}
          onRecoveryExport={exportRecoveryPackage}
        />
      )}

      {confirmation && (
        <ConfirmationDialog
          {...confirmation}
          onConfirm={() => resolveConfirmation(true)}
          onCancel={() => resolveConfirmation(false)}
        />
      )}

      {storageError && (
        <div className="storage-alert" role="alert">
          <Icon name="info" size={16} />
          <span>{storageError}</span>
          <button
            onClick={dismissStorageError}
            aria-label="Dismiss local storage alert"
          >
            <Icon name="x" size={15} />
          </button>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={16} />
          <span>{toast}</span>
          <button onClick={dismissToast} aria-label="Dismiss message">
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
