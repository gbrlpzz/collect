import { AdminDashboard, AdminProject } from "./components/AdminDashboard";
import { AuthScreen } from "./components/AuthScreen";
import { Collector } from "./components/Collector";
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
    canAdmin,
    syncSheetOpen,
    isSyncing,
    syncProgress,
    isSaving,
    storageError,
    toast,
    collectorPreview,
    selectedObservations,
    hasDraft,
    confirmation,
    actions: {
      showToast,
      resolveConfirmation,
      navigate,
      selectProject,
      changeMode,
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
      finishFieldwork,
      makeProjectAvailableOffline,
      beginContributorPreview,
      completeContributorPreview,
      cancelContributorPreview,
      applySchemaPublished,
      unlockPreview,
      dismissStorageError,
      dismissToast,
    },
  } = useAppController();

  if (!hydrated || authLoading || requiresAuthentication) {
    return (
      <AuthScreen
        role={surface}
        configured={configured}
        onPreview={!configured ? unlockPreview : undefined}
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
        onModeChange={changeMode}
        onNavigate={navigate}
        canAdmin={canAdmin}
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
            observations={state.observations}
            hasDraft={hasDraft}
            offlineReady={state.offlineReady ?? {}}
            onNavigate={navigate}
            onSelectProject={(project) => selectProject(project)}
            onMakeAvailableOffline={makeProjectAvailableOffline}
          />
        )}

        {state.mode === "contributor" && state.view === "project" && (
          <ProjectOverview
            project={state.project}
            observations={selectedObservations}
            onNavigate={navigate}
            onOpenSync={openSyncSheetAndSync}
            onFinishFieldwork={() => void finishFieldwork()}
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

      {state.mode === "contributor" && state.view !== "collector" && (
        <nav className="mobile-tabbar" aria-label="Fieldwork navigation">
          <button
            className={state.view === "home" ? "mobile-tab-active" : ""}
            aria-current={state.view === "home" ? "page" : undefined}
            onClick={() => navigate("home")}
          >
            <Icon name="folder" size={19} filled={state.view === "home"} />
            <span>Projects</span>
          </button>
          <button
            className={state.view === "project" ? "mobile-tab-active" : ""}
            aria-current={state.view === "project" ? "page" : undefined}
            onClick={() => navigate("project")}
          >
            <Icon name="file" size={19} filled={state.view === "project"} />
            <span>Project</span>
          </button>
        </nav>
      )}

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
