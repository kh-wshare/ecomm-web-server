"use client";

import {
  Button,
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
import { useEffect, useMemo, useRef, useState } from "react";

import { usePermissions } from "@/hooks/use-permissions";
import {
  adjustProductStock,
  createProduct,
  getProduct,
  getProductInventory,
  updateProduct,
} from "@/lib/products/product-data";
import { uploadMerchantFile } from "@/lib/files/file-data";
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

type ProductMediaType = "IMAGE" | "VIDEO";

type ProductFormMedia = ProductFormValues["media"][number] & {
  file?: File;
  previewUrl?: string;
  fileName?: string;
  fileSize?: number;
};

type ProductFormDraftValues = Omit<ProductFormValues, "media"> & {
  media: ProductFormMedia[];
};

type ChannelMode = "off" | "visible" | "selling";

type StockAdjustmentDraft = {
  productId: string;
  quantityDelta: number;
  safetyBuffer: number;
  variantId?: string;
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_MB = 5;

const CHANNEL_MODES: {
  value: ChannelMode;
  label: string;
  description: string;
}[] = [
  {
    value: "off",
    label: "Off",
    description: "Hidden from customers",
  },
  {
    value: "visible",
    label: "Visible",
    description: "Customers can see it",
  },
  {
    value: "selling",
    label: "Selling",
    description: "Customers can buy it",
  },
];

function getChannelMode(item: {
  isVisible: boolean;
  isPurchasable: boolean;
}): ChannelMode {
  if (item.isPurchasable) return "selling";
  if (item.isVisible) return "visible";
  return "off";
}

function getChannelPatch(mode: ChannelMode) {
  if (mode === "selling") {
    return {
      isVisible: true,
      isPurchasable: true,
    };
  }

  if (mode === "visible") {
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
  if (!bytes) return "";

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const fieldClassName = "w-full";
const inputClassName =
  "rounded-xl border border-separator bg-background px-3 text-sm outline-none transition shadow-none";
const textAreaClassName =
  "min-h-32 w-full rounded-xl border border-separator bg-background p-3 text-sm outline-none transition shadow-none";
const selectTriggerClassName =
  "rounded-xl border border-separator bg-background px-3 text-sm transition shadow-none";
const selectPopoverClassName =
  "rounded-xl border border-separator bg-surface p-1 shadow-none";

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

  const [values, setValues] = useState<ProductFormDraftValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});

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
      item.type === "IMAGE" && Boolean(item.previewUrl || item.url.trim()),
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

  useEffect(() => {
    revokeAllPreviewUrls();
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  useEffect(() => revokeAllPreviewUrls, []);

  useEffect(() => {
    if (!isDirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: async (formValues: ProductFormDraftValues) => {
      const payload = await toPayload(formValues);
      const savedProduct =
        mode === "create"
          ? await createProduct(payload)
          : await updateProduct(product!.id, payload);

      const stockAdjustments = buildStockAdjustments({
        formValues,
        mode,
        savedProduct,
      });

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

  const addMedia = () => {
    setField("media", [
      ...values.media,
      {
        key: uniqueKey("media"),
        type: "IMAGE",
        url: "",
      },
    ]);
  };

  const updateMedia = (index: number, patch: Partial<ProductFormMedia>) => {
    const mediaItems = [...values.media];

    mediaItems[index] = {
      ...mediaItems[index],
      ...patch,
    };

    setField("media", mediaItems);
  };

  const removeMedia = (index: number) => {
    revokePreviewUrl(values.media[index]?.previewUrl);

    setField(
      "media",
      values.media.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleMediaTypeChange = (index: number, type: ProductMediaType) => {
    revokePreviewUrl(values.media[index]?.previewUrl);

    updateMedia(index, {
      type,
      url: "",
      file: undefined,
      previewUrl: undefined,
      fileName: undefined,
      fileSize: undefined,
    });
  };

  const handleImageUpload = (index: number, file?: File) => {
    if (!file) return;

    const isValidType = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isValidSize = file.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024;

    if (!isValidType) {
      notify.warning("Upload JPG, PNG, or WEBP images only");
      return;
    }

    if (!isValidSize) {
      notify.warning(`Image must be ${MAX_IMAGE_SIZE_MB} MB or smaller`);
      return;
    }

    revokePreviewUrl(values.media[index]?.previewUrl);

    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);

    updateMedia(index, {
      type: "IMAGE",
      file,
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
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
      notify.warning("Check the highlighted product fields");

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
      notify.warning("Add a stock quantity where a safety buffer changes");

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
              className="inline-flex h-9.5 items-center justify-center rounded-full border border-separator px-4 text-sm font-semibold transition hover:bg-surface-secondary"
              href={
                product
                  ? `/dashboard/products/${product.id}`
                  : "/dashboard/products"
              }
            >
              Cancel
            </Link>
            <Button isDisabled={saveMutation.isPending} type="submit">
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
            value={
              values.price ? `${values.price} ${values.currency}` : "Not set"
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
                error={firstError(errors, "name")}
                label="Product name"
                maxLength={160}
                name="name"
                placeholder="Enter product name, e.g. Classic T-Shirt"
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
                placeholder="Enter product slug"
                value={values.slug}
                onChange={(value) => setField("slug", value)}
              />

              <HeroTextInput
                error={firstError(errors, "sku")}
                label="SKU"
                maxLength={80}
                name="sku"
                placeholder="Enter SKU, e.g. SHIRT-001"
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
                  placeholder="0.00"
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
                  onChange={(value) =>
                    setField("currency", value.toUpperCase())
                  }
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
                placeholder="Describe the product, key features, materials, or usage..."
                value={values.description}
                onChange={(value) => setField("description", value)}
              />
            </Fieldset.Group>
          </FormSection>

          <FormSection
            action={
              <Button
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
                        type="button"
                        variant="danger"
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
                          updateVariant(
                            values,
                            setField,
                            index,
                            "status",
                            value,
                          )
                        }
                      />

                      <HeroTextAreaInput
                        className="sm:col-span-2"
                        description="Must be valid JSON, for example"
                        error={firstError(
                          errors,
                          `variants.${index}.attributes`,
                        )}
                        label="Attributes JSON"
                        name={`variant-${index}-attributes`}
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

                      {canAdjustStock && (
                        <>
                          {mode === "create" ? (
                            <HeroTextInput
                              error={firstError(
                                errors,
                                `variants.${index}.initialStock`,
                              )}
                              inputMode="numeric"
                              label="Initial stock"
                              name={`variant-${index}-initial-stock`}
                              placeholder="0"
                              value={variant.initialStock}
                              onChange={(value) =>
                                updateVariant(
                                  values,
                                  setField,
                                  index,
                                  "initialStock",
                                  value,
                                )
                              }
                            />
                          ) : (
                            <HeroTextInput
                              description="Use positive or negative value."
                              error={firstError(
                                errors,
                                `variants.${index}.stockAdjustment`,
                              )}
                              inputMode="numeric"
                              label="Stock adjustment"
                              name={`variant-${index}-stock-adjustment`}
                              placeholder="e.g. 10 or -2"
                              value={variant.stockAdjustment}
                              onChange={(value) =>
                                updateVariant(
                                  values,
                                  setField,
                                  index,
                                  "stockAdjustment",
                                  value,
                                )
                              }
                            />
                          )}

                          <HeroTextInput
                            description="Reserve stock not available online."
                            error={firstError(
                              errors,
                              `variants.${index}.safetyBuffer`,
                            )}
                            inputMode="numeric"
                            label="Safety buffer"
                            name={`variant-${index}-safety-buffer`}
                            placeholder="0"
                            value={variant.safetyBuffer}
                            onChange={(value) =>
                              updateVariant(
                                values,
                                setField,
                                index,
                                "safetyBuffer",
                                value,
                              )
                            }
                          />
                        </>
                      )}
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
              <Button variant="primary" type="button" onPress={addMedia}>
                Add media
              </Button>
            }
            description="Add product photos or videos. Photos can be uploaded or pasted as a link. Videos support link only."
            title="Product media"
          >
            {values.media.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {values.media.map((media, index) => {
                  const isImage = media.type === "IMAGE";
                  const previewUrl = media.previewUrl || media.url;

                  return (
                    <div
                      className="overflow-hidden rounded-2xl border border-separator bg-background transition hover:border-accent/30"
                      key={media.key}
                    >
                      <div
                        aria-label={
                          isImage && previewUrl
                            ? `Product photo ${index + 1}`
                            : `Product media ${index + 1}`
                        }
                        className="aspect-[4/3] bg-surface-secondary bg-cover bg-center"
                        role="img"
                        style={
                          isImage && previewUrl
                            ? { backgroundImage: `url("${previewUrl}")` }
                            : undefined
                        }
                      >
                        {!previewUrl && (
                          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                            <div className="grid size-12 place-items-center rounded-full bg-surface text-lg">
                              {isImage ? "🖼️" : "▶"}
                            </div>

                            <p className="mt-3 text-sm font-semibold">
                              {isImage ? "Photo preview" : "Video link"}
                            </p>

                            <p className="mt-1 text-xs text-muted">
                              {isImage
                                ? "Upload a photo or paste an image URL"
                                : "Paste a video URL only"}
                            </p>
                          </div>
                        )}

                        {!isImage && media.url && (
                          <div className="flex h-full items-center justify-center bg-surface-secondary px-4 text-center">
                            <div>
                              <div className="mx-auto grid size-12 place-items-center rounded-full bg-surface text-lg">
                                ▶
                              </div>
                              <p className="mt-3 truncate text-sm font-semibold">
                                Video URL added
                              </p>
                              <p className="mt-1 text-xs text-muted">
                                Video preview is not uploaded here
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              Media {index + 1}
                            </p>

                            <p className="mt-1 truncate text-xs text-muted">
                              {isImage
                                ? media.fileName
                                  ? `${media.fileName} · ${formatFileSize(media.fileSize)}`
                                  : "Photo upload or image URL"
                                : "Video URL only"}
                            </p>
                          </div>

                          <Button
                            variant="danger"
                            type="button"
                            onPress={() => removeMedia(index)}
                          >
                            Remove
                          </Button>
                        </div>

                        <HeroSelectField<"IMAGE" | "VIDEO">
                          label="Media type"
                          name={`media-${index}-type`}
                          options={[
                            { label: "Photo", value: "IMAGE" },
                            { label: "Video", value: "VIDEO" },
                          ]}
                          value={media.type}
                          onChange={(value) =>
                            handleMediaTypeChange(index, value)
                          }
                        />

                        {isImage && (
                          <div className="rounded-2xl border border-dashed border-separator bg-surface p-4">
                            <label className="flex cursor-pointer flex-col items-center justify-center text-center">
                              <div className="grid size-10 place-items-center rounded-full bg-surface-secondary text-lg">
                                +
                              </div>

                              <p className="mt-2 text-sm font-semibold">
                                Upload photo
                              </p>

                              <p className="mt-1 text-xs text-muted">
                                JPG, PNG, or WEBP. Max {MAX_IMAGE_SIZE_MB} MB.
                              </p>

                              <input
                                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                                className="sr-only"
                                type="file"
                                onChange={(event) => {
                                  handleImageUpload(
                                    index,
                                    event.target.files?.[0],
                                  );
                                  event.currentTarget.value = "";
                                }}
                              />
                            </label>
                          </div>
                        )}

                        <HeroTextInput
                          error={firstError(errors, `media.${index}.url`)}
                          label={isImage ? "Photo URL" : "Video URL"}
                          name={`media-${index}-url`}
                          placeholder={
                            isImage
                              ? "https://cdn.example.com/product.jpg"
                              : "https://youtube.com/watch?v=..."
                          }
                          value={media.url}
                          onChange={(value) =>
                            updateMedia(index, {
                              url: value,
                            })
                          }
                        />

                        {isImage ? (
                          <p className="rounded-xl bg-surface px-3 py-2 text-xs text-muted">
                            For photos, users can either upload an image or
                            paste a hosted image URL.
                          </p>
                        ) : (
                          <p className="rounded-xl bg-surface px-3 py-2 text-xs text-muted">
                            For videos, only paste a video link. File upload is
                            disabled.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptySection
                actionLabel="Add media"
                message="No media added yet. Add photos or video links for this product."
                onAction={addMedia}
              />
            )}
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
                          selectedMode === "selling"
                            ? "bg-success/10 text-success"
                            : selectedMode === "visible"
                              ? "bg-warning/10 text-warning"
                              : "bg-surface-secondary text-muted"
                        }`}
                      >
                        {selectedMode === "selling"
                          ? "Selling"
                          : selectedMode === "visible"
                            ? "Visible"
                            : "Off"}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      {CHANNEL_MODES.map((mode) => {
                        const isSelected = selectedMode === mode.value;

                        return (
                          <button
                            className={`rounded-xl border px-3 py-3 text-left transition ${
                              isSelected
                                ? "border-accent bg-accent/10"
                                : "border-separator bg-surface hover:bg-surface-secondary"
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
                                isSelected ? "text-accent" : "text-foreground"
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
                mode === "create"
                  ? "Create the product's base stock. Variant stock can be set inside each variant."
                  : "Apply a signed adjustment to base stock. Variant stock can be adjusted inside each variant."
              }
              title="Inventory"
            >
              {mode === "edit" && baseStock && (
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
      className={`rounded-3xl border border-separator bg-surface shadow-sm ${
        compact ? "p-5" : "p-5 sm:p-6"
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
  "onChange" | "required"
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
  "onChange" | "required"
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
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
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
      <p className="text-sm text-muted mb-6">{message}</p>
      {actionLabel && onAction && (
        <Button type="button" onPress={onAction}>
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
): ProductFormDraftValues {
  const baseStock = inventory?.stocks.find((stock) => stock.variantId === null);

  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    sku: product?.sku ?? "",
    price: product?.price ?? "",
    currency: product?.currency ?? "USD",
    status: product?.status ?? "DRAFT",
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
          initialStock: "0",
          safetyBuffer: String(variantStock?.safetyBuffer ?? 0),
          stockAdjustment: "",
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
    initialStock: "0",
    safetyBuffer: String(baseStock?.safetyBuffer ?? 0),
    stockAdjustment: "",
  };
}

async function toPayload(
  values: ProductFormDraftValues,
): Promise<ProductPayload> {
  const media = await normalizeMediaBeforeSubmit(values.media);

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
    media,
    channelVisibility: values.channels,
  };
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
          "https://placeholder.local/product-image-upload.jpg",
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
  mode: "create" | "edit";
}) {
  const errors: FormErrors = {};
  const baseQuantityDelta =
    mode === "create"
      ? Number(formValues.initialStock || 0)
      : Number(formValues.stockAdjustment || 0);
  const baseSafetyChanged =
    formValues.safetyBuffer !== initialValues.safetyBuffer;

  if (
    baseQuantityDelta === 0 &&
    ((mode === "create" && Number(formValues.safetyBuffer) > 0) ||
      (mode === "edit" && baseSafetyChanged))
  ) {
    errors.safetyBuffer = [
      "A non-zero stock change is required to apply this safety buffer",
    ];
  }

  formValues.variants.forEach((variant, index) => {
    const quantityDelta =
      mode === "create"
        ? Number(variant.initialStock || 0)
        : Number(variant.stockAdjustment || 0);
    const initialVariant = initialValues.variants.find(
      (item) => item.key === variant.key,
    );
    const safetyChanged =
      variant.safetyBuffer !== (initialVariant?.safetyBuffer ?? "0");

    if (
      quantityDelta === 0 &&
      ((mode === "create" && Number(variant.safetyBuffer) > 0) ||
        (mode === "edit" && safetyChanged))
    ) {
      errors[`variants.${index}.safetyBuffer`] = [
        "A non-zero stock change is required to apply this safety buffer",
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
  mode: "create" | "edit";
  savedProduct: Product;
}) {
  const adjustments: StockAdjustmentDraft[] = [];
  const baseQuantityDelta =
    mode === "create"
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
      mode === "create"
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
): Promise<ProductPayload["media"]> {
  const media = await Promise.all(
    mediaItems.map(async (item, index) => {
      let url = item.url.trim();

      if (item.type === "IMAGE" && item.file && !url) {
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

  return media.filter((item): item is ProductPayload["media"][number] =>
    Boolean(item),
  );
}

async function uploadProductImage(file: File): Promise<{ url: string }> {
  const uploaded = await uploadMerchantFile(file, {
    purpose: "product-media",
    visibility: "public",
  });
  return { url: uploaded.url };
}

function emptyVariant(index: number) {
  return {
    key: uniqueKey(`variant-${index}`),
    sku: "",
    name: "",
    price: "",
    attributes: "{}",
    status: "ACTIVE" as const,
    initialStock: "0",
    safetyBuffer: "0",
    stockAdjustment: "",
  };
}

function updateVariant<
  K extends keyof ProductFormDraftValues["variants"][number],
>(
  values: ProductFormDraftValues,
  setField: <T extends keyof ProductFormDraftValues>(
    field: T,
    value: ProductFormDraftValues[T],
  ) => void,
  index: number,
  field: K,
  value: ProductFormDraftValues["variants"][number][K],
) {
  const variants = [...values.variants];
  variants[index] = { ...variants[index], [field]: value };
  setField("variants", variants);
}

function updateChannel(
  values: ProductFormDraftValues,
  setField: <T extends keyof ProductFormDraftValues>(
    field: T,
    value: ProductFormDraftValues[T],
  ) => void,
  index: number,
  patch: Partial<ProductFormDraftValues["channels"][number]>,
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

function normalizeSku(value: string) {
  return value.trim().toUpperCase();
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
