import { lazy, Suspense, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { AuthScreen } from "./components/auth/AuthScreen";
import { ConsentScreen } from "./components/ConsentScreen";
import { AppCredit } from "./components/AppCredit";
import { ContributorHome } from "./components/ContributorHome";
import { Button, ConfirmationDialog, Eyebrow } from "./components/ui";
import { Icon } from "./components/Icon";
import { TopBar } from "./components/TopBar";
import { useAppController } from "./app/useAppController";
import { useVisualViewport } from "./lib/useVisualViewport";

// The installed role is fixed at launch, so route-level code is loaded only
// when that surface is actually opened. Field capture and admin tooling no
// longer compete on the first-sign-in bundle.
const Collector = lazy(() =>
  import("./components/Collector").then(({ Collector }) => ({
    default: Collector,
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
const DeviceLinkSheet = lazy(() =>
  import("./components/DeviceLinkSheet").then(({ DeviceLinkSheet }) => ({
    default: DeviceLinkSheet,
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
  useVisualViewport();
  const [deviceLinkOpen, setDeviceLinkOpen] = useState(false);
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
    hasDraft,
    confirmation,
    actions: {
      showToast,
      resolveConfirmation,
      navigate,
      selectProject,
      signOut,
      updateDraft,
      discardDraftAndStart,
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
        <AppCredit />
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

  // Consent is asked when there is fieldwork to consent to. Anyone may create
  // an account; an account with no assigned project has nothing to collect,
  // so it is not asked to accept a collection statement. The server still
  // refuses any submission without a granted consent.
  const hasAssignedProject =
    (state.projects?.length ?? 0) > 0 || state.project.id !== "empty-project";

  if (
    session &&
    consentState === "required" &&
    consentVersion &&
    hasAssignedProject
  ) {
    return (
      <ConsentScreen
        text={consentVersion.text}
        version={consentVersion.version}
        onAccept={() =>
          recordConsent().catch(() =>
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
      <main className="page page-admin" data-surface="admin">
        <div className="page-heading page-heading-home">
          <h1>
            {adminAccess === "checking"
              ? "Checking access…"
              : "Admin access is unavailable"}
          </h1>
          {adminAccess === "unavailable" && (
            <p className="page-lede">
              Reconnect and reopen collect Admin. Your local data remains
              unchanged.
            </p>
          )}
        </div>
        {adminAccess === "unavailable" && (
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Try again
          </Button>
        )}
        <AppCredit />
      </main>
    );
  }

  if (surface === "admin" && configured && adminAccess === "denied") {
    return (
      <main className="page page-admin" data-surface="admin">
        <div className="page-heading page-heading-home">
          <h1>Administrator access required</h1>
          <p className="page-lede">
            This account is not an administrator. Sign in with an invited
            administrator account.
          </p>
        </div>
        <Button variant="primary" onClick={() => void signOut()}>
          Sign out
        </Button>
        <AppCredit />
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
        organizationName={
          state.project?.organization || state.projects?.[0]?.organization
        }
        isPreview={!configured}
        observations={state.observations}
        lastSyncAt={state.lastSyncAt}
        onLinkDevice={
          session && configured ? () => setDeviceLinkOpen(true) : undefined
        }
        onRecoveryExport={exportRecoveryPackage}
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
              onOpenSync={openSyncSheetAndSync}
              onChooseProject={(project) => selectProject(project, "home")}
              onResumeObservation={() => navigate("collector")}
              onDiscardAndStartObservation={discardDraftAndStart}
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
                  : () => navigate("home")
              }
              isSaving={isSaving}
              preview={collectorPreview}
            />
          )}

          {state.mode === "admin" && state.view === "admin" && (
            <AdminDashboard
              project={state.project}
              projects={state.projects}
              onNavigate={navigate}
              onSelectProject={(project) =>
                selectProject(project, "admin-project")
              }
              onToast={showToast}
            />
          )}

          {state.mode === "admin" && state.view === "admin-project" && (
            <AdminProject
              project={state.project}
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
        {deviceLinkOpen && (
          <DeviceLinkSheet onClose={() => setDeviceLinkOpen(false)} />
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
      <Analytics />
    </div>
  );
}
