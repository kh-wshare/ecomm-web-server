import { Button } from "@repo/ui";

export function SubmitButton({
  children,
  isPending,
}: {
  children: React.ReactNode;
  isPending: boolean;
}) {
  return (
    <Button
      className="bg-emerald-600 text-white hover:bg-emerald-700"
      fullWidth
      isDisabled={isPending}
      isPending={isPending}
      type="submit"
    >
      {isPending ? "Please wait..." : children}
    </Button>
  );
}
