"use client";

import { AlertDialog, Button } from "@heroui/react";

export function ConfirmDialog({
  confirmLabel = "Confirm",
  description,
  isPending = false,
  onCancel,
  onConfirm,
  open,
  title,
  tone = "danger",
}: {
  confirmLabel?: string;
  description: string;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  tone?: "danger" | "primary";
}) {
  return (
    <AlertDialog isOpen={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container placement="center" size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon
                status={tone === "danger" ? "danger" : "accent"}
              />
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{description}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isPending}
                type="button"
                variant="tertiary"
                onPress={onCancel}
              >
                Cancel
              </Button>
              <Button
                isDisabled={isPending}
                type="button"
                variant={tone === "danger" ? "danger" : "primary"}
                onPress={onConfirm}
              >
                {isPending ? "Working..." : confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
