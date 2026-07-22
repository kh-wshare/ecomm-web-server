'use client';

import {
  Checkbox,
  EmptyState as HeroEmptyState,
  Form,
  ListBox,
  Modal,
  Select,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { type ReactNode, useMemo, useState } from 'react';

import { Button, Chip, Input, Label, Table } from '@repo/ui';

import {
  useArchiveBranch,
  useBranches,
  useSaveBranch,
} from '@/hooks/api/use-branches';
import { Select as ProductFilterSelect } from '@/components/products/product-controls';
import { formatDate } from '@/lib/formatters/date';
import { notify } from '@/lib/toast/notify';
import type {
  BranchStatus,
  BranchValues,
  MerchantBranch,
} from '@/types/branch';

const emptyValues: BranchValues = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  code: '',
  country: '',
  isDefault: false,
  name: '',
  phone: '',
  postalCode: '',
  province: '',
  registerName: '',
  status: 'ACTIVE',
};
const emptyBranches: MerchantBranch[] = [];

export function BranchManager() {
  const [statusFilter, setStatusFilter] = useState<BranchStatus | 'ALL'>('ALL');
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [values, setValues] = useState<BranchValues>(emptyValues);
  const branchFilters = useMemo(
    () => (statusFilter === 'ALL' ? {} : { status: statusFilter }),
    [statusFilter],
  );
  const branchesQuery = useBranches(branchFilters);
  const saveBranch = useSaveBranch();
  const archiveBranch = useArchiveBranch();
  const branches = branchesQuery.data ?? emptyBranches;
  const editingBranch = useMemo(
    () => branches.find((branch) => branch.id === editingBranchId) ?? null,
    [branches, editingBranchId],
  );

  const openCreate = () => {
    setEditingBranchId(null);
    setValues(emptyValues);
    setIsModalOpen(true);
  };
  const openEdit = (branch: MerchantBranch) => {
    setEditingBranchId(branch.id);
    setValues(toValues(branch));
    setIsModalOpen(true);
  };
  const closeModal = () => {
    if (saveBranch.isPending) return;
    setIsModalOpen(false);
    setEditingBranchId(null);
    setValues(emptyValues);
  };
  const update = <Key extends keyof BranchValues>(
    field: Key,
    value: BranchValues[Key],
  ) => setValues((current) => ({ ...current, [field]: value }));
  const submitBranch = () => {
    if (!values.name.trim() || !values.code.trim()) {
      notify.warning('Branch name and code are required');
      return;
    }

    saveBranch.mutate(
      { branchId: editingBranch?.id, values },
      {
        onError: (error) => notify.error(error, 'Unable to save branch'),
        onSuccess: () => {
          notify.success(editingBranch ? 'Branch updated' : 'Branch created');
          closeModal();
        },
      },
    );
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Settings</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Branches
          </h2>
          <p className="mt-2 text-sm text-muted">
            Manage store locations and POS register context for this merchant.
          </p>
        </div>
        <Button type="button" variant="primary" onPress={openCreate}>
          New branch
        </Button>
      </header>

      <div className="grid gap-4 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-4">
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as BranchStatus | 'ALL')}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface">
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Branches"
              className="h-full min-w-[980px] table-fixed text-left text-sm"
              selectionMode="none"
            >
              <Table.Header className="text-xs font-semibold text-muted">
                <Table.Column
                  className="w-[220px] px-4 py-3 font-medium rounded-b-none"
                  id="branch"
                  isRowHeader
                >
                  Branch
                </Table.Column>
                <Table.Column
                  className="w-[170px] px-4 py-3 font-medium"
                  id="code"
                >
                  Code / register
                </Table.Column>
                <Table.Column
                  className="w-[250px] px-4 py-3 font-medium"
                  id="address"
                >
                  Address
                </Table.Column>
                <Table.Column
                  className="w-[130px] px-4 py-3 font-medium"
                  id="phone"
                >
                  Phone
                </Table.Column>
                <Table.Column
                  className="w-[110px] px-4 py-3 font-medium"
                  id="status"
                >
                  Status
                </Table.Column>
                <Table.Column
                  className="w-[130px] px-4 py-3 font-medium"
                  id="updated"
                >
                  Updated
                </Table.Column>
                <Table.Column
                  className="w-[140px] rounded-b-none px-4 py-3 text-right font-medium"
                  id="actions"
                >
                  Actions
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => {
                  if (branchesQuery.isPending) {
                    return <LoadingState label="Loading branches" />;
                  }
                  if (branchesQuery.isError) {
                    return (
                      <TableErrorState
                        message={branchesQuery.error.message}
                        onRetry={() => branchesQuery.refetch()}
                      />
                    );
                  }
                  return (
                    <BranchEmptyState
                      status={statusFilter}
                      onCreate={openCreate}
                    />
                  );
                }}
              >
                {branches.map((branch) => (
                  <BranchRow
                    archivePending={archiveBranch.isPending}
                    branch={branch}
                    key={branch.id}
                    onArchive={() => {
                      archiveBranch.mutate(branch.id, {
                        onError: (error) =>
                          notify.error(error, 'Unable to archive branch'),
                        onSuccess: () => notify.success('Branch archived'),
                      });
                    }}
                    onEdit={() => openEdit(branch)}
                  />
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      {isModalOpen && (
        <BranchFormModal
          editingBranch={editingBranch}
          isPending={saveBranch.isPending}
          values={values}
          onClose={closeModal}
          onSubmit={submitBranch}
          onUpdate={update}
        />
      )}
    </section>
  );
}

function FilterSelect({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: BranchStatus | 'ALL';
}) {
  return (
    <ProductFilterSelect
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="ALL">All statuses</option>
      <option value="ACTIVE">Active</option>
      <option value="INACTIVE">Inactive</option>
    </ProductFilterSelect>
  );
}

function BranchRow({
  archivePending,
  branch,
  onArchive,
  onEdit,
}: {
  archivePending: boolean;
  branch: MerchantBranch;
  onArchive: () => void;
  onEdit: () => void;
}) {
  return (
    <Table.Row
      className="border-t border-separator first:border-0 hover:bg-surface-secondary/30"
      id={branch.id}
    >
      <Table.Cell className="px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{branch.name}</p>
            {branch.isDefault && (
              <Chip color="accent" size="sm" variant="soft">
                Default
              </Chip>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            Created {formatDate(branch.createdAt, { dateStyle: 'medium' })}
          </p>
        </div>
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
        <p className="font-mono text-xs font-semibold">{branch.code}</p>
        <p className="mt-1 text-xs text-muted">
          {branch.registerName || 'No register'}
        </p>
      </Table.Cell>
      <Table.Cell className="max-w-xs px-4 py-4">
        <p className="line-clamp-2 text-sm text-muted">
          {address(branch) || 'No address set'}
        </p>
      </Table.Cell>
      <Table.Cell className="px-4 py-4 text-sm text-muted">
        {branch.phone || 'No phone'}
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
        <Chip
          color={branch.status === 'ACTIVE' ? 'success' : 'warning'}
          size="sm"
          variant="soft"
        >
          {toLabel(branch.status)}
        </Chip>
      </Table.Cell>
      <Table.Cell className="px-4 py-4 text-xs text-muted">
        {formatDate(branch.updatedAt, { dateStyle: 'medium' })}
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <Button size="sm" type="button" variant="secondary" onPress={onEdit}>
            Edit
          </Button>
          <Button
            isDisabled={archivePending}
            size="sm"
            type="button"
            variant="danger-soft"
            onPress={onArchive}
          >
            Archive
          </Button>
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

function BranchFormModal({
  editingBranch,
  isPending,
  onClose,
  onSubmit,
  onUpdate,
  values,
}: {
  editingBranch: MerchantBranch | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onUpdate: <Key extends keyof BranchValues>(
    field: Key,
    value: BranchValues[Key],
  ) => void;
  values: BranchValues;
}) {
  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        className="bg-black/55 backdrop-blur-sm"
        variant="blur"
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
        <Modal.Container
          className="items-end p-0 sm:items-center sm:p-4"
          scroll="inside"
          size="lg"
        >
          <Modal.Dialog className="max-h-[92dvh] w-full overflow-hidden rounded-t-3xl border border-separator bg-surface shadow-2xl sm:rounded-2xl">
            <Form
              className="contents"
              validationBehavior="native"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <Modal.CloseTrigger className="absolute right-4 top-4 rounded-full border border-separator bg-surface p-2 text-muted transition hover:bg-surface-secondary hover:text-foreground" />
              <Modal.Header className="border-b border-separator px-5 py-5 sm:px-6">
                <div className="min-w-0 pr-10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    Branch settings
                  </p>
                  <Modal.Heading className="mt-1 text-xl font-semibold tracking-tight">
                    {editingBranch ? 'Edit branch' : 'New branch'}
                  </Modal.Heading>
                  <p className="mt-2 text-sm leading-5 text-muted">
                    Branch code is used for reporting and POS register context.
                  </p>
                </div>
              </Modal.Header>

              <Modal.Body className="max-h-[65dvh] overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Branch name"
                    required
                    value={values.name}
                    onChange={(value) => onUpdate('name', value)}
                  />
                  <Field
                    label="Branch code"
                    required
                    value={values.code}
                    onChange={(value) => onUpdate('code', value)}
                  />
                  <Field
                    label="Register name"
                    value={values.registerName}
                    onChange={(value) => onUpdate('registerName', value)}
                  />
                  <Field
                    label="Phone"
                    value={values.phone}
                    onChange={(value) => onUpdate('phone', value)}
                  />
                  <Field
                    className="sm:col-span-2"
                    label="Address line 1"
                    value={values.addressLine1}
                    onChange={(value) => onUpdate('addressLine1', value)}
                  />
                  <Field
                    className="sm:col-span-2"
                    label="Address line 2"
                    value={values.addressLine2}
                    onChange={(value) => onUpdate('addressLine2', value)}
                  />
                  <Field
                    label="City"
                    value={values.city}
                    onChange={(value) => onUpdate('city', value)}
                  />
                  <Field
                    label="Province"
                    value={values.province}
                    onChange={(value) => onUpdate('province', value)}
                  />
                  <Field
                    label="Postal code"
                    value={values.postalCode}
                    onChange={(value) => onUpdate('postalCode', value)}
                  />
                  <Field
                    label="Country"
                    value={values.country}
                    onChange={(value) => onUpdate('country', value)}
                  />
                  <BranchStatusSelect
                    value={values.status}
                    onChange={(status) => onUpdate('status', status)}
                  />
                  <Checkbox
                    className="self-end"
                    isSelected={values.isDefault}
                    variant="secondary"
                    onChange={(isSelected) => onUpdate('isDefault', isSelected)}
                  >
                    <Checkbox.Content className="flex h-11 items-center gap-3 rounded-lg border border-separator bg-background px-3">
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-sm">Default branch</span>
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              </Modal.Body>

              <Modal.Footer className="border-t border-separator bg-surface px-5 py-4 sm:px-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    isDisabled={isPending}
                    type="button"
                    variant="secondary"
                    onPress={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    isDisabled={isPending}
                    type="submit"
                    variant="primary"
                  >
                    {isPending ? 'Saving...' : 'Save branch'}
                  </Button>
                </div>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function BranchStatusSelect({
  onChange,
  value,
}: {
  onChange: (value: BranchStatus) => void;
  value: BranchStatus;
}) {
  return (
    <Select
      className="w-full"
      isRequired
      name="status"
      value={value}
      variant="secondary"
      onChange={(nextValue) => {
        if (nextValue === 'ACTIVE' || nextValue === 'INACTIVE') {
          onChange(nextValue);
        }
      }}
    >
      <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-200">
        Status
      </Label>
      <Select.Trigger className="h-11 rounded-lg border border-separator bg-background px-3 text-sm shadow-none">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="rounded-xl border border-separator bg-surface p-1 shadow-xl">
        <ListBox>
          {(['ACTIVE', 'INACTIVE'] as const).map((status) => (
            <ListBox.Item
              className="rounded-lg px-3 py-2 text-sm outline-none transition hover:bg-surface-secondary data-[focused=true]:bg-surface-secondary"
              id={status}
              key={status}
              textValue={toLabel(status)}
            >
              <span>{toLabel(status)}</span>
              <ListBox.ItemIndicator className="text-accent" />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function Field({
  className,
  label,
  onChange,
  required,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <Label className={`grid gap-1.5 ${className ?? ''}`}>
      <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
        {label}
      </span>
      <Input
        required={required}
        value={value}
        variant="secondary"
        onChange={(event) => onChange(event.target.value)}
      />
    </Label>
  );
}

function TableStateContent({ children }: { children: ReactNode }) {
  return (
    <HeroEmptyState className="flex h-full min-h-56 w-full flex-col items-center justify-center gap-4 text-center md:min-h-[calc(100dvh-29rem)]">
      {children}
    </HeroEmptyState>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <TableStateContent>
      <Icon
        className="size-6 animate-spin text-muted"
        icon="gravity-ui:arrows-rotate-right"
      />
      <span className="text-sm text-muted">{label}</span>
    </TableStateContent>
  );
}

function BranchEmptyState({
  onCreate,
  status,
}: {
  onCreate: () => void;
  status: BranchStatus | 'ALL';
}) {
  const hasFilters = status !== 'ALL';

  return (
    <TableStateContent>
      <Icon className="size-6 text-muted" icon="gravity-ui:tray" />
      <span className="text-sm font-semibold">No branches found</span>
      <span className="max-w-sm text-xs text-muted">
        {hasFilters
          ? 'No branches found for this status.'
          : 'Create the first branch to enable POS branch selection.'}
      </span>
      {!hasFilters && (
        <Button type="button" variant="primary" onPress={onCreate}>
          Create branch
        </Button>
      )}
    </TableStateContent>
  );
}

function TableErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <TableStateContent>
      <Icon className="size-6 text-danger" icon="gravity-ui:circle-xmark" />
      <span className="text-sm font-semibold">Branches are unavailable</span>
      <span className="max-w-sm text-xs text-muted">{message}</span>
      <Button type="button" variant="primary" onPress={onRetry}>
        Try again
      </Button>
    </TableStateContent>
  );
}

function toValues(branch: MerchantBranch): BranchValues {
  return {
    addressLine1: branch.addressLine1 ?? '',
    addressLine2: branch.addressLine2 ?? '',
    city: branch.city ?? '',
    code: branch.code,
    country: branch.country ?? '',
    isDefault: branch.isDefault,
    name: branch.name,
    phone: branch.phone ?? '',
    postalCode: branch.postalCode ?? '',
    province: branch.province ?? '',
    registerName: branch.registerName ?? '',
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
    .join(', ');
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
