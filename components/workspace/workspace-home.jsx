import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { roleConfig } from "@/lib/roles";

export function WorkspaceHome({ role, title }) {
  const modules = roleConfig[role]?.modules ?? [];

  return (
    <>
      <PageHeader
        description={`Your ${role} workspace is ready. Open an available module or see what's planned for your role.`}
        eyebrow="Restora workspace"
        title={title}
      />
      <section aria-labelledby="workspace-modules-title">
        <h2
          className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-stone-500"
          id="workspace-modules-title"
        >
          Workspace modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const content = (
              <>
                <p className="font-semibold text-stone-900">{module.label}</p>
                <p className="mt-2 text-sm text-stone-600">
                  {module.href
                    ? "Open this available workspace."
                    : "Planned; this module is not available yet."}
                </p>
                {!module.href && (
                  <span className="mt-4 inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
                    Planned
                  </span>
                )}
              </>
            );

            return module.href ? (
              <Link
                className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
                href={module.href}
                key={module.label}
              >
                <Card className="h-full border-orange-100 p-5 transition-colors hover:border-orange-300 hover:bg-orange-50/50">
                  {content}
                </Card>
              </Link>
            ) : (
              <Card
                className="border-stone-200 p-5"
                key={module.label}
              >
                {content}
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
