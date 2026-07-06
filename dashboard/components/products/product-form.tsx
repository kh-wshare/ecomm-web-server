"use client";

import {
  Button,
  Checkbox,
  Description,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { usePermissions } from "@/hooks/use-permissions";
import {
  adjustProductStock,
  createProduct,
  getProduct,
  getProductInventory,
  updateProduct,
} from "@/lib/products/product-data";
import { queryKeys } from "@/lib/query/keys";
import { notify } from "@/lib/toast/notify";
import { validateForm } from "@/lib/validation/form";
import { productFormSchema } from "@/lib/validation/product";
import type {
  Product,
  ProductFormValues,
  ProductInventoryDetail,
  ProductPayload,
  ProductStatus,
  VariantStatus,
} from "@/types/product";
import {
  PRODUCT_STATUSES,
  SALES_CHANNELS,
  VARIANT_STATUSES,
} from "@/types/product";

type FormErrors = Record<string, string[]>;

type SelectOption<T extends string = string> = {
  label: string;
  value: T;
};

const fieldClassName = "w-full";
const inputClassName =
  "min-h-11 rounded-xl border border-separator bg-background px-3 text-sm outline-none transition hover:border-accent/60 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/15 data-[invalid=true]:border-danger";
const textAreaClassName =
  "min-h-32 w-full resize-y rounded-xl border border-separator bg-background p-3 text-sm outline-none transition hover:border-accent/60 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/15 data-[invalid=true]:border-danger";
const selectTriggerClassName =
  "min-h-11 rounded-xl border border-separator bg-background px-3 text-sm transition hover:border-accent/60 data-[focus-visible=true]:border-accent data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-accent/15 data-[invalid=true]:border-danger";
const selectPopoverClassName =
  "rounded-xl border border-separator bg-surface p-1 shadow-xl";

export function NewProductForm() {
  const { can } = usePermissions();

  if (!can("product.create")) {
    return <PermissionNotice action="create products" />;
  }

  return <ProductForm mode="create" />;
}

export function EditProductForm({ productId }: { productId: string }) {
  const { can } = usePermissions();
  const canUpdate = can("product.update");
  const canReadInventory = can("inventory.read");

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
  mode: "create" | "edit";
  product?: Product;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canAdjustStock = can("inventory.adjust");

  const initialValues = useMemo(
    () => toInitialValues(product, inventory),
    [inventory, product],
  );

  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const visibleChannelCount = values.channels.filter(
    (item) => item.isVisible,
  ).length;
  const purchasableChannelCount = values.channels.filter(
    (item) => item.isPurchasable,
  ).length;
  const mainImage = values.media.find(
    (item) => item.type === "IMAGE" && item.url.trim(),
  );

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  useEffect(() => {
    if (!isDirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: async (formValues: ProductFormValues) => {
      const payload = toPayload(formValues);
      const savedProduct =
        mode === "create"
          ? await createProduct(payload)
          : await updateProduct(product!.id, payload);

      const quantityDelta =
        mode === "create"
          ? Number(formValues.initialStock || 0)
          : Number(formValues.stockAdjustment || 0);

      if (canAdjustStock && quantityDelta !== 0) {
        await adjustProductStock(
          savedProduct.id,
          quantityDelta,
          Number(formValues.safetyBuffer || 0),
        );
      }

      return savedProduct;
    },
    onSuccess: async (savedProduct) => {
      notify.success(
        mode === "create" ? "Product created" : "Product updated",
        `${savedProduct.name} is saved.`,
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ]);

      router.push(`/dashboard/products/${savedProduct.id}`);
    },
    onError: (error) => notify.error(error, "Unable to save product"),
  });

  const setField = <K extends keyof ProductFormValues>(
    field: K,
    value: ProductFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];

      return next;
    });
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = validateForm(productFormSchema, values);

    if (!result.success) {
      setErrors(result.errors);
      notify.warning("Check the highlighted product fields");

      return;
    }

    const quantityDelta =
      mode === "create"
        ? Number(result.data.initialStock || 0)
        : Number(result.data.stockAdjustment || 0);
    const safetyChanged =
      result.data.safetyBuffer !== initialValues.safetyBuffer;

    if (
      canAdjustStock &&
      quantityDelta === 0 &&
      ((mode === "create" && Number(result.data.safetyBuffer) > 0) ||
        (mode === "edit" && safetyChanged))
    ) {
      setErrors({
        safetyBuffer: [
          "A non-zero stock change is required to apply this safety buffer",
        ],
      });
      notify.warning("Add a stock quantity to apply the safety buffer");

      return;
    }

    saveMutation.mutate(result.data);
  };

  return (
    <Form className="space-y-6" onSubmit={submit}>
      <header className="overflow-hidden rounded-3xl border border-separator bg-surface shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="min-w-0">
            <Link
              className="text-sm font-medium text-accent hover:underline"
              href={
                product
                  ? `/dashboard/products/${product.id}`
                  : "/dashboard/products"
              }
            >
              ← Products
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {mode === "create" ? "Create product" : `Edit ${product?.name}`}
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
              className="inline-flex h-11 items-center justify-center rounded-xl border border-separator px-4 text-sm font-semibold transition hover:bg-surface-secondary"
              href={
                product
                  ? `/dashboard/products/${product.id}`
                  : "/dashboard/products"
              }
            >
              Cancel
            </Link>
            <Button
              className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
              isDisabled={saveMutation.isPending}
              type="submit"
            >
              {saveMutation.isPending
                ? "Saving…"
                : mode === "create"
                  ? "Create product"
                  : "Save changes"}
            </Button>
          </div>
        </div>

        <div className="grid border-t border-separator bg-background/40 sm:grid-cols-4">
          <HeaderMetric label="SKU" value={values.sku || "Not set"} />
          <HeaderMetric
            label="Price"
            value={values.price ? `${values.price} ${values.currency}` : "Not set"}
          />
          <HeaderMetric label="Variants" value={String(values.variants.length)} />
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
                error={firstError(errors, "name")}
                label="Product name"
                maxLength={160}
                name="name"
                placeholder="Classic T-Shirt"
                required
                value={values.name}
                onChange={(value) => setField("name", value)}
              />

              <HeroTextInput
                description="Leave empty to let the backend generate one."
                error={firstError(errors, "slug")}
                label="URL slug"
                maxLength={180}
                name="slug"
                placeholder="classic-t-shirt"
                value={values.slug}
                onChange={(value) => setField("slug", value)}
              />

              <HeroTextInput
                error={firstError(errors, "sku")}
                label="SKU"
                maxLength={80}
                name="sku"
                placeholder="SHIRT-001"
                required
                value={values.sku}
                onChange={(value) => setField("sku", value)}
              />

              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                <HeroTextInput
                  error={firstError(errors, "price")}
                  inputMode="decimal"
                  label="Price"
                  name="price"
                  placeholder="29.99"
                  required
                  value={values.price}
                  onChange={(value) => setField("price", value)}
                />
                <HeroTextInput
                  error={firstError(errors, "currency")}
                  label="Currency"
                  maxLength={3}
                  name="currency"
                  placeholder="USD"
                  required
                  value={values.currency}
                  onChange={(value) => setField("currency", value.toUpperCase())}
                />
              </div>

              <HeroSelectField<ProductStatus>
                error={firstError(errors, "status")}
                label="Status"
                name="status"
                options={PRODUCT_STATUSES.map((status) => ({
                  label: toLabel(status),
                  value: status,
                }))}
                required
                value={values.status}
                onChange={(value) => setField("status", value)}
              />

              <HeroTextAreaInput
                className="sm:col-span-2"
                description={`${values.description.length}/10000 characters`}
                error={firstError(errors, "description")}
                label="Description"
                maxLength={10000}
                name="description"
                placeholder="Describe the product, materials, fit, or important details."
                value={values.description}
                onChange={(value) => setField("description", value)}
              />
            </Fieldset.Group>
          </FormSection>

          <FormSection
            action={
              <Button
                className="rounded-xl border border-separator px-3 py-2 text-xs font-semibold transition hover:bg-surface-secondary"
                type="button"
                onPress={() =>
                  setField("variants", [
                    ...values.variants,
                    emptyVariant(values.variants.length),
                  ])
                }
              >
                Add variant
              </Button>
            }
            description="Optional purchasable options. Updating variants replaces the saved set."
            title="Variants"
          >
            {values.variants.length ? (
              <div className="space-y-4">
                {values.variants.map((variant, index) => (
                  <div
                    className="rounded-2xl border border-separator bg-background p-4 transition hover:border-accent/30"
                    key={variant.key}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Variant {index + 1}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Add SKU, optional price override, and attributes.
                        </p>
                      </div>
                      <Button
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
                        type="button"
                        onPress={() =>
                          setField(
                            "variants",
                            values.variants.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <HeroTextInput
                        error={firstError(errors, `variants.${index}.name`)}
                        label="Name"
                        name={`variant-${index}-name`}
                        placeholder="Black / Medium"
                        value={variant.name}
                        onChange={(value) =>
                          updateVariant(values, setField, index, "name", value)
                        }
                      />

                      <HeroTextInput
                        error={firstError(errors, `variants.${index}.sku`)}
                        label="SKU"
                        name={`variant-${index}-sku`}
                        placeholder="SHIRT-BLK-M"
                        value={variant.sku}
                        onChange={(value) =>
                          updateVariant(values, setField, index, "sku", value)
                        }
                      />

                      <HeroTextInput
                        error={firstError(errors, `variants.${index}.price`)}
                        inputMode="decimal"
                        label="Price override"
                        name={`variant-${index}-price`}
                        placeholder={values.price || "29.99"}
                        value={variant.price}
                        onChange={(value) =>
                          updateVariant(values, setField, index, "price", value)
                        }
                      />

                      <HeroSelectField<VariantStatus>
                        error={firstError(errors, `variants.${index}.status`)}
                        label="Status"
                        name={`variant-${index}-status`}
                        options={VARIANT_STATUSES.map((status) => ({
                          label: toLabel(status),
                          value: status,
                        }))}
                        value={variant.status}
                        onChange={(value) =>
                          updateVariant(values, setField, index, "status", value)
                        }
                      />

                      <HeroTextAreaInput
                        className="sm:col-span-2"
                        description="Must be valid JSON, for example"
                        error={firstError(errors, `variants.${index}.attributes`)}
                        label="Attributes JSON"
                        name={`variant-${index}-attributes`}

                        value={variant.attributes}
                        onChange={(value) => updateVariant(values, setField, index, "attributes", value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection
                actionLabel="Add first variant"
                message="This product has no variants. Its base SKU and price will be used."
                onAction={() =>
                  setField("variants", [emptyVariant(values.variants.length)])
                }
              />
            )}
          </FormSection>

          <FormSection
            action={
              <Button
                className="rounded-xl border border-separator px-3 py-2 text-xs font-semibold transition hover:bg-surface-secondary"
                type="button"
                onPress={() =>
                  setField("media", [
                    ...values.media,
                    { key: uniqueKey("media"), type: "IMAGE", url: "" },
                  ])
                }
              >
                Add image
              </Button>
            }
            description="Add hosted image URLs. Binary upload is unavailable until a media storage endpoint is added."
            title="Product media"
          >
            {values.media.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {values.media.map((media, index) => (
                  <div
                    className="rounded-2xl border border-separator bg-background p-3 transition hover:border-accent/30"
                    key={media.key}
                  >
                    <div className="flex gap-3">
                      <div
                        aria-label={
                          media.url && media.type === "IMAGE"
                            ? `Preview image ${index + 1}`
                            : "Media preview"
                        }
                        className="grid size-20 shrink-0 place-items-center rounded-xl bg-surface-secondary bg-cover bg-center text-[10px] font-semibold uppercase tracking-wide text-muted"
                        role="img"
                        style={
                          media.url && media.type === "IMAGE"
                            ? { backgroundImage: `url("${media.url}")` }
                            : undefined
                        }
                      >
                        {media.url ? null : media.type}
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-2">
                          <HeroSelectField<"IMAGE" | "VIDEO">
                            label="Type"
                            name={`media-${index}-type`}
                            options={[
                              { label: "Image", value: "IMAGE" },
                              { label: "Video", value: "VIDEO" },
                            ]}
                            value={media.type}
                            onChange={(value) => {
                              const mediaItems = [...values.media];
                              mediaItems[index] = {
                                ...mediaItems[index],
                                type: value,
                              };
                              setField("media", mediaItems);
                            }}
                          />

                          <HeroTextInput
                            error={firstError(errors, `media.${index}.url`)}
                            label={`URL ${index + 1}`}
                            name={`media-${index}-url`}
                            placeholder="https://cdn.example.com/product.jpg"
                            value={media.url}
                            onChange={(value) => {
                              const mediaItems = [...values.media];
                              mediaItems[index] = {
                                ...mediaItems[index],
                                url: value,
                              };
                              setField("media", mediaItems);
                            }}
                          />
                        </div>

                        <Button
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
                          type="button"
                          onPress={() =>
                            setField(
                              "media",
                              values.media.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                        >
                          Remove media
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection
                actionLabel="Add image URL"
                message="No media added. Add a hosted image URL to show product media."
                onAction={() =>
                  setField("media", [
                    { key: uniqueKey("media"), type: "IMAGE", url: "" },
                  ])
                }
              />
            )}
          </FormSection>
          <FormSection
            compact
            description="Choose where the product is visible and available to purchase."
            title="Channel visibility"
          >
            <div className="space-y-3">
              {values.channels.map((item, index) => {
                const state = item.isPurchasable
                  ? "Selling"
                  : item.isVisible
                    ? "Visible"
                    : "Off";

                return (
                  <div
                    className="rounded-2xl border border-separator bg-background p-4 transition hover:border-accent/30"
                    key={item.channel}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {toLabel(item.channel)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Control if customers can see and buy from this
                          channel.
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${state === "Selling"
                            ? "bg-success/10 text-success"
                            : state === "Visible"
                              ? "bg-warning/10 text-warning"
                              : "bg-surface-secondary text-muted"
                          }`}
                      >
                        {state}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <HeroCheckBox
                        checked={item.isVisible}
                        description="Show product"
                        label="Visible"
                        onChange={(checked) =>
                          updateChannel(values, setField, index, {
                            isVisible: checked,
                            isPurchasable: checked
                              ? item.isPurchasable
                              : false,
                          })
                        }
                      />

                      <HeroCheckBox
                        checked={item.isPurchasable}
                        description="Allow checkout"
                        label="Purchasable"
                        onChange={(checked) =>
                          updateChannel(values, setField, index, {
                            isPurchasable: checked,
                            isVisible: checked ? true : item.isVisible,
                          })
                        }
                      />
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
            imageUrl={mainImage?.url}
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
                mode === "create"
                  ? "Create the product's base inventory record with starting stock."
                  : "Apply a signed adjustment to base stock. Variant inventory is managed from Inventory."
              }
              title="Inventory"
            >
              {mode === "edit" && inventory?.stocks[0] && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <MiniMetricCard
                    label="Base stock"
                    value={inventory.stocks[0].totalStock}
                  />
                  <MiniMetricCard
                    label="Sellable"
                    value={inventory.stocks[0].onlineSellableStock}
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {mode === "create" ? (
                  <HeroTextInput
                    error={firstError(errors, "initialStock")}
                    inputMode="numeric"
                    label="Initial stock"
                    name="initialStock"
                    placeholder="0"
                    value={values.initialStock}
                    onChange={(value) => setField("initialStock", value)}
                  />
                ) : (
                  <HeroTextInput
                    description="Use positive or negative value."
                    error={firstError(errors, "stockAdjustment")}
                    inputMode="numeric"
                    label="Stock adjustment"
                    name="stockAdjustment"
                    placeholder="e.g. 10 or -2"
                    value={values.stockAdjustment}
                    onChange={(value) => setField("stockAdjustment", value)}
                  />
                )}

                <HeroTextInput
                  description="Reserve stock not available for online sale."
                  error={firstError(errors, "safetyBuffer")}
                  inputMode="numeric"
                  label="Safety buffer"
                  name="safetyBuffer"
                  placeholder="0"
                  value={values.safetyBuffer}
                  onChange={(value) => setField("safetyBuffer", value)}
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
      className={`rounded-3xl border border-separator bg-surface shadow-sm ${compact ? "p-5" : "p-5 sm:p-6"
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
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "required"> & {
  className?: string;
  description?: string;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <TextField
      className={`${fieldClassName} ${className ?? ""}`}
      isInvalid={Boolean(error)}
      isRequired={required}
      name={name}
      value={String(value ?? "")}
      onChange={onChange}
    >
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <Input {...props} className={inputClassName} required={required} />
      {description && (
        <Description className="mt-1 block text-xs text-muted">
          {description}
        </Description>
      )}
      {error && <FieldError className="mt-1 text-xs text-danger">{error}</FieldError>}
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
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "required"> & {
  className?: string;
  description?: string;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <TextField
      className={`${fieldClassName} ${className ?? ""}`}
      isInvalid={Boolean(error)}
      isRequired={required}
      name={props.name}
      value={String(value ?? "")}
      onChange={onChange}
    >
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <TextArea
        {...props}
        className={textAreaClassName}
        required={required}
        value={String(value ?? "")}
      />
      {description && (
        <Description className="mt-1 block text-xs text-muted">
          {description}
        </Description>
      )}
      {error && <FieldError className="mt-1 text-xs text-danger">{error}</FieldError>}
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
      className={`${fieldClassName} ${className ?? ""}`}
      isInvalid={Boolean(error)}
      isRequired={required}
      name={name}
      value={value}
      onChange={(nextValue) => {
        if (typeof nextValue === "string") {
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
      {error && <FieldError className="mt-1 text-xs text-danger">{error}</FieldError>}
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

function HeroCheckBox({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description?: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox isSelected={checked} variant="secondary" onChange={onChange}>
      <Checkbox.Content className="items-start gap-3 rounded-xl border border-separator bg-surface px-3 py-2 transition hover:border-accent/40 hover:bg-surface-secondary/70">
        <Checkbox.Control className="mt-0.5 size-4 rounded border border-separator bg-background data-[selected=true]:border-accent data-[selected=true]:bg-accent">
          <Checkbox.Indicator className="text-accent-foreground" />
        </Checkbox.Control>
        <span>
          <span className="block text-xs font-semibold text-foreground">
            {label}
          </span>
          {description && (
            <span className="mt-0.5 block text-[11px] text-muted">
              {description}
            </span>
          )}
        </span>
      </Checkbox.Content>
    </Checkbox>
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
        {!imageUrl && "Product preview"}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              {name || "Untitled product"}
            </h3>
            <p className="mt-1 truncate text-xs text-muted">
              {sku || "SKU not set"}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <p className="text-2xl font-semibold tracking-tight">
          {price ? `${price} ${currency || "USD"}` : "No price"}
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
    status === "ACTIVE"
      ? "bg-success/10 text-success"
      : status === "DRAFT"
        ? "bg-warning/10 text-warning"
        : "bg-surface-secondary text-muted";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {toLabel(status)}
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

function MiniMetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-separator bg-background p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function EmptySection({
  actionLabel,
  message,
  onAction,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-separator bg-background px-4 py-8 text-center">
      <p className="text-sm text-muted">{message}</p>
      {actionLabel && onAction && (
        <Button
          className="mt-4 rounded-xl border border-separator px-3 py-2 text-xs font-semibold hover:bg-surface-secondary"
          type="button"
          onPress={onAction}
        >
          {actionLabel}
        </Button>
      )}
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
): ProductFormValues {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    sku: product?.sku ?? "",
    price: product?.price ?? "",
    currency: product?.currency ?? "USD",
    status: product?.status ?? "DRAFT",
    variants:
      product?.variants?.map((variant) => ({
        key: variant.id,
        sku: variant.sku,
        name: variant.name,
        price: variant.price,
        attributes: JSON.stringify(variant.attributes),
        status: variant.status,
      })) ?? [],
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
    initialStock: "0",
    safetyBuffer: String(inventory?.stocks[0]?.safetyBuffer ?? 0),
    stockAdjustment: "",
  };
}

function toPayload(values: ProductFormValues): ProductPayload {
  return {
    name: values.name.trim(),
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    description: values.description.trim(),
    sku: values.sku.trim(),
    price: values.price.trim(),
    currency: values.currency.trim().toUpperCase(),
    status: values.status,
    variants: values.variants.map((variant) => ({
      sku: variant.sku.trim(),
      name: variant.name.trim(),
      price: variant.price.trim(),
      attributes: JSON.parse(variant.attributes || "{}") as Record<
        string,
        unknown
      >,
      status: variant.status,
    })),
    media: values.media.map((media, index) => ({
      url: media.url.trim(),
      type: media.type,
      sortOrder: index,
    })),
    channelVisibility: values.channels,
  };
}

function emptyVariant(index: number) {
  return {
    key: uniqueKey(`variant-${index}`),
    sku: "",
    name: "",
    price: "",
    attributes: "{}",
    status: "ACTIVE" as const,
  };
}

function updateVariant<K extends keyof ProductFormValues["variants"][number]>(
  values: ProductFormValues,
  setField: <T extends keyof ProductFormValues>(
    field: T,
    value: ProductFormValues[T],
  ) => void,
  index: number,
  field: K,
  value: ProductFormValues["variants"][number][K],
) {
  const variants = [...values.variants];
  variants[index] = { ...variants[index], [field]: value };
  setField("variants", variants);
}

function updateChannel(
  values: ProductFormValues,
  setField: <T extends keyof ProductFormValues>(
    field: T,
    value: ProductFormValues[T],
  ) => void,
  index: number,
  patch: Partial<ProductFormValues["channels"][number]>,
) {
  const channels = [...values.channels];
  channels[index] = { ...channels[index], ...patch };
  setField("channels", channels);
}

function firstError(errors: FormErrors, field: string) {
  return errors[field]?.[0];
}

function uniqueKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
