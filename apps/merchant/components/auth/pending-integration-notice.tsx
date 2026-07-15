import { Alert } from "@repo/ui";

export function PendingIntegrationNotice({ endpoint }: { endpoint: string }) {
  return (
    <Alert
      className="border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
      color="warning"
    >
      Backend integration pending for {endpoint}.
    </Alert>
  );
}
