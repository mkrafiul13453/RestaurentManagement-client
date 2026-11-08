import { EmptyState } from "@/components/ui/feedback";
import { WorkspaceHome } from "@/components/workspace/workspace-home";

export default function AdminWorkspacePage() {
  return (
    <>
      <EmptyState
        className="mb-7"
        description="Operational summaries will appear here after their server-backed features are implemented."
        title="No operational dashboard data yet"
      />
      <WorkspaceHome role="admin" title="Admin overview" />
    </>
  );
}
