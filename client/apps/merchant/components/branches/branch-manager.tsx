"use client";

import { useMemo, useState } from "react";

import { Button, Chip, Input, Label } from "@repo/ui";

import { useArchiveBranch, useBranches, useSaveBranch } from "@/hooks/api/use-branches";
import { notify } from "@/lib/toast/notify";
import type { BranchStatus, BranchValues, MerchantBranch } from "@/types/branch";

const emptyValues: BranchValues = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  code: "",
  country: "",
  isDefault: false,
  name: "",
  phone: "",
  postalCode: "",
  province: "",
  registerName: "",
  status: "ACTIVE",
};
const emptyBranches: MerchantBranch[] = [];

export function BranchManager() {
  const branchesQuery = useBranches();
  const saveBranch = useSaveBranch();
  const archiveBranch = useArchiveBranch();
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [values, setValues] = useState<BranchValues>(emptyValues);
  const branches = branchesQuery.data ?? emptyBranches;
  const editingBranch = useMemo(
    () => branches.find((branch) => branch.id === editingBranchId) ?? null,
    [branches, editingBranchId],
  );

  const startEdit = (branch: MerchantBranch) => {
    setEditingBranchId(branch.id);
    setValues(toValues(branch));
  };
  const reset = () => {
    setEditingBranchId(null);
    setValues(emptyValues);
  };
  const update = (field: keyof BranchValues, value: BranchValues[typeof field]) =>
    setValues((current) => ({ ...current, [field]: value }));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
              Branches
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
              Store locations and POS registers for this merchant.
            </p>
          </div>
          <Button type="button" variant="primary" onPress={reset}>
            New branch
          </Button>
        </header>

        {branchesQuery.isPending ? (
          <div className="grid gap-3 p-5">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-zinc-900"
                key={index}
              />
            ))}
          </div>
        ) : branchesQuery.isError ? (
          <Notice text={branchesQuery.error.message} />
        ) : branches.length ? (
          <div className="divide-y divide-slate-200 dark:divide-zinc-800">
            {branches.map((branch) => (
              <article
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={branch.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">
                      {branch.name}
                    </h3>
                    {branch.isDefault && (
                      <Chip color="accent" size="sm" variant="soft">
                        Default
                      </Chip>
                    )}
                    <Chip
                      color={branch.status === "ACTIVE" ? "success" : "warning"}
                      size="sm"
                      variant="soft"
                    >
                      {branch.status.toLowerCase()}
                    </Chip>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    {branch.code}
                    {branch.registerName ? ` · ${branch.registerName}` : ""}
                  </p>
                  <p className="mt-2 line-clamp-1 text-sm text-slate-500 dark:text-zinc-400">
                    {address(branch) || "No address set"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    type="button"
                    variant="secondary"
                    onPress={() => startEdit(branch)}
                  >
                    Edit
                  </Button>
                  <Button
                    isDisabled={archiveBranch.isPending}
                    size="sm"
                    type="button"
                    variant="danger-soft"
                    onPress={() => {
                      archiveBranch.mutate(branch.id, {
                        onError: (error) =>
                          notify.error(error, "Unable to archive branch"),
                        onSuccess: () => {
                          notify.success("Branch archived");
                          if (editingBranchId === branch.id) reset();
                        },
                      });
                    }}
                  >
                    Archive
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Notice text="No branches yet. Create the first branch to enable POS branch selection." />
        )}
      </section>

      <form
        className="rounded-lg border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        onSubmit={(event) => {
          event.preventDefault();
          if (!values.name.trim() || !values.code.trim()) {
            notify.warning("Branch name and code are required");
            return;
          }
          saveBranch.mutate(
            { branchId: editingBranch?.id, values },
            {
              onError: (error) => notify.error(error, "Unable to save branch"),
              onSuccess: () => {
                notify.success(editingBranch ? "Branch updated" : "Branch created");
                reset();
              },
            },
          );
        }}
      >
        <header>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            {editingBranch ? "Edit branch" : "New branch"}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Branch code is used for reporting and POS register context.
          </p>
        </header>

        <div className="mt-5 grid gap-4">
          <Field
            label="Branch name"
            value={values.name}
            onChange={(value) => update("name", value)}
          />
          <Field
            label="Branch code"
            value={values.code}
            onChange={(value) => update("code", value)}
          />
          <Field
            label="Register name"
            value={values.registerName}
            onChange={(value) => update("registerName", value)}
          />
          <Field
            label="Phone"
            value={values.phone}
            onChange={(value) => update("phone", value)}
          />
          <Field
            label="Address line 1"
            value={values.addressLine1}
            onChange={(value) => update("addressLine1", value)}
          />
          <Field
            label="Address line 2"
            value={values.addressLine2}
            onChange={(value) => update("addressLine2", value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="City"
              value={values.city}
              onChange={(value) => update("city", value)}
            />
            <Field
              label="Province"
              value={values.province}
              onChange={(value) => update("province", value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Postal code"
              value={values.postalCode}
              onChange={(value) => update("postalCode", value)}
            />
            <Field
              label="Country"
              value={values.country}
              onChange={(value) => update("country", value)}
            />
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
              Status
            </span>
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              value={values.status}
              onChange={(event) =>
                update("status", event.target.value as BranchStatus)
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-zinc-800">
            <input
              checked={values.isDefault}
              className="size-4 accent-primary"
              type="checkbox"
              onChange={(event) => update("isDefault", event.target.checked)}
            />
            Default branch
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onPress={reset}>
            Cancel
          </Button>
          <Button
            isDisabled={saveBranch.isPending}
            type="submit"
            variant="primary"
          >
            {saveBranch.isPending ? "Saving..." : "Save branch"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Label className="grid gap-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
        {label}
      </span>
      <Input
        value={value}
        variant="secondary"
        onChange={(event) => onChange(event.target.value)}
      />
    </Label>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="m-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
      {text}
    </div>
  );
}

function toValues(branch: MerchantBranch): BranchValues {
  return {
    addressLine1: branch.addressLine1 ?? "",
    addressLine2: branch.addressLine2 ?? "",
    city: branch.city ?? "",
    code: branch.code,
    country: branch.country ?? "",
    isDefault: branch.isDefault,
    name: branch.name,
    phone: branch.phone ?? "",
    postalCode: branch.postalCode ?? "",
    province: branch.province ?? "",
    registerName: branch.registerName ?? "",
    status: branch.status,
  };
}

function address(branch: MerchantBranch) {
  return [
    branch.addressLine1,
    branch.addressLine2,
    branch.city,
    branch.province,
    branch.postalCode,
    branch.country,
  ]
    .filter(Boolean)
    .join(", ");
}
