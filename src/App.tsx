import { lazy, Suspense } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { ConsentScreen } from "./components/ConsentScreen";
import { ContributorHome } from "./components/ContributorHome";
import { Button, ConfirmationDialog, Eyebrow } from "./components/ui";
import { Icon } from "./components/Icon";
import { TopBar } from "./components/TopBar";
import { useAppController } from "./app/useAppController";

// The installed role is fixed at launch, so route-level code is loaded only
// when that surface is actually opened. Field capture and admin tooling no
// longer compete on the first-sign-in bundle.
const Collector = lazy(() =>
  import("./components/Collector").then(({ Collector }) => ({
    default: Collector,
  })),
);
const ProjectOverview = lazy(() =>
  import("./components/ProjectOverview").then(({ ProjectOverview }) => ({
    default: ProjectOverview,
  })),
);
const SyncSheet = lazy(() =>
  import("./components/SyncSheet").then(({ SyncSheet }) => ({
    default: SyncSheet,
  })),
);
const AdminDashboard = lazy(() =>
  import("./components/AdminDashboard").then(({ AdminDashboard }) => ({
    default: AdminDashboard,
  })),
);
const AdminProject = lazy(() =>
  import("./components/AdminDashboard").then(({ AdminProject }) => ({
    default: AdminProject,
  })),
);
const NewProjectWizard = lazy(() =>
  import("./components/NewProjectWizard").then(({ NewProjectWizard }) => ({
    default: NewProjectWizard,
  })),
);

function SurfaceFallback() {
  return (
    <main className="page surface-fallback" aria-busy="true" aria-live="polite">
      <span className="button-spinner" aria-hidden="true" />
      <span>Opening…</span>
    </main>
  );
}

export default function App() {
  const {
    state,
    surface,
    configured,
    hydrated,
    authLoading,
    requiresAuthentication,
    session,
    adminAccess,
    syncSheetOpen,
    isSyncing,
    syncProgress,
    isSaving,
    storageError,
    dbError,
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

  // Recovery mode: the local database cannot be opened normally. Never boot
  // a blank state over it; the durable recovery export remains available.
  // This must precede the auth gate so an offline device with an unreadable
  // database can still export its unsynced records.
  if (dbError) {
    return (
      <main className="page page-contributor">
        <div className="page-heading page-heading-home">
          <Eyebrow>Local data needs attention</Eyebrow>
          <h1>Recovery mode</h1>
          <p className="page-lede">
            This device&rsquo;s local database could not be opened: {dbError}.
            Nothing has been deleted.
          </p>
        </div>
        <section className="collection-context">
          <div className="collection-context-copy">
            <Eyebrow>Recovery package</Eyebrow>
            <h2>Keep your unsynced records</h2>
            <p>
              Export everything still readable on this device as a ZIP, then
              hand it to your administrator.
            </p>
          </div>
          <Button
            variant="primary"
            icon="download"
            onClick={() => void exportRecoveryPackage()}
          >
            Export recovery package
          </Button>
        </section>
      </main>
    );
  }

  if (
    !hydrated ||
    authLoading ||
    requiresAuthentication ||
    requirePasswordSetup
  ) {
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
        onAccept={() =>
          void recordConsent().catch(() =>
            showToast("Consent could not be recorded yet"),
          )
        }
        onDecline={() => void signOut()}
      />
    );
  }

  if (
    surface === "admin" &&
    configured &&
    (adminAccess === "checking" || adminAccess === "unavailable")
  ) {
    return (
      <main className="page page-contributor">
        <div className="page-heading page-heading-home">
          <Eyebrow>Admin workspace</Eyebrow>
          <h1>
            {adminAccess === "checking"
              ? "Checking access…"
              : "Admin access is unavailable"}
          </h1>
          <p className="page-lede">
            {adminAccess === "checking"
              ? "This normally takes only a moment."
              : "Reconnect and reopen collect Admin. Your local data remains unchanged."}
          </p>
        </div>
        {adminAccess === "unavailable" && (
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Try again
          </Button>
        )}
      </main>
    );
  }

  if (surface === "admin" && configured && adminAccess === "denied") {
    return (
      <main className="page page-contributor">
        <div className="page-heading page-heading-home">
          <Eyebrow>Admin workspace</Eyebrow>
          <h1>Administrator access required</h1>
          <p className="page-lede">
            This account is not an administrator. Sign in with an invited
            administrator account.
          </p>
        </div>
        <Button variant="primary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </main>
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
        <Suspense fallback={<SurfaceFallback />}>
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
                collectorPreview
                  ? completeContributorPreview
                  : submitObservation
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
        </Suspense>
      </div>

      <Suspense fallback={null}>
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
      </Suspense>

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
