'use client';

import {
  EmptyState as HeroEmptyState,
  Form,
  Label,
  ListBox,
  Modal,
  SearchField,
  Select,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { type ReactNode, useDeferredValue, useMemo, useState } from 'react';

import { Button, Chip, Input, Table, TextArea } from '@repo/ui';

import { Select as ProductFilterSelect } from '@/components/products/product-controls';
import {
  useArchiveCategory,
  useCategories,
  useSaveCategory,
} from '@/hooks/api/use-categories';
import { formatDate } from '@/lib/formatters/date';
import { uploadMerchantFile } from '@/lib/files/file-data';
import { notify } from '@/lib/toast/notify';
import { usePermissions } from '@/hooks/use-permissions';
import type {
  CategoryListFilters,
  CategoryStatus,
  CategoryValues,
  ProductCategory,
} from '@/types/category';
import { CATEGORY_STATUSES } from '@/types/category';

const emptyValues: CategoryValues = {
  description: '',
  logoUrl: '',
  name: '',
  slug: '',
  sortOrder: '0',
  status: 'ACTIVE',
};
const emptyCategories: ProductCategory[] = [];

export function CategoryManager() {
  const { can } = usePermissions();
  const canRead = can('products.read');
  const canCreate = can('products.create');
  const canUpdate = can('products.update');
  const canDelete = can('products.delete');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [statusFilter, setStatusFilter] = useState<CategoryStatus | 'ALL'>(
    'ALL',
  );
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [values, setValues] = useState<CategoryValues>(emptyValues);
  const filters: CategoryListFilters = useMemo(
    () => ({
      search: deferredSearch,
      status: statusFilter,
    }),
    [deferredSearch, statusFilter],
  );
  const categoriesQuery = useCategories(filters, canRead);
  const saveCategory = useSaveCategory();
  const archiveCategory = useArchiveCategory();
  const categories = categoriesQuery.data ?? emptyCategories;
  const editingCategory = useMemo(
    () =>
      categories.find((category) => category.id === editingCategoryId) ?? null,
    [categories, editingCategoryId],
  );

  const openCreate = () => {
    setEditingCategoryId(null);
    setValues(emptyValues);
    setIsModalOpen(true);
  };
  const openEdit = (category: ProductCategory) => {
    setEditingCategoryId(category.id);
    setValues(toValues(category));
    setIsModalOpen(true);
  };
  const closeModal = () => {
    if (saveCategory.isPending || isUploadingLogo) return;
    revokeLogoPreview(values.logoPreviewUrl);
    setIsModalOpen(false);
    setEditingCategoryId(null);
    setValues(emptyValues);
  };
  const update = <Key extends keyof CategoryValues>(
    field: Key,
    value: CategoryValues[Key],
  ) => setValues((current) => ({ ...current, [field]: value }));
  const submitCategory = async () => {
    if (!values.name.trim()) {
      notify.warning('Category name is required');
      return;
    }

    const sortOrder = Number(values.sortOrder || 0);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      notify.warning('Sort order must be zero or a positive whole number');
      return;
    }

    let logoUrl = values.logoUrl;
    if (values.logoFile) {
      try {
        setIsUploadingLogo(true);
        logoUrl = await uploadCategoryLogo(values.logoFile);
      } catch (error) {
        notify.error(error, 'Unable to upload category logo');
        setIsUploadingLogo(false);
        return;
      }
      setIsUploadingLogo(false);
    }

    saveCategory.mutate(
      {
        categoryId: editingCategory?.id,
        values: {
          description: values.description,
          logoUrl: logoUrl || null,
          name: values.name,
          slug: values.slug,
          sortOrder,
          status: values.status,
        },
      },
      {
        onError: (error) => notify.error(error, 'Unable to save category'),
        onSuccess: () => {
          notify.success(
            editingCategory ? 'Category updated' : 'Category created',
          );
          closeModal();
        },
      },
    );
  };

  if (!canRead) {
    return (
      <PermissionNotice message="You do not have permission to view categories." />
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Catalog</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Categories
          </h2>
          <p className="mt-2 text-sm text-muted">
            Organize products for POS menus, storefront browsing, and catalog
            filters.
          </p>
        </div>
        {canCreate && (
          <Button type="button" variant="primary" onPress={openCreate}>
            Create category
          </Button>
        )}
      </header>

      <div className="grid gap-4 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <SearchField name="search" value={search}>
            <Label>Search</Label>
            <SearchField.Group className="bg-surface-secondary shadow-none">
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder="Search categories..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as CategoryStatus | 'ALL')}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface">
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Categories"
              className="h-full table-fixed text-left text-sm"
              selectionMode="none"
            >
              <Table.Header className="text-xs font-semibold text-muted">
                <Table.Column
                  className="w-[280px] px-4 py-3 font-medium rounded-b-none"
                  id="category"
                  isRowHeader
                >
                  Category
                </Table.Column>
                <Table.Column
                  className="w-[190px] px-4 py-3 font-medium"
                  id="slug"
                >
                  Slug
                </Table.Column>
                <Table.Column
                  className="w-[90px] px-4 py-3 font-medium"
                  id="sortOrder"
                >
                  Sort
                </Table.Column>
                <Table.Column
                  className="w-[120px] px-4 py-3 font-medium"
                  id="status"
                >
                  Status
                </Table.Column>
                <Table.Column
                  className="w-[120px] px-4 py-3 font-medium"
                  id="updated"
                >
                  Updated
                </Table.Column>
                <Table.Column
                  className="w-[120px] rounded-b-none px-4 py-3 text-right font-medium"
                  id="actions"
                >
                  Actions
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => {
                  if (categoriesQuery.isPending) {
                    return <LoadingState label="Loading categories" />;
                  }
                  if (categoriesQuery.isError) {
                    return (
                      <ErrorState
                        message={categoriesQuery.error.message}
                        onRetry={() => categoriesQuery.refetch()}
                      />
                    );
                  }
                  return (
                    <CategoryEmptyState
                      canCreate={canCreate}
                      search={deferredSearch}
                      status={statusFilter}
                      onCreate={openCreate}
                    />
                  );
                }}
              >
                {categories.map((category) => (
                  <CategoryRow
                    archivePending={archiveCategory.isPending}
                    canDelete={canDelete}
                    canUpdate={canUpdate}
                    category={category}
                    key={category.id}
                    onArchive={() => {
                      archiveCategory.mutate(category.id, {
                        onError: (error) =>
                          notify.error(error, 'Unable to archive category'),
                        onSuccess: () => notify.success('Category archived'),
                      });
                    }}
                    onEdit={() => openEdit(category)}
                  />
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      {isModalOpen && (
        <CategoryFormModal
          editingCategory={editingCategory}
          isPending={saveCategory.isPending || isUploadingLogo}
          values={values}
          onClose={closeModal}
          onSubmit={submitCategory}
          onUpdate={update}
        />
      )}
    </section>
  );
}

function CategoryRow({
  archivePending,
  canDelete,
  canUpdate,
  category,
  onArchive,
  onEdit,
}: {
  archivePending: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  category: ProductCategory;
  onArchive: () => void;
  onEdit: () => void;
}) {
  return (
    <Table.Row
      className="border-t border-separator first:border-0 hover:bg-surface-secondary/30"
      id={category.id}
    >
      <Table.Cell className="px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryLogo logoUrl={category.logoUrl} name={category.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{category.name}</p>
            <p className="mt-1 line-clamp-1 text-xs text-muted">
              {category.description || 'No description'}
            </p>
          </div>
        </div>
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
        <span className="font-mono text-xs font-semibold">{category.slug}</span>
      </Table.Cell>
      <Table.Cell className="px-4 py-4 font-semibold">
        {category.sortOrder}
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
        <Chip
          color={category.status === 'ACTIVE' ? 'success' : 'warning'}
          size="sm"
          variant="soft"
        >
          {toLabel(category.status)}
        </Chip>
      </Table.Cell>
      <Table.Cell className="px-4 py-4 text-xs text-muted">
        {formatDate(category.updatedAt, { dateStyle: 'medium' })}
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
        <div className="flex justify-end gap-2">
          {canUpdate && (
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onPress={onEdit}
            >
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              isDisabled={archivePending}
              size="sm"
              type="button"
              variant="danger-soft"
              onPress={onArchive}
            >
              Archive
            </Button>
          )}
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

function CategoryFormModal({
  editingCategory,
  isPending,
  onClose,
  onSubmit,
  onUpdate,
  values,
}: {
  editingCategory: ProductCategory | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onUpdate: <Key extends keyof CategoryValues>(
    field: Key,
    value: CategoryValues[Key],
  ) => void;
  values: CategoryValues;
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
                    Catalog category
                  </p>
                  <Modal.Heading className="mt-1 text-xl font-semibold tracking-tight">
                    {editingCategory ? 'Edit category' : 'Create category'}
                  </Modal.Heading>
                  <p className="mt-2 text-sm leading-5 text-muted">
                    Categories are shared by product, POS, and storefront
                    catalog views.
                  </p>
                </div>
              </Modal.Header>

              <Modal.Body className="max-h-[65dvh] overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Category name"
                    required
                    value={values.name}
                    onChange={(value) => onUpdate('name', value)}
                  />
                  <Field
                    label="Slug"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    value={values.slug}
                    onChange={(value) => onUpdate('slug', value)}
                  />
                  <CategoryLogoField
                    className="sm:col-span-2"
                    logoUrl={values.logoPreviewUrl || values.logoUrl}
                    onChange={(file) => {
                      revokeLogoPreview(values.logoPreviewUrl);
                      onUpdate('logoFile', file);
                      onUpdate('logoPreviewUrl', URL.createObjectURL(file));
                    }}
                    onClear={() => {
                      revokeLogoPreview(values.logoPreviewUrl);
                      onUpdate('logoFile', undefined);
                      onUpdate('logoPreviewUrl', undefined);
                      onUpdate('logoUrl', '');
                    }}
                  />
                  <Field
                    label="Sort order"
                    min={0}
                    required
                    type="number"
                    value={values.sortOrder}
                    onChange={(value) => onUpdate('sortOrder', value)}
                  />
                  <CategoryStatusSelect
                    value={values.status}
                    onChange={(status) => onUpdate('status', status)}
                  />
                  <DescriptionField
                    value={values.description}
                    onChange={(value) => onUpdate('description', value)}
                  />
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
                    {isPending ? 'Saving...' : 'Save category'}
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

function FilterSelect({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: CategoryStatus | 'ALL';
}) {
  return (
    <ProductFilterSelect
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="ALL">All statuses</option>
      {CATEGORY_STATUSES.map((status) => (
        <option key={status} value={status}>
          {toLabel(status)}
        </option>
      ))}
    </ProductFilterSelect>
  );
}

function CategoryLogo({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string;
}) {
  if (logoUrl) {
    return (
      <img
        alt=""
        className="size-10 shrink-0 rounded-lg border border-separator object-cover"
        src={logoUrl}
      />
    );
  }

  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-sm font-semibold text-accent">
      {name.trim().charAt(0).toUpperCase() || 'C'}
    </span>
  );
}

function CategoryLogoField({
  className,
  logoUrl,
  onChange,
  onClear,
}: {
  className?: string;
  logoUrl?: string;
  onChange: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ''}`}>
      <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
        Category logo
      </span>
      <div className="flex flex-col gap-3 rounded-lg border border-separator bg-background p-3 sm:flex-row sm:items-center">
        <CategoryLogo logoUrl={logoUrl || null} name="Category" />
        <div className="min-w-0 flex-1">
          <input
            accept="image/*"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-accent-foreground"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onChange(file);
              event.target.value = '';
            }}
          />
          <p className="mt-1 text-xs text-muted">
            Upload an image for POS and storefront category display.
          </p>
        </div>
        {logoUrl && (
          <Button type="button" variant="secondary" onPress={onClear}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

function CategoryStatusSelect({
  onChange,
  value,
}: {
  onChange: (value: CategoryStatus) => void;
  value: CategoryStatus;
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
          {CATEGORY_STATUSES.map((status) => (
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
  min,
  onChange,
  pattern,
  required,
  type = 'text',
  value,
}: {
  className?: string;
  label: string;
  min?: number;
  onChange: (value: string) => void;
  pattern?: string;
  required?: boolean;
  type?: 'number' | 'text';
  value: string;
}) {
  return (
    <Label className={`grid gap-1.5 ${className ?? ''}`}>
      <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
        {label}
      </span>
      <Input
        min={min}
        pattern={pattern}
        required={required}
        type={type}
        value={value}
        variant="secondary"
        onChange={(event) => onChange(event.target.value)}
      />
    </Label>
  );
}

function DescriptionField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Label className="grid gap-1.5 sm:col-span-2">
      <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
        Description
      </span>
      <TextArea
        className="min-h-28"
        maxLength={1000}
        value={value}
        variant="secondary"
        onChange={(event) => onChange(event.target.value)}
      />
    </Label>
  );
}

function PermissionNotice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
      {message}
    </div>
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

function CategoryEmptyState({
  canCreate,
  onCreate,
  search,
  status,
}: {
  canCreate: boolean;
  onCreate: () => void;
  search: string;
  status: CategoryStatus | 'ALL';
}) {
  const hasFilters = Boolean(search || status !== 'ALL');

  return (
    <TableStateContent>
      <Icon className="size-6 text-muted" icon="gravity-ui:tray" />
      <span className="text-sm font-semibold">No categories found</span>
      <span className="max-w-sm text-xs text-muted">
        {hasFilters
          ? 'Try changing your search or status filter.'
          : 'Create the first category to group products in the catalog.'}
      </span>
      {canCreate && !hasFilters && (
        <Button type="button" variant="primary" onPress={onCreate}>
          Create category
        </Button>
      )}
    </TableStateContent>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <TableStateContent>
      <Icon className="size-6 text-danger" icon="gravity-ui:circle-xmark" />
      <span className="text-sm font-semibold">Categories are unavailable</span>
      <span className="max-w-sm text-xs text-muted">{message}</span>
      <Button type="button" variant="primary" onPress={onRetry}>
        Try again
      </Button>
    </TableStateContent>
  );
}

function toValues(category: ProductCategory): CategoryValues {
  return {
    description: category.description ?? '',
    logoUrl: category.logoUrl ?? '',
    name: category.name,
    slug: category.slug,
    sortOrder: String(category.sortOrder),
    status: category.status,
  };
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
}

async function uploadCategoryLogo(file: File) {
  const uploaded = await uploadMerchantFile(file, {
    purpose: 'category-logo',
    visibility: 'public',
  });

  return uploaded.url;
}

function revokeLogoPreview(previewUrl?: string) {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
}
