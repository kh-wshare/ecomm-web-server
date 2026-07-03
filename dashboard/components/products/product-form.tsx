"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  Product,
  ProductFormValues,
  ProductInventoryDetail,
  ProductPayload,
  ProductStatus,
  VariantStatus,
} from "@/types/product";
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
import { productFormSchema } from "@/lib/validation/product";
import { validateForm } from "@/lib/validation/form";
import {
  PRODUCT_STATUSES,
  SALES_CHANNELS,
  VARIANT_STATUSES,
} from "@/types/product";

type FormErrors = Record<string, string[]>;

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
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();

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
    <form className="space-y-6" onSubmit={submit}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
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
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {mode === "create" ? "Create product" : `Edit ${product?.name}`}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Product information, variants, media, channels, and inventory.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border border-separator px-4 text-sm font-semibold"
            href={
              product
                ? `/dashboard/products/${product.id}`
                : "/dashboard/products"
            }
          >
            Cancel
          </Link>
          <button
            className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            disabled={saveMutation.isPending}
            type="submit"
          >
            {saveMutation.isPending
              ? "Saving…"
              : mode === "create"
                ? "Create product"
                : "Save changes"}
          </button>
        </div>
      </header>

      {saveMutation.isError && (
        <div className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
          {saveMutation.error.message}
        </div>
      )}

      <FormSection
        description="Core catalog information customers and staff will see."
        title="Basic information"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            error={firstError(errors, "name")}
            label="Product name"
            maxLength={160}
            placeholder="Classic T-Shirt"
            required
            value={values.name}
            onChange={(value) => setField("name", value)}
          />
          <TextField
            error={firstError(errors, "slug")}
            label="URL slug"
            maxLength={180}
            placeholder="classic-t-shirt"
            value={values.slug}
            onChange={(value) => setField("slug", value)}
          />
          <TextField
            error={firstError(errors, "sku")}
            label="SKU"
            maxLength={80}
            placeholder="SHIRT-001"
            required
            value={values.sku}
            onChange={(value) => setField("sku", value)}
          />
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <TextField
              error={firstError(errors, "price")}
              inputMode="decimal"
              label="Price"
              placeholder="29.99"
              required
              value={values.price}
              onChange={(value) => setField("price", value)}
            />
            <TextField
              error={firstError(errors, "currency")}
              label="Currency"
              maxLength={3}
              placeholder="USD"
              required
              value={values.currency}
              onChange={(value) => setField("currency", value.toUpperCase())}
            />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Status</span>
            <select
              className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm outline-none focus:border-accent"
              value={values.status}
              onChange={(event) =>
                setField("status", event.target.value as ProductStatus)
              }
            >
              {PRODUCT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {toLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium">
              Description
            </span>
            <textarea
              className="min-h-32 w-full resize-y rounded-xl border border-separator bg-background p-3 text-sm outline-none focus:border-accent"
              maxLength={10000}
              placeholder="Describe the product, materials, fit, or important details."
              value={values.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </label>
        </div>
      </FormSection>

      <FormSection
        action={
          <button
            className="rounded-lg border border-separator px-3 py-2 text-xs font-semibold hover:bg-surface-secondary"
            type="button"
            onClick={() =>
              setField("variants", [
                ...values.variants,
                emptyVariant(values.variants.length),
              ])
            }
          >
            Add variant
          </button>
        }
        description="Optional purchasable options. Updating variants replaces the saved set."
        title="Variants"
      >
        {values.variants.length ? (
          <div className="space-y-4">
            {values.variants.map((variant, index) => (
              <div
                className="rounded-xl border border-separator bg-background p-4"
                key={variant.key}
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">Variant {index + 1}</p>
                  <button
                    className="text-xs font-semibold text-danger"
                    type="button"
                    onClick={() =>
                      setField(
                        "variants",
                        values.variants.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <TextField
                    error={firstError(errors, `variants.${index}.name`)}
                    label="Name"
                    placeholder="Black / Medium"
                    value={variant.name}
                    onChange={(value) =>
                      updateVariant(values, setField, index, "name", value)
                    }
                  />
                  <TextField
                    error={firstError(errors, `variants.${index}.sku`)}
                    label="SKU"
                    placeholder="SHIRT-BLK-M"
                    value={variant.sku}
                    onChange={(value) =>
                      updateVariant(values, setField, index, "sku", value)
                    }
                  />
                  <TextField
                    error={firstError(errors, `variants.${index}.price`)}
                    inputMode="decimal"
                    label="Price"
                    placeholder={values.price || "29.99"}
                    value={variant.price}
                    onChange={(value) =>
                      updateVariant(values, setField, index, "price", value)
                    }
                  />
                  <TextField
                    error={firstError(errors, `variants.${index}.attributes`)}
                    label="Attributes (JSON)"
                    placeholder='{"color":"black"}'
                    value={variant.attributes}
                    onChange={(value) =>
                      updateVariant(
                        values,
                        setField,
                        index,
                        "attributes",
                        value,
                      )
                    }
                  />
                  <label>
                    <span className="mb-1.5 block text-sm font-medium">
                      Status
                    </span>
                    <select
                      className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
                      value={variant.status}
                      onChange={(event) =>
                        updateVariant(
                          values,
                          setField,
                          index,
                          "status",
                          event.target.value as VariantStatus,
                        )
                      }
                    >
                      {VARIANT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {toLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptySection message="This product has no variants. Its base SKU and price will be used." />
        )}
      </FormSection>

      <FormSection
        action={
          <button
            className="rounded-lg border border-separator px-3 py-2 text-xs font-semibold hover:bg-surface-secondary"
            type="button"
            onClick={() =>
              setField("media", [
                ...values.media,
                { key: uniqueKey("media"), type: "IMAGE", url: "" },
              ])
            }
          >
            Add image
          </button>
        }
        description="Add hosted image URLs. Binary upload is unavailable until a media storage endpoint is added."
        title="Product media"
      >
        {values.media.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {values.media.map((media, index) => (
              <div
                className="flex gap-3 rounded-xl border border-separator bg-background p-3"
                key={media.key}
              >
                <div
                  aria-label={
                    media.url && media.type === "IMAGE"
                      ? `Preview image ${index + 1}`
                      : "Media preview"
                  }
                  className="grid size-20 shrink-0 place-items-center rounded-lg bg-surface-secondary bg-cover bg-center text-[10px] font-semibold text-muted"
                  role="img"
                  style={
                    media.url && media.type === "IMAGE"
                      ? { backgroundImage: `url("${media.url}")` }
                      : undefined
                  }
                >
                  {media.type === "VIDEO" ? "VIDEO" : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <label>
                      <span className="mb-1.5 block text-sm font-medium">
                        Type
                      </span>
                      <select
                        className="h-11 w-full rounded-xl border border-separator bg-background px-2 text-sm"
                        value={media.type}
                        onChange={(event) => {
                          const mediaItems = [...values.media];
                          mediaItems[index] = {
                            ...mediaItems[index],
                            type: event.target.value as "IMAGE" | "VIDEO",
                          };
                          setField("media", mediaItems);
                        }}
                      >
                        <option value="IMAGE">Image</option>
                        <option value="VIDEO">Video</option>
                      </select>
                    </label>
                    <TextField
                      error={firstError(errors, `media.${index}.url`)}
                      label={`Media URL ${index + 1}`}
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
                  <button
                    className="mt-2 text-xs font-semibold text-danger"
                    type="button"
                    onClick={() =>
                      setField(
                        "media",
                        values.media.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                  >
                    Remove image
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptySection message="No media added. Add a hosted image URL to show product media." />
        )}
      </FormSection>

      <FormSection
        description="Choose where the product is visible and available to purchase."
        title="Channel visibility"
      >
        <div className="divide-y divide-separator rounded-xl border border-separator bg-background">
          {values.channels.map((item, index) => (
            <div
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              key={item.channel}
            >
              <p className="text-sm font-semibold">{toLabel(item.channel)}</p>
              <div className="flex gap-5">
                <Checkbox
                  checked={item.isVisible}
                  label="Visible"
                  onChange={(checked) =>
                    updateChannel(values, setField, index, {
                      isVisible: checked,
                      isPurchasable: checked ? item.isPurchasable : false,
                    })
                  }
                />
                <Checkbox
                  checked={item.isPurchasable}
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
          ))}
        </div>
      </FormSection>

      {canAdjustStock && (
        <FormSection
          description={
            mode === "create"
              ? "Create the product's base inventory record with starting stock."
              : "Apply a signed adjustment to base stock. Variant inventory is managed from Inventory."
          }
          title="Inventory"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === "create" ? (
              <TextField
                error={firstError(errors, "initialStock")}
                inputMode="numeric"
                label="Initial stock"
                placeholder="0"
                value={values.initialStock}
                onChange={(value) => setField("initialStock", value)}
              />
            ) : (
              <TextField
                error={firstError(errors, "stockAdjustment")}
                inputMode="numeric"
                label="Stock adjustment"
                placeholder="e.g. 10 or -2"
                value={values.stockAdjustment}
                onChange={(value) => setField("stockAdjustment", value)}
              />
            )}
            <TextField
              error={firstError(errors, "safetyBuffer")}
              inputMode="numeric"
              label="Safety buffer"
              placeholder="0"
              value={values.safetyBuffer}
              onChange={(value) => setField("safetyBuffer", value)}
            />
          </div>
          {mode === "edit" && inventory?.stocks[0] && (
            <p className="mt-3 text-xs text-muted">
              Current base stock: {inventory.stocks[0].totalStock}; sellable:{" "}
              {inventory.stocks[0].onlineSellableStock}.
            </p>
          )}
          <p className="mt-3 text-xs text-muted">
            The inventory API requires a non-zero stock adjustment when applying
            a safety buffer.
          </p>
        </FormSection>
      )}

      {isDirty && (
        <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-xl border border-warning/30 bg-surface px-4 py-3 shadow-lg">
          <p className="text-sm font-medium">You have unsaved changes.</p>
          <button
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
            disabled={saveMutation.isPending}
            type="submit"
          >
            Save changes
          </button>
        </div>
      )}
    </form>
  );
}

function FormSection({
  action,
  children,
  description,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextField({
  error,
  label,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  error?: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ${
          error ? "border-danger" : "border-separator focus:border-accent"
        }`}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

function Checkbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium">
      <input
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-separator px-4 py-8 text-center text-sm text-muted">
      {message}
    </div>
  );
}

function ProductFormLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-20 rounded-2xl bg-surface-secondary" />
      <div className="h-80 rounded-2xl bg-surface-secondary" />
      <div className="h-56 rounded-2xl bg-surface-secondary" />
    </div>
  );
}

function PermissionNotice({ action }: { action: string }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
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
      <div>
        <h2 className="text-xl font-semibold">Product is unavailable</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <button
          className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
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
