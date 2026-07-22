'use client';

import {
  Button,
  Description,
  EmptyState as HeroEmptyState,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Table,
  TextArea,
  TextField,
  Tooltip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useCategories } from '@/hooks/api/use-categories';
import { usePermissions } from '@/hooks/use-permissions';
import {
  adjustProductStock,
  createProduct,
  getProduct,
  getProductInventory,
  updateProduct,
} from '@/lib/products/product-data';
import { uploadMerchantFile } from '@/lib/files/file-data';
import { queryKeys } from '@repo/query-client';
import { notify } from '@/lib/toast/notify';
import { validateForm } from '@/lib/validation/form';
import { productFormSchema } from '@/lib/validation/product';
import type {
  Product,
  ProductFormValues,
  ProductInventoryDetail,
  ProductPayload,
  ProductStatus,
  VariantStatus,
} from '@/types/product';
import type { ProductCategory } from '@/types/category';
import {
  PRODUCT_STATUSES,
  SALES_CHANNELS,
  VARIANT_STATUSES,
} from '@/types/product';

type FormErrors = Record<string, string[]>;

type SelectOption<T extends string = string> = {
  label: string;
  value: T;
};

type ProductMediaType = 'IMAGE' | 'VIDEO';

type ProductFormMedia = ProductFormValues['media'][number] & {
  file?: File;
  previewUrl?: string;
  fileName?: string;
  fileSize?: number;
};

type ProductFormDraftValues = Omit<ProductFormValues, 'media'> & {
  media: ProductFormMedia[];
};

type ChannelMode = 'off' | 'visible' | 'selling';

type StockAdjustmentDraft = {
  productId: string;
  quantityDelta: number;
  safetyBuffer: number;
  variantId?: string;
};

type VariantModalState = {
  index: number | null;
  mode: 'create' | 'edit';
  value: ProductFormDraftValues['variants'][number];
};

type MediaModalState = {
  index: number | null;
  mode: 'create' | 'edit';
  value: ProductFormMedia;
};

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 5;

const CHANNEL_MODES: {
  value: ChannelMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'off',
    label: 'Off',
    description: 'Hidden from customers',
  },
  {
    value: 'visible',
    label: 'Visible',
    description: 'Customers can see it',
  },
  {
    value: 'selling',
    label: 'Selling',
    description: 'Customers can buy it',
  },
];

function getChannelMode(item: {
  isVisible: boolean;
  isPurchasable: boolean;
}): ChannelMode {
  if (item.isPurchasable) return 'selling';
  if (item.isVisible) return 'visible';
  return 'off';
}

function getChannelPatch(mode: ChannelMode) {
  if (mode === 'selling') {
    return {
      isVisible: true,
      isPurchasable: true,
    };
  }

  if (mode === 'visible') {
    return {
      isVisible: true,
      isPurchasable: false,
    };
  }

  return {
    isVisible: false,
    isPurchasable: false,
  };
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const fieldClassName = 'w-full';
const inputClassName =
  'rounded-xl border border-separator bg-background px-3 text-sm outline-none transition shadow-none';
const textAreaClassName =
  'min-h-32 w-full rounded-xl border border-separator bg-background p-3 text-sm outline-none transition shadow-none';
const selectTriggerClassName =
  'rounded-xl border border-separator bg-background px-3 text-sm transition shadow-none';
const selectPopoverClassName =
  'rounded-xl border border-separator bg-surface p-1 shadow-none';
const emptyCategories: ProductCategory[] = [];

export function NewProductForm() {
  const { can } = usePermissions();

  if (!can('products.create')) {
    return <PermissionNotice action="create products" />;
  }

  return <ProductForm mode="create" />;
}

export function EditProductForm({ productId }: { productId: string }) {
  const { can } = usePermissions();
  const canUpdate = can('products.update');
  const canReadInventory = can('inventory.read');

  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => getProduct(productId),
    enabled: canUpdate,
  });

  const inventoryQuery = useQuery({
    queryKey: queryKeys.inventory.detail(productId),
    queryFn: () => getProductInventory(productId),
    enabled: canUpdate && canReadInventory,
    retry: false,
  });

  if (!canUpdate) return <PermissionNotice action="edit products" />;

  if (
    productQuery.isPending ||
    (canReadInventory && inventoryQuery.isPending)
  ) {
    return <ProductFormLoading />;
  }

  if (productQuery.isError) {
    return (
      <LoadError
        message={productQuery.error.message}
        onRetry={() => productQuery.refetch()}
      />
    );
  }

  return (
    <ProductForm
      inventory={inventoryQuery.data}
      mode="edit"
      product={productQuery.data}
    />
  );
}

function ProductForm({
  inventory,
  mode,
  product,
}: {
  inventory?: ProductInventoryDetail;
  mode: 'create' | 'edit';
  product?: Product;
}) {
  const initialValues = useMemo(
    () => toInitialValues(product, inventory),
    [inventory, product],
  );

  const formKey =
    mode === 'create'
      ? 'create'
      : [
          product?.id,
          product?.updatedAt,
          inventory?.stocks
            .map(
              (stock) =>
                `${stock.variantId ?? 'base'}:${stock.updatedAt}:${stock.totalStock}:${stock.safetyBuffer}`,
            )
            .join('|'),
        ].join(':');

  return (
    <ProductFormFields
      inventory={inventory}
      initialValues={initialValues}
      key={formKey}
      mode={mode}
      product={product}
    />
  );
}

function ProductFormFields({
  inventory,
  initialValues,
  mode,
  product,
}: {
  inventory?: ProductInventoryDetail;
  initialValues: ProductFormDraftValues;
  mode: 'create' | 'edit';
  product?: Product;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canAdjustStock = can('inventory.update');
  const categoriesQuery = useCategories({ search: '', status: 'ACTIVE' });

  const [values, setValues] = useState<ProductFormDraftValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [variantModal, setVariantModal] = useState<VariantModalState | null>(
    null,
  );
  const [mediaModal, setMediaModal] = useState<MediaModalState | null>(null);
  const categories = categoriesQuery.data ?? emptyCategories;
  const categoryOptions: SelectOption<string>[] = [
    { label: 'No category', value: '' },
  ];
  const seenCategoryIds = new Set<string>();

  categories.forEach((category) => {
    seenCategoryIds.add(category.id);
    categoryOptions.push({ label: category.name, value: category.id });
  });

  if (product?.category && !seenCategoryIds.has(product.category.id)) {
    categoryOptions.push({
      label: `${product.category.name} (${toLabel(product.category.status)})`,
      value: product.category.id,
    });
  }

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const visibleChannelCount = values.channels.filter(
    (item) => item.isVisible,
  ).length;
  const purchasableChannelCount = values.channels.filter(
    (item) => item.isPurchasable,
  ).length;
  const baseStock = inventory?.stocks.find((stock) => stock.variantId === null);
  const mainImage = values.media.find(
    (item) =>
      item.type === 'IMAGE' && Boolean(item.previewUrl || item.url.trim()),
  );
  const mainImageUrl = mainImage?.previewUrl || mainImage?.url;
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const revokePreviewUrl = (previewUrl?: string) => {
    if (!previewUrl) return;

    URL.revokeObjectURL(previewUrl);
    previewUrlsRef.current.delete(previewUrl);
  };

  const revokeAllPreviewUrls = () => {
    previewUrlsRef.current.forEach((previewUrl) =>
      URL.revokeObjectURL(previewUrl),
    );
    previewUrlsRef.current.clear();
  };

  useEffect(() => revokeAllPreviewUrls, []);

  useEffect(() => {
    if (!isDirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', warn);

    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: async (formValues: ProductFormDraftValues) => {
      const payload = await toPayload(formValues, mode, canAdjustStock);
      const savedProduct =
        mode === 'create'
          ? await createProduct(payload)
          : await updateProduct(product!.id, payload);

      const stockAdjustments =
        mode === 'edit'
          ? buildStockAdjustments({
              formValues,
              mode,
              savedProduct,
            })
          : [];

      if (canAdjustStock && stockAdjustments.length) {
        await Promise.all(
          stockAdjustments.map((stock) =>
            adjustProductStock(
              stock.productId,
              stock.quantityDelta,
              stock.safetyBuffer,
              stock.variantId,
            ),
          ),
        );
      }

      return savedProduct;
    },
    onSuccess: async (savedProduct) => {
      notify.success(
        mode === 'create' ? 'Product created' : 'Product updated',
        `${savedProduct.name} is saved.`,
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ]);

      router.push(`/products/${savedProduct.id}`);
    },
    onError: (error) => notify.error(error, 'Unable to save product'),
  });

  const setField = <K extends keyof ProductFormDraftValues>(
    field: K,
    value: ProductFormDraftValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];

      return next;
    });
  };

  const openVariantModal = (index?: number) => {
    const variant = index === undefined ? undefined : values.variants[index];

    setVariantModal({
      index: index ?? null,
      mode: variant ? 'edit' : 'create',
      value: variant ? { ...variant } : emptyVariant(values.variants.length),
    });
  };

  const updateVariantDraft = <
    K extends keyof ProductFormDraftValues['variants'][number],
  >(
    field: K,
    value: ProductFormDraftValues['variants'][number][K],
  ) => {
    setVariantModal((current) =>
      current
        ? { ...current, value: { ...current.value, [field]: value } }
        : current,
    );
  };

  const saveVariantDraft = () => {
    if (!variantModal) return;

    if (variantModal.mode === 'edit' && variantModal.index !== null) {
      const variants = [...values.variants];
      variants[variantModal.index] = variantModal.value;
      setField('variants', variants);
    } else {
      setField('variants', [...values.variants, variantModal.value]);
    }

    setVariantModal(null);
  };

  const removeVariant = (index: number) => {
    setField(
      'variants',
      values.variants.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const openMediaModal = (index?: number) => {
    const media = index === undefined ? undefined : values.media[index];

    setMediaModal({
      index: index ?? null,
      mode: media ? 'edit' : 'create',
      value: media ? { ...media } : emptyMedia(),
    });
  };

  const savedMediaPreviewUrl = (state: MediaModalState) =>
    state.index === null ? undefined : values.media[state.index]?.previewUrl;

  const closeMediaModal = () => {
    if (mediaModal) {
      const savedPreviewUrl = savedMediaPreviewUrl(mediaModal);

      if (
        mediaModal.value.previewUrl &&
        mediaModal.value.previewUrl !== savedPreviewUrl
      ) {
        revokePreviewUrl(mediaModal.value.previewUrl);
      }
    }

    setMediaModal(null);
  };

  const updateMediaDraft = (patch: Partial<ProductFormMedia>) => {
    setMediaModal((current) =>
      current ? { ...current, value: { ...current.value, ...patch } } : current,
    );
  };

  const saveMediaDraft = () => {
    if (!mediaModal) return;

    if (mediaModal.mode === 'edit' && mediaModal.index !== null) {
      const previous = values.media[mediaModal.index];
      const mediaItems = [...values.media];

      if (
        previous?.previewUrl &&
        previous.previewUrl !== mediaModal.value.previewUrl
      ) {
        revokePreviewUrl(previous.previewUrl);
      }

      mediaItems[mediaModal.index] = mediaModal.value;
      setField('media', mediaItems);
    } else {
      setField('media', [...values.media, mediaModal.value]);
    }

    setMediaModal(null);
  };

  const removeMedia = (index: number) => {
    revokePreviewUrl(values.media[index]?.previewUrl);

    setField(
      'media',
      values.media.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleDraftMediaTypeChange = (type: ProductMediaType) => {
    setMediaModal((current) => {
      if (!current) return current;

      const savedPreviewUrl = savedMediaPreviewUrl(current);

      if (
        current.value.previewUrl &&
        current.value.previewUrl !== savedPreviewUrl
      ) {
        revokePreviewUrl(current.value.previewUrl);
      }

      return {
        ...current,
        value: {
          ...current.value,
          type,
          url: '',
          file: undefined,
          previewUrl: undefined,
          fileName: undefined,
          fileSize: undefined,
        },
      };
    });
  };

  const handleDraftImageUpload = (file?: File) => {
    if (!file || !mediaModal) return;

    const isValidType = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isValidSize = file.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024;

    if (!isValidType) {
      notify.warning('Upload JPG, PNG, or WEBP images only');
      return;
    }

    if (!isValidSize) {
      notify.warning(`Image must be ${MAX_IMAGE_SIZE_MB} MB or smaller`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);

    setMediaModal((current) => {
      if (!current) return current;

      const savedPreviewUrl = savedMediaPreviewUrl(current);

      if (
        current.value.previewUrl &&
        current.value.previewUrl !== savedPreviewUrl
      ) {
        revokePreviewUrl(current.value.previewUrl);
      }

      return {
        ...current,
        value: {
          ...current.value,
          type: 'IMAGE',
          file,
          previewUrl,
          fileName: file.name,
          fileSize: file.size,
        },
      };
    });
  };

  const reset = () => {
    revokeAllPreviewUrls();
    setValues(initialValues);
    setErrors({});
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = validateForm(productFormSchema, toValidationValues(values));

    if (!result.success) {
      setErrors(result.errors);
      notify.warning('Check the highlighted product fields');

      return;
    }

    const stockErrors = canAdjustStock
      ? validateStockChanges({
          formValues: result.data,
          initialValues,
          mode,
        })
      : {};

    if (Object.keys(stockErrors).length) {
      setErrors(stockErrors);
      notify.warning('Add a stock quantity where a safety buffer changes');

      return;
    }

    saveMutation.mutate({ ...values, ...result.data, media: values.media });
  };

  return (
    <Form className="space-y-6" onSubmit={submit}>
      <header className="overflow-hidden rounded-3xl border border-separator bg-surface shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="min-w-0">
            <Link
              className="text-sm font-medium text-accent hover:underline"
              href={product ? `/products/${product.id}` : '/products'}
            >
              ← Products
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {mode === 'create' ? 'Create product' : `Edit ${product?.name}`}
              </h2>
              <StatusBadge status={values.status} />
            </div>

            <p className="mt-2 max-w-2xl text-sm text-muted">
              Set up the catalog details, selling options, media, channels, and
              stock rules from one focused product form.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="inline-flex h-9.5 items-center justify-center rounded-full border border-separator px-4 text-sm font-semibold transition hover:bg-surface-secondary"
              href={product ? `/products/${product.id}` : '/products'}
            >
              Cancel
            </Link>
            <Button isDisabled={saveMutation.isPending} type="submit">
              {saveMutation.isPending
                ? 'Saving…'
                : mode === 'create'
                  ? 'Create product'
                  : 'Save changes'}
            </Button>
          </div>
        </div>

        <div className="grid border-t border-separator bg-background/40 sm:grid-cols-4">
          <HeaderMetric label="SKU" value={values.sku || 'Not set'} />
          <HeaderMetric
            label="Price"
            value={
              values.price ? `${values.price} ${values.currency}` : 'Not set'
            }
          />
          <HeaderMetric
            label="Variants"
            value={String(values.variants.length)}
          />
          <HeaderMetric
            label="Channels"
            value={`${purchasableChannelCount}/${values.channels.length} selling`}
          />
        </div>
      </header>

      {saveMutation.isError && (
        <div className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
          {saveMutation.error.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
        <div className="space-y-6">
          <FormSection
            description="Core catalog information customers and staff will see."
            title="Basic information"
          >
            <Fieldset.Group className="grid gap-4 sm:grid-cols-2">
              <HeroTextInput
                error={firstError(errors, 'name')}
                label="Product name"
                maxLength={160}
                name="name"
                placeholder="Enter product name, e.g. Classic T-Shirt"
                required
                value={values.name}
                onChange={(value) => setField('name', value)}
              />

              <HeroTextInput
                description="Leave empty to let the backend generate one."
                error={firstError(errors, 'slug')}
                label="URL slug"
                maxLength={180}
                name="slug"
                placeholder="Enter product slug"
                value={values.slug}
                onChange={(value) => setField('slug', value)}
              />

              <HeroTextInput
                error={firstError(errors, 'sku')}
                label="SKU"
                maxLength={80}
                name="sku"
                placeholder="Enter SKU, e.g. SHIRT-001"
                required
                value={values.sku}
                onChange={(value) => setField('sku', value)}
              />

              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                <HeroTextInput
                  error={firstError(errors, 'price')}
                  inputMode="decimal"
                  label="Price"
                  name="price"
                  placeholder="0.00"
                  required
                  value={values.price}
                  onChange={(value) => setField('price', value)}
                />
                <HeroTextInput
                  error={firstError(errors, 'currency')}
                  label="Currency"
                  maxLength={3}
                  name="currency"
                  placeholder="USD"
                  required
                  value={values.currency}
                  onChange={(value) =>
                    setField('currency', value.toUpperCase())
                  }
                />
              </div>

              <HeroSelectField<ProductStatus>
                error={firstError(errors, 'status')}
                label="Status"
                name="status"
                options={PRODUCT_STATUSES.map((status) => ({
                  label: toLabel(status),
                  value: status,
                }))}
                required
                value={values.status}
                onChange={(value) => setField('status', value)}
              />

              <HeroSelectField<string>
                description={
                  categoriesQuery.isError
                    ? 'Unable to load categories right now.'
                    : undefined
                }
                error={firstError(errors, 'categoryId')}
                label="Category"
                name="categoryId"
                options={categoryOptions}
                value={values.categoryId}
                onChange={(value) => setField('categoryId', value)}
              />

              <HeroTextAreaInput
                className="sm:col-span-2"
                description={`${values.description.length}/10000 characters`}
                error={firstError(errors, 'description')}
                label="Description"
                maxLength={10000}
                name="description"
                placeholder="Describe the product, key features, materials, or usage..."
                value={values.description}
                onChange={(value) => setField('description', value)}
              />
            </Fieldset.Group>
          </FormSection>

          <FormSection
            action={
              <Button type="button" onPress={() => openVariantModal()}>
                Add variant
              </Button>
            }
            description="Optional purchasable options. Updating variants replaces the saved set."
            title="Variants"
          >
            <VariantTable
              canAdjustStock={canAdjustStock}
              errors={errors}
              mode={mode}
              variants={values.variants}
              onAdd={() => openVariantModal()}
              onEdit={openVariantModal}
              onRemove={removeVariant}
            />
          </FormSection>

          <FormSection
            action={
              <Button
                variant="primary"
                type="button"
                onPress={() => openMediaModal()}
              >
                Add media
              </Button>
            }
            description="Add product photos or videos. Photos can be uploaded or pasted as a link. Videos support link only."
            title="Product media"
          >
            <ProductMediaTable
              errors={errors}
              media={values.media}
              onAdd={() => openMediaModal()}
              onEdit={openMediaModal}
              onRemove={removeMedia}
            />
          </FormSection>
          <FormSection
            compact
            description="Choose how this product behaves in each sales channel."
            title="Channel visibility"
          >
            <div className="grid gap-3">
              {values.channels.map((item, index) => {
                const selectedMode = getChannelMode(item);

                return (
                  <div
                    className="rounded-2xl border border-separator bg-background p-4"
                    key={item.channel}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {toLabel(item.channel)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Select one simple status for this channel.
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          selectedMode === 'selling'
                            ? 'bg-success/10 text-success'
                            : selectedMode === 'visible'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-surface-secondary text-muted'
                        }`}
                      >
                        {selectedMode === 'selling'
                          ? 'Selling'
                          : selectedMode === 'visible'
                            ? 'Visible'
                            : 'Off'}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      {CHANNEL_MODES.map((mode) => {
                        const isSelected = selectedMode === mode.value;

                        return (
                          <button
                            className={`rounded-xl border px-3 py-3 text-left transition ${
                              isSelected
                                ? 'border-accent bg-accent/10'
                                : 'border-separator bg-surface hover:bg-surface-secondary'
                            }`}
                            key={mode.value}
                            type="button"
                            onClick={() =>
                              updateChannel(
                                values,
                                setField,
                                index,
                                getChannelPatch(mode.value),
                              )
                            }
                          >
                            <span
                              className={`block text-sm font-semibold ${
                                isSelected ? 'text-accent' : 'text-foreground'
                              }`}
                            >
                              {mode.label}
                            </span>

                            <span className="mt-1 block text-xs text-muted">
                              {mode.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </FormSection>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <ProductPreviewCard
            channelCount={values.channels.length}
            currency={values.currency}
            imageUrl={mainImageUrl}
            mediaCount={values.media.length}
            name={values.name}
            price={values.price}
            purchasableChannelCount={purchasableChannelCount}
            sku={values.sku}
            status={values.status}
            variantCount={values.variants.length}
            visibleChannelCount={visibleChannelCount}
          />

          {canAdjustStock && (
            <FormSection
              compact
              description={
                mode === 'create'
                  ? "Create the product's base stock. Variant stock can be set inside each variant."
                  : 'Apply a signed adjustment to base stock. Variant stock can be adjusted inside each variant.'
              }
              title="Inventory"
            >
              {mode === 'edit' && baseStock && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <MiniMetricCard
                    label="Base stock"
                    value={baseStock.totalStock}
                  />
                  <MiniMetricCard
                    label="Sellable"
                    value={baseStock.onlineSellableStock}
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {mode === 'create' ? (
                  <HeroTextInput
                    error={firstError(errors, 'initialStock')}
                    inputMode="numeric"
                    label="Initial stock"
                    name="initialStock"
                    placeholder="0"
                    value={values.initialStock}
                    onChange={(value) => setField('initialStock', value)}
                  />
                ) : (
                  <HeroTextInput
                    description="Use positive or negative value."
                    error={firstError(errors, 'stockAdjustment')}
                    inputMode="numeric"
                    label="Stock adjustment"
                    name="stockAdjustment"
                    placeholder="e.g. 10 or -2"
                    value={values.stockAdjustment}
                    onChange={(value) => setField('stockAdjustment', value)}
                  />
                )}

                <HeroTextInput
                  description="Reserve stock not available for online sale."
                  error={firstError(errors, 'safetyBuffer')}
                  inputMode="numeric"
                  label="Safety buffer"
                  name="safetyBuffer"
                  placeholder="0"
                  value={values.safetyBuffer}
                  onChange={(value) => setField('safetyBuffer', value)}
                />
              </div>

              <p className="mt-4 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-muted">
                The inventory API requires a non-zero stock adjustment when
                applying a safety buffer.
              </p>
            </FormSection>
          )}
        </aside>
      </div>

      {variantModal && (
        <VariantEditorModal
          canAdjustStock={canAdjustStock}
          errors={
            variantModal.index === null
              ? {}
              : variantErrorsFor(errors, variantModal.index)
          }
          mode={mode}
          modal={variantModal}
          onChange={updateVariantDraft}
          onClose={() => setVariantModal(null)}
          onSubmit={saveVariantDraft}
        />
      )}

      {mediaModal && (
        <MediaEditorModal
          error={
            mediaModal.index === null
              ? undefined
              : firstError(errors, `media.${mediaModal.index}.url`)
          }
          modal={mediaModal}
          onChange={updateMediaDraft}
          onClose={closeMediaModal}
          onSubmit={saveMediaDraft}
          onTypeChange={handleDraftMediaTypeChange}
          onUpload={handleDraftImageUpload}
        />
      )}

      {isDirty && (
        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-warning/30 bg-surface px-4 py-3 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">You have unsaved changes.</p>
            <p className="mt-1 text-xs text-muted">
              Save before leaving this page to avoid losing product changes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="rounded-xl border border-separator px-4 py-2 text-xs font-semibold hover:bg-surface-secondary"
              type="button"
              onPress={reset}
            >
              Reset
            </Button>
            <Button
              className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-60"
              isDisabled={saveMutation.isPending}
              type="submit"
            >
              Save changes
            </Button>
          </div>
        </div>
      )}
    </Form>
  );
}

function VariantTable({
  canAdjustStock,
  errors,
  mode,
  onAdd,
  onEdit,
  onRemove,
  variants,
}: {
  canAdjustStock: boolean;
  errors: FormErrors;
  mode: 'create' | 'edit';
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  variants: ProductFormDraftValues['variants'];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-separator bg-background">
      <Table variant="secondary">
        <Table.ScrollContainer className="max-h-[360px]">
          <Table.Content
            aria-label="Product variants"
            className="min-w-[860px] table-fixed text-left text-sm"
          >
            <Table.Header className="text-xs font-semibold text-muted">
              <Table.Column
                className="w-[210px] px-4 py-3 font-medium"
                id="variant"
                isRowHeader
              >
                Variant
              </Table.Column>
              <Table.Column
                className="w-[160px] px-4 py-3 font-medium"
                id="sku"
              >
                SKU
              </Table.Column>
              <Table.Column
                className="w-[130px] px-4 py-3 font-medium"
                id="price"
              >
                Price
              </Table.Column>
              <Table.Column
                className="w-[170px] px-4 py-3 font-medium"
                id="stock"
              >
                Stock
              </Table.Column>
              <Table.Column
                className="w-[120px] px-4 py-3 font-medium"
                id="status"
              >
                Status
              </Table.Column>
              <Table.Column
                className="w-[110px] px-4 py-3 text-right font-medium"
                id="actions"
              >
                Actions
              </Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <HeroEmptyState className="flex min-h-56 w-full flex-col items-center justify-center gap-4 px-6 text-center">
                  <Icon
                    className="size-6 text-muted"
                    icon="gravity-ui:layers"
                  />
                  <div>
                    <p className="text-sm font-medium">No variants added yet</p>
                    <p className="mt-1 text-xs text-muted">
                      The base SKU and price will be used until a variant is
                      added.
                    </p>
                  </div>
                </HeroEmptyState>
              )}
            >
              {variants.map((variant, index) => {
                const hasErrors = hasVariantErrors(errors, index);
                const stockValue = canAdjustStock
                  ? mode === 'create'
                    ? `${variant.initialStock || '0'} initial`
                    : variant.stockAdjustment
                      ? `${variant.stockAdjustment} adjustment`
                      : 'No adjustment'
                  : 'Not tracked';

                return (
                  <Table.Row
                    className="border-t border-separator first:border-0 hover:bg-surface-secondary/30"
                    id={variant.key}
                    key={variant.key}
                  >
                    <Table.Cell className="px-4 py-4">
                      <p className="truncate font-semibold">
                        {variant.name || `Variant ${index + 1}`}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {variant.attributes || '{}'}
                      </p>
                      {hasErrors && (
                        <p className="mt-2 text-xs font-medium text-danger">
                          Check required fields
                        </p>
                      )}
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <span className="truncate font-medium">
                        {variant.sku || 'Not set'}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4 font-semibold">
                      {variant.price || 'Not set'}
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <div>
                        <p className="font-medium">{stockValue}</p>
                        {canAdjustStock && (
                          <p className="mt-1 text-xs text-muted">
                            Buffer {variant.safetyBuffer || '0'}
                          </p>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <VariantStatusBadge status={variant.status} />
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <Tooltip delay={0}>
                          <Button
                            isIconOnly
                            size="sm"
                            type="button"
                            variant="tertiary"
                            onPress={() => onEdit(index)}
                          >
                            <Icon className="size-4" icon="gravity-ui:pencil" />
                          </Button>
                          <Tooltip.Content>
                            <p>Edit variant</p>
                          </Tooltip.Content>
                        </Tooltip>
                        <Tooltip delay={0}>
                          <Button
                            isIconOnly
                            size="sm"
                            type="button"
                            variant="danger"
                            onPress={() => onRemove(index)}
                          >
                            <Icon
                              className="size-4"
                              icon="gravity-ui:trash-bin"
                            />
                          </Button>
                          <Tooltip.Content>
                            <p>Remove variant</p>
                          </Tooltip.Content>
                        </Tooltip>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}

function ProductMediaTable({
  errors,
  media,
  onAdd,
  onEdit,
  onRemove,
}: {
  errors: FormErrors;
  media: ProductFormMedia[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-separator bg-background">
      <Table variant="secondary">
        <Table.ScrollContainer className="max-h-[360px]">
          <Table.Content
            aria-label="Product media"
            className="min-w-[760px] table-fixed text-left text-sm"
          >
            <Table.Header className="text-xs font-semibold text-muted">
              <Table.Column
                className="w-[260px] px-4 py-3 font-medium"
                id="media"
                isRowHeader
              >
                Media
              </Table.Column>
              <Table.Column
                className="w-[110px] px-4 py-3 font-medium"
                id="type"
              >
                Type
              </Table.Column>
              <Table.Column
                className="w-[270px] px-4 py-3 font-medium"
                id="source"
              >
                Source
              </Table.Column>
              <Table.Column
                className="w-[110px] px-4 py-3 text-right font-medium"
                id="actions"
              >
                Actions
              </Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <HeroEmptyState className="flex min-h-56 w-full flex-col items-center justify-center gap-4 px-6 text-center">
                  <Icon className="size-6 text-muted" icon="gravity-ui:image" />
                  <div>
                    <p className="text-sm font-medium">No media added yet</p>
                    <p className="mt-1 text-xs text-muted">
                      Add photos or video links for this product.
                    </p>
                  </div>
                </HeroEmptyState>
              )}
            >
              {media.map((item, index) => {
                const isImage = item.type === 'IMAGE';
                const previewUrl = item.previewUrl || item.url;
                const sourceLabel = item.fileName
                  ? `${item.fileName} (${formatFileSize(item.fileSize)})`
                  : item.url || 'Not set';

                return (
                  <Table.Row
                    className="border-t border-separator first:border-0 hover:bg-surface-secondary/30"
                    id={item.key}
                    key={item.key}
                  >
                    <Table.Cell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          aria-label={`Product media ${index + 1}`}
                          className="grid size-14 shrink-0 place-items-center rounded-xl bg-surface-secondary bg-cover bg-center text-muted"
                          role="img"
                          style={
                            isImage && previewUrl
                              ? { backgroundImage: `url("${previewUrl}")` }
                              : undefined
                          }
                        >
                          {(!isImage || !previewUrl) && (
                            <Icon
                              className="size-5"
                              icon={
                                isImage ? 'gravity-ui:image' : 'gravity-ui:play'
                              }
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            Media {index + 1}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted">
                            {isImage ? 'Photo upload or URL' : 'Video URL'}
                          </p>
                          {firstError(errors, `media.${index}.url`) && (
                            <p className="mt-2 text-xs font-medium text-danger">
                              Check media URL
                            </p>
                          )}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <MediaTypeBadge type={item.type} />
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <p className="truncate text-xs text-muted">
                        {sourceLabel}
                      </p>
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <Tooltip delay={0}>
                          <Button
                            isIconOnly
                            size="sm"
                            type="button"
                            variant="tertiary"
                            onPress={() => onEdit(index)}
                          >
                            <Icon className="size-4" icon="gravity-ui:pencil" />
                          </Button>
                          <Tooltip.Content>
                            <p>Edit media</p>
                          </Tooltip.Content>
                        </Tooltip>
                        <Tooltip delay={0}>
                          <Button
                            isIconOnly
                            size="sm"
                            type="button"
                            variant="danger"
                            onPress={() => onRemove(index)}
                          >
                            <Icon
                              className="size-4"
                              icon="gravity-ui:trash-bin"
                            />
                          </Button>
                          <Tooltip.Content>
                            <p>Remove media</p>
                          </Tooltip.Content>
                        </Tooltip>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}

function VariantEditorModal({
  canAdjustStock,
  errors,
  mode,
  modal,
  onChange,
  onClose,
  onSubmit,
}: {
  canAdjustStock: boolean;
  errors: Partial<
    Record<keyof ProductFormDraftValues['variants'][number], string>
  >;
  mode: 'create' | 'edit';
  modal: VariantModalState;
  onChange: <K extends keyof ProductFormDraftValues['variants'][number]>(
    field: K,
    value: ProductFormDraftValues['variants'][number][K],
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const variant = modal.value;

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
            <Modal.CloseTrigger className="absolute right-4 top-4 rounded-full border border-separator bg-surface p-2 text-muted transition hover:bg-surface-secondary hover:text-foreground" />
            <Modal.Header className="border-b border-separator px-5 py-5 sm:px-6">
              <div className="min-w-0 pr-10">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Product variant
                </p>
                <Modal.Heading className="mt-1 text-xl font-semibold tracking-tight">
                  {modal.mode === 'create' ? 'Add variant' : 'Edit variant'}
                </Modal.Heading>
                <p className="mt-2 text-sm leading-5 text-muted">
                  Manage the purchasable option, price, attributes, and stock
                  values.
                </p>
              </div>
            </Modal.Header>

            <Modal.Body className="max-h-[65dvh] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <HeroTextInput
                    error={errors.name}
                    label="Name"
                    name="variant-modal-name"
                    placeholder="Black / Medium"
                    value={variant.name}
                    onChange={(value) => onChange('name', value)}
                  />
                  <HeroTextInput
                    error={errors.sku}
                    label="SKU"
                    name="variant-modal-sku"
                    placeholder="SHIRT-BLK-M"
                    value={variant.sku}
                    onChange={(value) => onChange('sku', value)}
                  />
                  <HeroTextInput
                    error={errors.price}
                    inputMode="decimal"
                    label="Price override"
                    name="variant-modal-price"
                    placeholder="29.99"
                    value={variant.price}
                    onChange={(value) => onChange('price', value)}
                  />
                  <HeroSelectField<VariantStatus>
                    error={errors.status}
                    label="Status"
                    name="variant-modal-status"
                    options={VARIANT_STATUSES.map((status) => ({
                      label: toLabel(status),
                      value: status,
                    }))}
                    value={variant.status}
                    onChange={(value) => onChange('status', value)}
                  />
                </div>

                <HeroTextAreaInput
                  description='Enter JSON such as {"color":"Black","size":"M"}.'
                  error={errors.attributes}
                  label="Attributes JSON"
                  name="variant-modal-attributes"
                  value={variant.attributes}
                  onChange={(value) => onChange('attributes', value)}
                />

                {canAdjustStock && (
                  <div className="grid gap-4 rounded-2xl border border-separator bg-background p-4 sm:grid-cols-2">
                    {mode === 'create' ? (
                      <HeroTextInput
                        error={errors.initialStock}
                        inputMode="numeric"
                        label="Initial stock"
                        name="variant-modal-initial-stock"
                        placeholder="0"
                        value={variant.initialStock}
                        onChange={(value) => onChange('initialStock', value)}
                      />
                    ) : (
                      <HeroTextInput
                        description="Use positive or negative value."
                        error={errors.stockAdjustment}
                        inputMode="numeric"
                        label="Stock adjustment"
                        name="variant-modal-stock-adjustment"
                        placeholder="e.g. 10 or -2"
                        value={variant.stockAdjustment}
                        onChange={(value) => onChange('stockAdjustment', value)}
                      />
                    )}
                    <HeroTextInput
                      description="Reserve stock not available online."
                      error={errors.safetyBuffer}
                      inputMode="numeric"
                      label="Safety buffer"
                      name="variant-modal-safety-buffer"
                      placeholder="0"
                      value={variant.safetyBuffer}
                      onChange={(value) => onChange('safetyBuffer', value)}
                    />
                  </div>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="border-t border-separator bg-surface px-5 py-4 sm:px-6">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onPress={onClose}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onPress={onSubmit}>
                  {modal.mode === 'create' ? 'Add variant' : 'Save variant'}
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function MediaEditorModal({
  error,
  modal,
  onChange,
  onClose,
  onSubmit,
  onTypeChange,
  onUpload,
}: {
  error?: string;
  modal: MediaModalState;
  onChange: (patch: Partial<ProductFormMedia>) => void;
  onClose: () => void;
  onSubmit: () => void;
  onTypeChange: (type: ProductMediaType) => void;
  onUpload: (file?: File) => void;
}) {
  const media = modal.value;
  const isImage = media.type === 'IMAGE';
  const previewUrl = media.previewUrl || media.url;

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
            <Modal.CloseTrigger className="absolute right-4 top-4 rounded-full border border-separator bg-surface p-2 text-muted transition hover:bg-surface-secondary hover:text-foreground" />
            <Modal.Header className="border-b border-separator px-5 py-5 sm:px-6">
              <div className="min-w-0 pr-10">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Product media
                </p>
                <Modal.Heading className="mt-1 text-xl font-semibold tracking-tight">
                  {modal.mode === 'create' ? 'Add media' : 'Edit media'}
                </Modal.Heading>
                <p className="mt-2 text-sm leading-5 text-muted">
                  Add a product photo or attach a hosted video URL.
                </p>
              </div>
            </Modal.Header>

            <Modal.Body className="max-h-[65dvh] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div
                  aria-label="Media preview"
                  className="grid aspect-square place-items-center rounded-2xl bg-surface-secondary bg-cover bg-center text-muted"
                  role="img"
                  style={
                    isImage && previewUrl
                      ? { backgroundImage: `url("${previewUrl}")` }
                      : undefined
                  }
                >
                  {(!isImage || !previewUrl) && (
                    <Icon
                      className="size-8"
                      icon={isImage ? 'gravity-ui:image' : 'gravity-ui:play'}
                    />
                  )}
                </div>

                <div className="grid gap-4">
                  <HeroSelectField<'IMAGE' | 'VIDEO'>
                    label="Media type"
                    name="media-modal-type"
                    options={[
                      { label: 'Photo', value: 'IMAGE' },
                      { label: 'Video', value: 'VIDEO' },
                    ]}
                    value={media.type}
                    onChange={onTypeChange}
                  />

                  {isImage && (
                    <div className="rounded-2xl border border-dashed border-separator bg-background p-4">
                      <label className="flex cursor-pointer flex-col items-center justify-center text-center">
                        <Icon
                          className="size-5 text-muted"
                          icon="gravity-ui:arrow-up-from-line"
                        />
                        <span className="mt-2 text-sm font-semibold">
                          Upload photo
                        </span>
                        <span className="mt-1 text-xs text-muted">
                          JPG, PNG, or WEBP. Max {MAX_IMAGE_SIZE_MB} MB.
                        </span>
                        {media.fileName && (
                          <span className="mt-2 max-w-full truncate text-xs font-medium">
                            {media.fileName} ({formatFileSize(media.fileSize)})
                          </span>
                        )}
                        <input
                          accept={ACCEPTED_IMAGE_TYPES.join(',')}
                          className="sr-only"
                          type="file"
                          onChange={(event) => {
                            onUpload(event.target.files?.[0]);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                  )}

                  <HeroTextInput
                    description={
                      isImage
                        ? 'Paste a hosted image URL, or leave empty after uploading a photo.'
                        : 'Videos support hosted links only.'
                    }
                    error={error}
                    label={isImage ? 'Photo URL' : 'Video URL'}
                    name="media-modal-url"
                    placeholder={
                      isImage
                        ? 'https://cdn.example.com/product.jpg'
                        : 'https://youtube.com/watch?v=...'
                    }
                    value={media.url}
                    onChange={(value) => onChange({ url: value })}
                  />
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="border-t border-separator bg-surface px-5 py-4 sm:px-6">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onPress={onClose}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onPress={onSubmit}>
                  {modal.mode === 'create' ? 'Add media' : 'Save media'}
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function FormSection({
  action,
  children,
  compact = false,
  description,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
  description: string;
  title: string;
}) {
  return (
    <Fieldset
      className={`rounded-3xl border border-separator bg-surface shadow-sm ${
        compact ? 'p-5' : 'p-5 sm:p-6'
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Fieldset.Legend className="font-semibold">{title}</Fieldset.Legend>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </Fieldset>
  );
}

function HeroTextInput({
  className,
  description,
  error,
  label,
  name,
  onChange,
  required,
  value,
  ...props
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'required'
> & {
  className?: string;
  description?: string;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <TextField
      className={`${fieldClassName} ${className ?? ''}`}
      isInvalid={Boolean(error)}
      isRequired={required}
      name={name}
      value={String(value ?? '')}
      onChange={onChange}
    >
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <Input {...props} className={inputClassName} required={required} />
      {description && (
        <Description className="mt-1 block text-xs text-muted">
          {description}
        </Description>
      )}
      {error && (
        <FieldError className="mt-1 text-xs text-danger">{error}</FieldError>
      )}
    </TextField>
  );
}

function HeroTextAreaInput({
  className,
  description,
  error,
  label,
  onChange,
  required,
  value,
  ...props
}: Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange' | 'required'
> & {
  className?: string;
  description?: string;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <TextField
      className={`${fieldClassName} ${className ?? ''}`}
      isInvalid={Boolean(error)}
      isRequired={required}
      name={props.name}
      value={String(value ?? '')}
      onChange={onChange}
    >
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <TextArea
        {...props}
        className={textAreaClassName}
        required={required}
        value={String(value ?? '')}
      />
      {description && (
        <Description className="mt-1 block text-xs text-muted">
          {description}
        </Description>
      )}
      {error && (
        <FieldError className="mt-1 text-xs text-danger">{error}</FieldError>
      )}
    </TextField>
  );
}

function HeroSelectField<T extends string>({
  className,
  description,
  error,
  label,
  name,
  onChange,
  options,
  required,
  value,
}: {
  className?: string;
  description?: string;
  error?: string;
  label: string;
  name: string;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  required?: boolean;
  value: T;
}) {
  return (
    <Select
      className={`${fieldClassName} ${className ?? ''}`}
      isInvalid={Boolean(error)}
      isRequired={required}
      name={name}
      value={value}
      onChange={(nextValue) => {
        if (typeof nextValue === 'string') {
          onChange(nextValue as T);
        }
      }}
    >
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <Select.Trigger className={selectTriggerClassName}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      {description && (
        <Description className="mt-1 block text-xs text-muted">
          {description}
        </Description>
      )}
      {error && (
        <FieldError className="mt-1 text-xs text-danger">{error}</FieldError>
      )}
      <Select.Popover className={selectPopoverClassName}>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              className="rounded-lg px-3 py-2 text-sm outline-none transition hover:bg-surface-secondary data-[focused=true]:bg-surface-secondary"
              id={option.value}
              key={option.value}
              textValue={option.label}
            >
              <span>{option.label}</span>
              <ListBox.ItemIndicator className="text-accent" />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function ProductPreviewCard({
  channelCount,
  currency,
  imageUrl,
  mediaCount,
  name,
  price,
  purchasableChannelCount,
  sku,
  status,
  variantCount,
  visibleChannelCount,
}: {
  channelCount: number;
  currency: string;
  imageUrl?: string;
  mediaCount: number;
  name: string;
  price: string;
  purchasableChannelCount: number;
  sku: string;
  status: ProductStatus;
  variantCount: number;
  visibleChannelCount: number;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-separator bg-surface shadow-sm">
      <div
        className="grid aspect-[16/9] place-items-center bg-surface-secondary bg-cover bg-center text-sm font-semibold text-muted"
        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
      >
        {!imageUrl && 'Product preview'}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              {name || 'Untitled product'}
            </h3>
            <p className="mt-1 truncate text-xs text-muted">
              {sku || 'SKU not set'}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <p className="text-2xl font-semibold tracking-tight">
          {price ? `${price} ${currency || 'USD'}` : 'No price'}
        </p>

        <div className="grid grid-cols-3 gap-3">
          <MiniMetricCard label="Variants" value={variantCount} />
          <MiniMetricCard label="Media" value={mediaCount} />
          <MiniMetricCard
            label="Selling"
            value={`${purchasableChannelCount}/${channelCount}`}
          />
        </div>

        <div className="rounded-2xl border border-separator bg-background p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium">Publish readiness</span>
            <span className="text-muted">
              {visibleChannelCount}/{channelCount} visible
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: `${channelCount ? (visibleChannelCount / channelCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const className =
    status === 'ACTIVE'
      ? 'bg-success/10 text-success'
      : status === 'DRAFT'
        ? 'bg-warning/10 text-warning'
        : 'bg-surface-secondary text-muted';

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {toLabel(status)}
    </span>
  );
}

function VariantStatusBadge({ status }: { status: VariantStatus }) {
  const className =
    status === 'ACTIVE'
      ? 'bg-success/10 text-success'
      : 'bg-surface-secondary text-muted';

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {toLabel(status)}
    </span>
  );
}

function MediaTypeBadge({ type }: { type: ProductMediaType }) {
  const className =
    type === 'IMAGE'
      ? 'bg-accent/10 text-accent'
      : 'bg-warning/10 text-warning';

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {type === 'IMAGE' ? 'Photo' : 'Video'}
    </span>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-separator px-5 py-3 sm:border-t-0 sm:border-l first:sm:border-l-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function MiniMetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-separator bg-background p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ProductFormLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-36 rounded-3xl bg-surface-secondary" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-5">
          <div className="h-80 rounded-3xl bg-surface-secondary" />
          <div className="h-56 rounded-3xl bg-surface-secondary" />
        </div>
        <div className="space-y-5">
          <div className="h-72 rounded-3xl bg-surface-secondary" />
          <div className="h-64 rounded-3xl bg-surface-secondary" />
        </div>
      </div>
    </div>
  );
}

function PermissionNotice({ action }: { action: string }) {
  return (
    <div className="rounded-3xl border border-warning/30 bg-warning/10 p-6 text-sm">
      You do not have permission to {action}.
    </div>
  );
}

function LoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div className="rounded-3xl border border-separator bg-surface p-8 shadow-sm">
        <h2 className="text-xl font-semibold">Product is unavailable</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <Button
          className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          type="button"
          onPress={onRetry}
        >
          Try again
        </Button>
      </div>
    </div>
  );
}

function toInitialValues(
  product?: Product,
  inventory?: ProductInventoryDetail,
): ProductFormDraftValues {
  const baseStock = inventory?.stocks.find((stock) => stock.variantId === null);

  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    sku: product?.sku ?? '',
    price: product?.price ?? '',
    currency: product?.currency ?? 'USD',
    status: product?.status ?? 'DRAFT',
    categoryId: product?.categoryId ?? product?.category?.id ?? '',
    variants:
      product?.variants?.map((variant) => {
        const variantStock = inventory?.stocks.find(
          (stock) => stock.variantId === variant.id,
        );

        return {
          key: variant.id,
          sku: variant.sku,
          name: variant.name,
          price: variant.price,
          attributes: JSON.stringify(variant.attributes),
          status: variant.status,
          initialStock: '0',
          safetyBuffer: String(variantStock?.safetyBuffer ?? 0),
          stockAdjustment: '',
        };
      }) ?? [],
    media:
      product?.media?.map((item) => ({
        key: item.id,
        type: item.type,
        url: item.url,
      })) ?? [],
    channels: SALES_CHANNELS.map((channel) => {
      const saved = product?.channelVisibility?.find(
        (item) => item.channel === channel,
      );

      return {
        channel,
        isVisible: saved?.isVisible ?? false,
        isPurchasable: saved?.isPurchasable ?? false,
      };
    }),
    initialStock: '0',
    safetyBuffer: String(baseStock?.safetyBuffer ?? 0),
    stockAdjustment: '',
  };
}

async function toPayload(
  values: ProductFormDraftValues,
  mode: 'create' | 'edit',
  canAdjustStock: boolean,
): Promise<ProductPayload> {
  const media = await normalizeMediaBeforeSubmit(values.media);
  const inventory =
    mode === 'create' && canAdjustStock
      ? buildInitialInventory(values)
      : undefined;

  return {
    name: values.name.trim(),
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    description: values.description.trim(),
    sku: values.sku.trim(),
    price: values.price.trim(),
    currency: values.currency.trim().toUpperCase(),
    status: values.status,
    categoryId: values.categoryId.trim() || null,
    variants: values.variants.map((variant) => ({
      sku: variant.sku.trim(),
      name: variant.name.trim(),
      price: variant.price.trim(),
      attributes: JSON.parse(variant.attributes || '{}') as Record<
        string,
        unknown
      >,
      status: variant.status,
    })),
    media,
    channelVisibility: values.channels,
    ...(inventory?.length ? { inventory } : {}),
  };
}

function buildInitialInventory(
  values: ProductFormDraftValues,
): NonNullable<ProductPayload['inventory']> {
  const inventory: NonNullable<ProductPayload['inventory']> = [];
  const baseInitialStock = Number(values.initialStock || 0);
  const baseSafetyBuffer = Number(values.safetyBuffer || 0);

  if (baseInitialStock > 0 || baseSafetyBuffer > 0) {
    inventory.push({
      initialStock: baseInitialStock,
      safetyBuffer: baseSafetyBuffer,
    });
  }

  values.variants.forEach((variant) => {
    const initialStock = Number(variant.initialStock || 0);
    const safetyBuffer = Number(variant.safetyBuffer || 0);

    if (initialStock === 0 && safetyBuffer === 0) return;

    inventory.push({
      variantSku: variant.sku.trim(),
      initialStock,
      safetyBuffer,
    });
  });

  return inventory;
}

function toValidationValues(values: ProductFormDraftValues): ProductFormValues {
  return {
    ...values,
    media: values.media
      .filter((media) => media.url.trim() || media.file)
      .map((media) => ({
        key: media.key,
        type: media.type,
        url:
          media.url.trim() ||
          'https://placeholder.local/product-image-upload.jpg',
      })),
  };
}

function validateStockChanges({
  formValues,
  initialValues,
  mode,
}: {
  formValues: ProductFormValues;
  initialValues: ProductFormDraftValues;
  mode: 'create' | 'edit';
}) {
  const errors: FormErrors = {};
  const baseQuantityDelta =
    mode === 'create'
      ? Number(formValues.initialStock || 0)
      : Number(formValues.stockAdjustment || 0);
  const baseSafetyChanged =
    formValues.safetyBuffer !== initialValues.safetyBuffer;

  if (
    baseQuantityDelta === 0 &&
    ((mode === 'create' && Number(formValues.safetyBuffer) > 0) ||
      (mode === 'edit' && baseSafetyChanged))
  ) {
    errors.safetyBuffer = [
      'A non-zero stock change is required to apply this safety buffer',
    ];
  }

  formValues.variants.forEach((variant, index) => {
    const quantityDelta =
      mode === 'create'
        ? Number(variant.initialStock || 0)
        : Number(variant.stockAdjustment || 0);
    const initialVariant = initialValues.variants.find(
      (item) => item.key === variant.key,
    );
    const safetyChanged =
      variant.safetyBuffer !== (initialVariant?.safetyBuffer ?? '0');

    if (
      quantityDelta === 0 &&
      ((mode === 'create' && Number(variant.safetyBuffer) > 0) ||
        (mode === 'edit' && safetyChanged))
    ) {
      errors[`variants.${index}.safetyBuffer`] = [
        'A non-zero stock change is required to apply this safety buffer',
      ];
    }
  });

  return errors;
}

function buildStockAdjustments({
  formValues,
  mode,
  savedProduct,
}: {
  formValues: ProductFormDraftValues;
  mode: 'create' | 'edit';
  savedProduct: Product;
}) {
  const adjustments: StockAdjustmentDraft[] = [];
  const baseQuantityDelta =
    mode === 'create'
      ? Number(formValues.initialStock || 0)
      : Number(formValues.stockAdjustment || 0);

  if (baseQuantityDelta !== 0) {
    adjustments.push({
      productId: savedProduct.id,
      quantityDelta: baseQuantityDelta,
      safetyBuffer: Number(formValues.safetyBuffer || 0),
    });
  }

  const savedVariantBySku = new Map(
    savedProduct.variants?.map((variant) => [
      normalizeSku(variant.sku),
      variant,
    ]) ?? [],
  );

  formValues.variants.forEach((variant) => {
    const quantityDelta =
      mode === 'create'
        ? Number(variant.initialStock || 0)
        : Number(variant.stockAdjustment || 0);
    const savedVariant = savedVariantBySku.get(normalizeSku(variant.sku));

    if (quantityDelta === 0 || !savedVariant) return;

    adjustments.push({
      productId: savedProduct.id,
      variantId: savedVariant.id,
      quantityDelta,
      safetyBuffer: Number(variant.safetyBuffer || 0),
    });
  });

  return adjustments;
}

async function normalizeMediaBeforeSubmit(
  mediaItems: ProductFormMedia[],
): Promise<ProductPayload['media']> {
  const media = await Promise.all(
    mediaItems.map(async (item, index) => {
      let url = item.url.trim();

      if (item.type === 'IMAGE' && item.file && !url) {
        const uploaded = await uploadProductImage(item.file);
        url = uploaded.url;
      }

      if (!url) return null;

      return {
        url,
        type: item.type,
        sortOrder: index,
      };
    }),
  );

  return media.filter((item): item is ProductPayload['media'][number] =>
    Boolean(item),
  );
}

async function uploadProductImage(file: File): Promise<{ url: string }> {
  const uploaded = await uploadMerchantFile(file, {
    purpose: 'product-media',
    visibility: 'public',
  });
  return { url: uploaded.url };
}

function emptyVariant(index: number) {
  return {
    key: uniqueKey(`variant-${index}`),
    sku: '',
    name: '',
    price: '',
    attributes: '{}',
    status: 'ACTIVE' as const,
    initialStock: '0',
    safetyBuffer: '0',
    stockAdjustment: '',
  };
}

function emptyMedia(): ProductFormMedia {
  return {
    key: uniqueKey('media'),
    type: 'IMAGE',
    url: '',
  };
}

function updateChannel(
  values: ProductFormDraftValues,
  setField: <T extends keyof ProductFormDraftValues>(
    field: T,
    value: ProductFormDraftValues[T],
  ) => void,
  index: number,
  patch: Partial<ProductFormDraftValues['channels'][number]>,
) {
  const channels = [...values.channels];
  channels[index] = { ...channels[index], ...patch };
  setField('channels', channels);
}

function firstError(errors: FormErrors, field: string) {
  return errors[field]?.[0];
}

function variantErrorsFor(errors: FormErrors, index: number) {
  return {
    attributes: firstError(errors, `variants.${index}.attributes`),
    initialStock: firstError(errors, `variants.${index}.initialStock`),
    name: firstError(errors, `variants.${index}.name`),
    price: firstError(errors, `variants.${index}.price`),
    safetyBuffer: firstError(errors, `variants.${index}.safetyBuffer`),
    sku: firstError(errors, `variants.${index}.sku`),
    status: firstError(errors, `variants.${index}.status`),
    stockAdjustment: firstError(errors, `variants.${index}.stockAdjustment`),
  };
}

function hasVariantErrors(errors: FormErrors, index: number) {
  return Object.values(variantErrorsFor(errors, index)).some(Boolean);
}

function uniqueKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeSku(value: string) {
  return value.trim().toUpperCase();
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
}
