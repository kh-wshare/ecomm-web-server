export function PendingIntegrationNotice({ endpoint }: { endpoint: string }) {
  return (
    <div className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-3 text-xs leading-5 text-warning-foreground">
      <strong className="block text-sm">Backend integration pending</strong>
      This form is validated and ready, but submission is disabled until{" "}
      <code className="font-semibold">{endpoint}</code> is implemented.
    </div>
  );
}
