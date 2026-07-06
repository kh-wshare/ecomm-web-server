import { Button, Spinner } from "@heroui/react";

export function SubmitButton({
  children,
  isPending,
}: {
  children: React.ReactNode;
  isPending: boolean;
}) {
  return (
    <Button
      fullWidth
      type="submit"
      isDisabled={isPending}
      isPending={isPending}
    >
      {isPending ? (
        <span className="flex items-center gap-2">
          <Spinner size="sm" />
          Please wait…
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
