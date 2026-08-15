-- Organizations are created only by the bootstrap_organization RPC (service
-- role). The organizations_insert_self policy let any authenticated account
-- insert orphan organization rows directly; because domain matching in
-- bootstrap_organization treats an existing organizations.domain as a trust
-- anchor, stray rows are not harmless litter. No client path inserts into
-- organizations (verified: workspaces are bootstrapped through the RPC), so
-- the policy is removed rather than narrowed.

drop policy if exists organizations_insert_self on public.organizations;
