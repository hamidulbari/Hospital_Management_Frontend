import { EmptyState } from "./empty-state";

export function NoAccess() {
  return (
    <EmptyState
      title="No access"
      description="You do not have permission to open this page. Ask an administrator if you need it."
    />
  );
}