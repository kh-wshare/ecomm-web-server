'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Chip, Icon, Input, Separator, TextArea } from '@repo/ui';

import { getErrorMessage } from '@/lib/errors/api-error';
import {
  createPosReceipt,
  getActivePosOrders,
  getPosBranches,
  getPosCategories,
  getPosSession,
  getPosProducts,
  loginPosStaff,
  logoutPosStaff,
  setActiveBranch,
} from '@/lib/pos/pos-data';
import type {
  CartItem,
  PaymentMethod,
  PosBranch,
  PosCategory,
  PosProduct,
  PosReceipt,
  PosSession,
} from '@/types/pos';

type SaleMode = 'sale' | 'orders' | 'receipt';

const currency = 'USD';
const allCategorySlug = 'all';
const emptyProducts: PosProduct[] = [];
const emptyCategories: PosCategory[] = [];

export function PosWorkspace() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<PosSession | null>(null);
  const [mode, setMode] = useState<SaleMode>('sale');
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] =
    useState(allCategorySlug);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState('0');
  const [serviceCharge, setServiceCharge] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [cashReceived, setCashReceived] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [receipt, setReceipt] = useState<PosReceipt | null>(null);

  const sessionQuery = useQuery({
    queryFn: getPosSession,
    queryKey: ['pos', 'session'],
  });
  const currentSession = session ?? sessionQuery.data ?? null;
  const productsQuery = useQuery({
    enabled: Boolean(currentSession?.activeBranch),
    queryFn: () =>
      getPosProducts(currentSession, currentSession?.activeBranch ?? null),
    queryKey: [
      'pos',
      'products',
      currentSession?.merchant.id,
      currentSession?.activeBranch?.id,
    ],
  });
  const categoriesQuery = useQuery({
    enabled: Boolean(currentSession),
    queryFn: () => getPosCategories(currentSession),
    queryKey: [
      'pos',
      'categories',
      currentSession?.merchant.id,
      currentSession?.activeBranch?.id,
    ],
  });
  const branchesQuery = useQuery({
    enabled: Boolean(currentSession),
    queryFn: () => getPosBranches(currentSession),
    queryKey: ['pos', 'branches', currentSession?.merchant.id],
  });
  const ordersQuery = useQuery({
    queryFn: () => getActivePosOrders(currentSession),
    queryKey: ['pos', 'orders', currentSession?.merchant.id],
  });
  const login = useMutation({
    mutationFn: loginPosStaff,
    onSuccess: (nextSession) => {
      setSession(nextSession);
      queryClient.setQueryData(['pos', 'session'], nextSession);
    },
  });
  const completeSale = useMutation({
    mutationFn: () => {
      if (!currentSession?.activeBranch) {
        throw new Error('Select a branch before completing the sale.');
      }
      if (!cart.length) throw new Error('Add at least one item to the cart.');

      const stockError = validateCartStock(cart);
      if (stockError) throw new Error(stockError);

      return createPosReceipt({
        branch: currentSession.activeBranch,
        cashReceived: toMoney(cashReceived),
        cashierName: currentSession.user.fullName,
        customerName,
        discount: toMoney(discount),
        items: cart,
        paymentMethod,
        serviceCharge: toMoney(serviceCharge),
        tax,
      });
    },
    onSuccess: (nextReceipt) => {
      setReceipt(nextReceipt);
      void queryClient.invalidateQueries({ queryKey: ['pos', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      setCart([]);
      setCustomerName('');
      setDiscount('0');
      setServiceCharge('0');
      setTaxRate('0');
      setCashReceived('0');
      setMode('receipt');
    },
  });

  const products = productsQuery.data ?? emptyProducts;
  const apiCategories = categoriesQuery.data ?? emptyCategories;
  const categories = useMemo(
    () => mergeCategories(apiCategories, products),
    [apiCategories, products],
  );
  const categoryCounts = useMemo(() => productCountsByCategory(products), [
    products,
  ]);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const skuQuery = barcode.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategorySlug === allCategorySlug ||
        product.categorySlug === selectedCategorySlug;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);
      const matchesBarcode =
        !skuQuery ||
        product.sku.toLowerCase().includes(skuQuery) ||
        product.variants.some((variant) =>
          variant.sku.toLowerCase().includes(skuQuery),
        );

      return matchesCategory && matchesSearch && matchesBarcode;
    });
  }, [barcode, products, search, selectedCategorySlug]);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const tax =
    Math.max(0, subtotal - toMoney(discount)) * (toMoney(taxRate) / 100);
  const total = Math.max(
    0,
    subtotal - toMoney(discount) + toMoney(serviceCharge) + tax,
  );
  const changeDue =
    paymentMethod === 'CASH' ? Math.max(0, toMoney(cashReceived) - total) : 0;
  const canComplete =
    Boolean(currentSession?.activeBranch) &&
    cart.length > 0 &&
    !validateCartStock(cart) &&
    (paymentMethod === 'KHQR' || toMoney(cashReceived) >= total);

  useEffect(() => {
    const branch = branchesQuery.data?.[0];
    if (!currentSession || currentSession.activeBranch || !branch) return;

    void setActiveBranch(branch).then((nextSession) => {
      setSession(nextSession);
      queryClient.setQueryData(['pos', 'session'], nextSession);
    });
  }, [branchesQuery.data, currentSession, queryClient]);

  useEffect(() => {
    if (
      selectedCategorySlug === allCategorySlug ||
      categories.some((item) => item.slug === selectedCategorySlug)
    ) {
      return;
    }

    setSelectedCategorySlug(allCategorySlug);
  }, [categories, selectedCategorySlug]);

  if (sessionQuery.isPending) {
    return <PosLoading />;
  }

  if (!currentSession) {
    return (
      <PosLogin
        error={login.isError ? getErrorMessage(login.error) : null}
        isPending={login.isPending}
        onSubmit={(payload) => login.mutate(payload)}
      />
    );
  }

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-950">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 lg:px-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-primary text-white">
              <Icon icon="solar:cash-register-bold" width={22} />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {currentSession.merchant.name}
              </p>
              <p className="text-xs text-slate-500">
                {currentSession.user.fullName} ·{' '}
                {currentSession.activeBranch?.register ?? 'No register'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ModeButton
              active={mode === 'sale'}
              onPress={() => setMode('sale')}
            >
              Sale
            </ModeButton>
            <ModeButton
              active={mode === 'orders'}
              onPress={() => setMode('orders')}
            >
              Orders
            </ModeButton>
            <ModeButton
              active={mode === 'receipt'}
              isDisabled={!receipt}
              onPress={() => setMode('receipt')}
            >
              Receipt
            </ModeButton>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onPress={() => {
                void logoutPosStaff().then(() => {
                  queryClient.setQueryData(['pos', 'session'], null);
                });
                setSession(null);
              }}
            >
              <Icon icon="solar:logout-2-linear" width={18} />
              Sign out
            </Button>
          </div>
        </header>

        <BranchSelector
          activeBranch={currentSession.activeBranch}
          branches={branchesQuery.data ?? []}
          error={branchesQuery.isError ? getErrorMessage(branchesQuery.error) : null}
          isLoading={branchesQuery.isPending}
          onSelect={(branch) =>
            void setActiveBranch(branch).then((nextSession) => {
              setCart([]);
              setSearch('');
              setBarcode('');
              setSelectedCategorySlug(allCategorySlug);
              setSession(nextSession);
              queryClient.setQueryData(['pos', 'session'], nextSession);
            })
          }
        />

        {mode === 'orders' ? (
          <ActiveOrders
            error={ordersQuery.isError ? getErrorMessage(ordersQuery.error) : null}
            orders={ordersQuery.data ?? []}
          />
        ) : mode === 'receipt' && receipt ? (
          <ReceiptView receipt={receipt} onNewSale={() => setMode('sale')} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_390px]">
            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">Categories</h2>
                <span className="text-xs font-medium text-slate-400">
                  {categories.length}
                </span>
              </div>
              {categoriesQuery.isError ? (
                <DataNotice
                  message={getErrorMessage(categoriesQuery.error)}
                  title="Unable to load categories"
                />
              ) : (
                <div className="mt-3 grid gap-2">
                  {categories.map((item) => {
                    const count =
                      item.slug === allCategorySlug
                        ? products.length
                        : categoryCounts.get(item.slug) ?? 0;

                    return (
                      <CategoryButton
                        category={item}
                        count={count}
                        isSelected={selectedCategorySlug === item.slug}
                        key={item.slug}
                        onClick={() => setSelectedCategorySlug(item.slug)}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                <LabeledInput
                  icon="solar:magnifer-linear"
                  label="Product search"
                  placeholder="Name or SKU"
                  value={search}
                  onChange={setSearch}
                />
                <LabeledInput
                  icon="solar:scanner-2-linear"
                  label="Barcode / SKU"
                  placeholder="Scan or type"
                  value={barcode}
                  onChange={setBarcode}
                  onEnter={() =>
                    addFirstSkuMatch(filteredProducts, barcode, setCart)
                  }
                />
              </div>

              {productsQuery.isError ? (
                <DataNotice
                  message={getErrorMessage(productsQuery.error)}
                  title="Unable to load POS products"
                />
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <ProductTile
                      key={product.id}
                      product={product}
                      onAdd={(item) => addToCart(setCart, item)}
                    />
                  ))}
                  {!filteredProducts.length && (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 sm:col-span-2 2xl:col-span-3">
                      No POS products match the current branch, category, or
                      search.
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold">Current cart</h2>
                  <p className="text-xs text-slate-500">
                    {cart.length} line {cart.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <Button
                  isDisabled={!cart.length}
                  size="sm"
                  type="button"
                  variant="secondary"
                  onPress={() => setCart([])}
                >
                  Clear
                </Button>
              </div>
              <Separator />

              <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
                {cart.length ? (
                  cart.map((item) => (
                    <CartLine
                      item={item}
                      key={item.id}
                      onNote={(note) =>
                        updateCartItem(setCart, item.id, { note })
                      }
                      onQuantity={(quantity) =>
                        updateCartItem(setCart, item.id, { quantity })
                      }
                      onRemove={() => removeFromCart(setCart, item.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Add products or scan a SKU to start a sale.
                  </div>
                )}
              </div>

              <Separator />
              <div className="space-y-3 p-4">
                <LabeledInput
                  label="Customer"
                  placeholder="Walk-in customer"
                  value={customerName}
                  onChange={setCustomerName}
                />
                <div className="grid grid-cols-3 gap-2">
                  <LabeledInput
                    inputMode="decimal"
                    label="Discount"
                    value={discount}
                    onChange={setDiscount}
                  />
                  <LabeledInput
                    inputMode="decimal"
                    label="Service"
                    value={serviceCharge}
                    onChange={setServiceCharge}
                  />
                  <LabeledInput
                    inputMode="decimal"
                    label="Tax %"
                    value={taxRate}
                    onChange={setTaxRate}
                  />
                </div>
                <PaymentSelector
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
                {paymentMethod === 'CASH' ? (
                  <LabeledInput
                    inputMode="decimal"
                    label="Cash received"
                    value={cashReceived}
                    onChange={setCashReceived}
                  />
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                      <Icon icon="solar:qr-code-bold" width={18} />
                      KHQR ready
                    </div>
                    <p className="mt-1 text-xs text-emerald-700">
                      Show the QR from the provider terminal, then confirm the
                      sale.
                    </p>
                  </div>
                )}

                <Summary
                  changeDue={changeDue}
                  discount={toMoney(discount)}
                  serviceCharge={toMoney(serviceCharge)}
                  subtotal={subtotal}
                  tax={tax}
                  total={total}
                />

                {completeSale.isError && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                    {getErrorMessage(completeSale.error)}
                  </p>
                )}

                <Button
                  className="h-12 w-full bg-primary text-white"
                  isDisabled={!canComplete || completeSale.isPending}
                  type="button"
                  onPress={() => completeSale.mutate()}
                >
                  <Icon icon="solar:check-circle-bold" width={20} />
                  {completeSale.isPending ? 'Completing...' : 'Complete sale'}
                </Button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function PosLogin({
  error,
  isPending,
  onSubmit,
}: {
  error: string | null;
  isPending: boolean;
  onSubmit: (payload: { email: string; password: string }) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 px-4 text-slate-950">
      <Card className="w-full max-w-md border border-slate-200 bg-white shadow-none">
        <div className="p-6">
          <div className="grid size-12 place-items-center rounded-lg bg-primary text-white">
            <Icon icon="solar:cash-register-bold" width={24} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Staff POS login</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to open a register and start branch sales.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit({
                email,
                password,
              });
            }}
          >
            <LabeledInput label="Email" value={email} onChange={setEmail} />
            <LabeledInput
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
            />
            {error && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {error}
              </p>
            )}
            <Button
              className="h-11 w-full bg-primary text-white"
              isDisabled={isPending}
              type="submit"
            >
              <Icon icon="solar:login-3-bold" width={20} />
              {isPending ? 'Signing in...' : 'Open POS'}
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}

function PosLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid size-12 place-items-center rounded-lg bg-slate-100">
          <Icon
            className="text-slate-300"
            icon="solar:cash-register-bold"
            width={24}
          />
        </div>
        <div className="mt-6 h-7 w-44 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 space-y-3">
          <div className="h-11 animate-pulse rounded bg-slate-100" />
          <div className="h-11 animate-pulse rounded bg-slate-100" />
          <div className="h-11 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </main>
  );
}

function BranchSelector({
  activeBranch,
  branches,
  error,
  isLoading,
  onSelect,
}: {
  activeBranch: PosBranch | null;
  branches: PosBranch[];
  error: string | null;
  isLoading: boolean;
  onSelect: (branch: PosBranch) => void;
}) {
  if (isLoading) {
    return (
      <section className="grid gap-2 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="h-20 animate-pulse rounded-lg border border-slate-200 bg-white"
            key={index}
          />
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        {error}
      </section>
    );
  }

  if (!branches.length) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        No active branches are available for POS.
      </section>
    );
  }

  return (
    <section className="grid gap-2 md:grid-cols-3">
      {branches.map((branch) => (
        <button
          className={`rounded-lg border px-4 py-3 text-left ${
            activeBranch?.id === branch.id
              ? 'border-primary bg-primary text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          }`}
          key={branch.id}
          type="button"
          onClick={() => onSelect(branch)}
        >
          <span className="block text-sm font-semibold">{branch.name}</span>
          <span className="mt-1 block text-xs opacity-75">
            {branch.register} · {branch.location}
          </span>
        </button>
      ))}
    </section>
  );
}

function DataNotice({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs">{message}</p>
    </div>
  );
}

function CategoryButton({
  category,
  count,
  isSelected,
  onClick,
}: {
  category: PosCategory;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`group flex min-h-16 w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
        isSelected
          ? 'border-primary bg-primary text-white shadow-sm'
          : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white'
      }`}
      type="button"
      onClick={onClick}
    >
      <CategoryLogo category={category} isSelected={isSelected} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {category.name}
        </span>
        <span
          className={`mt-0.5 block text-xs ${
            isSelected ? 'text-white/75' : 'text-slate-500'
          }`}
        >
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </span>
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          isSelected
            ? 'bg-white/20 text-white'
            : 'bg-white text-slate-500 ring-1 ring-slate-200 group-hover:text-slate-700'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function CategoryLogo({
  category,
  isSelected,
}: {
  category: PosCategory;
  isSelected: boolean;
}) {
  if (category.logoUrl) {
    return (
      <img
        alt=""
        className={`size-12 shrink-0 rounded-lg object-cover ${
          isSelected ? 'ring-2 ring-white/70' : 'ring-1 ring-slate-200'
        }`}
        src={category.logoUrl}
      />
    );
  }

  if (category.slug === allCategorySlug) {
    return (
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-lg ${
          isSelected ? 'bg-white/20 text-white' : 'bg-white text-primary'
        }`}
      >
        <Icon icon="solar:widget-5-bold" width={22} />
      </span>
    );
  }

  return (
    <span
      className={`grid size-12 shrink-0 place-items-center rounded-lg text-base font-semibold ${
        isSelected
          ? 'bg-white/20 text-white'
          : 'bg-white text-primary ring-1 ring-slate-200'
      }`}
    >
      {category.name.trim().charAt(0).toUpperCase() || 'C'}
    </span>
  );
}

function ProductTile({
  onAdd,
  product,
}: {
  onAdd: (item: CartItem) => void;
  product: PosProduct;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0]?.id ?? '',
  );
  const variant =
    product.variants.find((item) => item.id === selectedVariantId) ??
    product.variants[0] ??
    null;
  const price = Number(variant?.price ?? product.price);
  const sku = variant?.sku ?? product.sku;
  const stock = product.stocks.find(
    (item) => item.variantId === (variant?.id ?? null),
  );
  const availableStock = stock?.availableStock ?? 0;
  const isOutOfStock = availableStock <= 0;

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex min-h-28 gap-3 p-3">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-200">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="h-full w-full object-cover"
              src={product.imageUrl}
            />
          ) : (
            <Icon icon="solar:box-bold-duotone" width={28} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{product.name}</p>
              <p className="mt-1 text-xs text-slate-500">{sku}</p>
            </div>
            <Chip color="accent" size="sm" variant="soft">
              {formatMoney(price)}
            </Chip>
          </div>
          <p
            className={`mt-2 text-xs ${
              isOutOfStock ? 'font-semibold text-red-600' : 'text-slate-500'
            }`}
          >
            {isOutOfStock ? 'Out of stock' : `Stock ${availableStock}`}
          </p>
        </div>
      </div>
      {product.variants.length > 0 && (
        <div className="border-t border-slate-200 px-3 py-2">
          <select
            aria-label={`${product.name} variant`}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={selectedVariantId}
            onChange={(event) => setSelectedVariantId(event.target.value)}
          >
            {product.variants.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {formatMoney(Number(item.price ?? product.price))}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="border-t border-slate-200 p-3">
        <Button
          className="w-full bg-primary text-white disabled:bg-slate-200 disabled:text-slate-500"
          isDisabled={isOutOfStock}
          size="sm"
          type="button"
          onPress={() =>
            onAdd({
              availableStock,
              category: product.category,
              id: `${product.id}:${variant?.id ?? 'base'}`,
              name: variant
                ? `${product.name} · ${variant.name}`
                : product.name,
              note: '',
              productId: product.id,
              quantity: 1,
              sku,
              unitPrice: price,
              variantId: variant?.id ?? null,
            })
          }
        >
          <Icon icon="solar:add-circle-bold" width={18} />
          {isOutOfStock ? 'Unavailable' : 'Add'}
        </Button>
      </div>
    </article>
  );
}

function CartLine({
  item,
  onNote,
  onQuantity,
  onRemove,
}: {
  item: CartItem;
  onNote: (note: string) => void;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{item.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {item.sku} · {formatMoney(item.unitPrice)}
          </p>
        </div>
        <Button
          isIconOnly
          size="sm"
          type="button"
          variant="secondary"
          onPress={onRemove}
        >
          <Icon icon="solar:trash-bin-trash-linear" width={17} />
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-[34px_1fr_34px] items-center gap-2">
        <Button
          isIconOnly
          isDisabled={item.quantity <= 1}
          size="sm"
          type="button"
          variant="secondary"
          onPress={() => onQuantity(item.quantity - 1)}
        >
          <Icon icon="solar:minus-linear" width={16} />
        </Button>
        <div className="h-8 rounded-md border border-slate-200 bg-white text-center text-sm font-semibold leading-8">
          {item.quantity}
        </div>
        <Button
          isIconOnly
          isDisabled={item.quantity >= item.availableStock}
          size="sm"
          type="button"
          variant="secondary"
          onPress={() => onQuantity(item.quantity + 1)}
        >
          <Icon icon="solar:add-circle-linear" width={16} />
        </Button>
      </div>
      <p
        className={`mt-2 text-xs ${
          item.quantity >= item.availableStock
            ? 'font-medium text-amber-700'
            : 'text-slate-500'
        }`}
      >
        {item.quantity >= item.availableStock
          ? `Max stock reached (${item.availableStock})`
          : `${item.availableStock} in stock`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {['To go', 'No sugar', 'Extra hot'].map((choice) => (
          <button
            className={`h-8 rounded-md border px-2 text-xs font-medium ${
              item.note.includes(choice)
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
            key={choice}
            type="button"
            onClick={() => onNote(toggleChoice(item.note, choice))}
          >
            {choice}
          </button>
        ))}
      </div>
      <TextArea
        className="mt-3 min-h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        placeholder="Item note"
        value={item.note}
        onChange={(event) => onNote(event.target.value)}
      />
    </div>
  );
}

function PaymentSelector({
  onChange,
  value,
}: {
  onChange: (value: PaymentMethod) => void;
  value: PaymentMethod;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-600">Payment</p>
      <div className="grid grid-cols-2 gap-2">
        {(['CASH', 'KHQR'] as PaymentMethod[]).map((method) => (
          <button
            className={`h-10 rounded-md border text-sm font-semibold ${
              value === method
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
            key={method}
            type="button"
            onClick={() => onChange(method)}
          >
            {method === 'CASH' ? 'Cash' : 'KHQR'}
          </button>
        ))}
      </div>
    </div>
  );
}

function Summary({
  changeDue,
  discount,
  serviceCharge,
  subtotal,
  tax,
  total,
}: {
  changeDue: number;
  discount: number;
  serviceCharge: number;
  subtotal: number;
  tax: number;
  total: number;
}) {
  return (
    <dl className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
      <SummaryRow label="Subtotal" value={formatMoney(subtotal)} />
      <SummaryRow label="Discount" value={`-${formatMoney(discount)}`} />
      <SummaryRow label="Service" value={formatMoney(serviceCharge)} />
      <SummaryRow label="Tax" value={formatMoney(tax)} />
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd>{formatMoney(total)}</dd>
      </div>
      <SummaryRow label="Change" value={formatMoney(changeDue)} />
    </dl>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ActiveOrders({
  error,
  orders,
}: {
  error: string | null;
  orders: unknown[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">Active order list</h2>
        <Chip color="accent" variant="soft">
          {orders.length} open
        </Chip>
      </div>
      <Separator />
      {error ? (
        <DataNotice message={error} title="Unable to load POS orders" />
      ) : null}
      <div className="divide-y divide-slate-100">
        {!error && orders.length ? (
          orders.map((order, index) => (
            <div
              className="flex items-center justify-between px-4 py-3"
              key={index}
            >
              <div>
                <p className="text-sm font-semibold">Order {index + 1}</p>
                <p className="text-xs text-slate-500">
                  Synced from commerce API
                </p>
              </div>
              <Chip variant="soft">In progress</Chip>
            </div>
          ))
        ) : !error ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No active POS orders yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ReceiptView({
  onNewSale,
  receipt,
}: {
  onNewSale: () => void;
  receipt: PosReceipt;
}) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Chip color="success" variant="soft">
            Paid
          </Chip>
          <h2 className="mt-3 text-2xl font-semibold">{receipt.orderNumber}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {receipt.branchName} · {receipt.cashierName}
          </p>
        </div>
        <Button
          className="bg-primary text-white"
          type="button"
          onPress={onNewSale}
        >
          <Icon icon="solar:add-circle-bold" width={19} />
          New sale
        </Button>
      </div>
      <div className="mt-6 divide-y divide-slate-100">
        {receipt.items.map((item) => (
          <div
            className="flex justify-between gap-4 py-3 text-sm"
            key={item.id}
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-slate-500">Qty {item.quantity}</p>
            </div>
            <p className="font-semibold">
              {formatMoney(item.unitPrice * item.quantity)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <Summary
          changeDue={receipt.changeDue}
          discount={receipt.discount}
          serviceCharge={receipt.serviceCharge}
          subtotal={receipt.subtotal}
          tax={receipt.tax}
          total={receipt.total}
        />
      </div>
    </section>
  );
}

function ModeButton({
  active,
  children,
  isDisabled,
  onPress,
}: {
  active: boolean;
  children: React.ReactNode;
  isDisabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      className={active ? 'bg-primary text-white' : undefined}
      isDisabled={isDisabled}
      size="sm"
      type="button"
      variant={active ? undefined : 'secondary'}
      onPress={onPress}
    >
      {children}
    </Button>
  );
}

function LabeledInput({
  icon,
  inputMode,
  label,
  onChange,
  onEnter,
  placeholder,
  type = 'text',
  value,
}: {
  icon?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      <span className="relative block">
        {icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            icon={icon}
            width={18}
          />
        )}
        <Input
          className={`h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary ${
            icon ? 'pl-9' : ''
          }`}
          inputMode={inputMode}
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onEnter?.();
          }}
        />
      </span>
    </label>
  );
}

function addToCart(
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>,
  item: CartItem,
) {
  if (item.availableStock <= 0) return;

  setCart((current) => {
    const existing = current.find((cartItem) => cartItem.id === item.id);
    if (!existing) return [...current, item];
    if (existing.quantity >= existing.availableStock) return current;

    return current.map((cartItem) =>
      cartItem.id === item.id
        ? {
            ...cartItem,
            quantity: Math.min(
              cartItem.quantity + 1,
              cartItem.availableStock,
            ),
          }
        : cartItem,
    );
  });
}

function addFirstSkuMatch(
  products: PosProduct[],
  query: string,
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>,
) {
  const sku = query.trim().toLowerCase();
  if (!sku) return;

  for (const product of products) {
    const variant = product.variants.find((item) =>
      item.sku.toLowerCase().includes(sku),
    );
    if (variant) {
      const stock = stockForProduct(product, variant.id);
      addToCart(setCart, {
        availableStock: stock,
        category: product.category,
        id: `${product.id}:${variant.id}`,
        name: `${product.name} · ${variant.name}`,
        note: '',
        productId: product.id,
        quantity: 1,
        sku: variant.sku,
        unitPrice: Number(variant.price ?? product.price),
        variantId: variant.id,
      });
      return;
    }

    if (product.sku.toLowerCase().includes(sku)) {
      const stock = stockForProduct(product, null);
      addToCart(setCart, {
        availableStock: stock,
        category: product.category,
        id: `${product.id}:base`,
        name: product.name,
        note: '',
        productId: product.id,
        quantity: 1,
        sku: product.sku,
        unitPrice: Number(product.price),
        variantId: null,
      });
      return;
    }
  }
}

function updateCartItem(
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>,
  itemId: string,
  patch: Partial<Pick<CartItem, 'note' | 'quantity'>>,
) {
  setCart((current) =>
    current.map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...patch,
            quantity: clampQuantity(
              patch.quantity ?? item.quantity,
              item.availableStock,
            ),
          }
        : item,
    ),
  );
}

function stockForProduct(product: PosProduct, variantId: string | null) {
  return (
    product.stocks.find((stock) => stock.variantId === variantId)
      ?.availableStock ?? 0
  );
}

function clampQuantity(quantity: number, availableStock: number) {
  return Math.max(1, Math.min(quantity, Math.max(availableStock, 1)));
}

function validateCartStock(cart: CartItem[]) {
  const invalidItem = cart.find(
    (item) => item.availableStock <= 0 || item.quantity > item.availableStock,
  );

  if (!invalidItem) return null;

  return `${invalidItem.name} only has ${invalidItem.availableStock} in stock.`;
}

function removeFromCart(
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>,
  itemId: string,
) {
  setCart((current) => current.filter((item) => item.id !== itemId));
}

function mergeCategories(categories: PosCategory[], products: PosProduct[]) {
  const merged = new Map<string, PosCategory>();

  merged.set(allCategorySlug, {
    id: allCategorySlug,
    name: 'All',
    slug: allCategorySlug,
    sortOrder: -1,
  });

  for (const category of categories) {
    merged.set(category.slug, category);
  }

  for (const product of products) {
    if (!merged.has(product.categorySlug)) {
      merged.set(product.categorySlug, {
        id: product.categorySlug,
        name: product.category,
        slug: product.categorySlug,
        sortOrder: merged.size,
      });
    }
  }

  return Array.from(merged.values()).sort((first, second) => {
    if (first.slug === allCategorySlug) return -1;
    if (second.slug === allCategorySlug) return 1;

    return (
      first.sortOrder - second.sortOrder ||
      first.name.localeCompare(second.name)
    );
  });
}

function productCountsByCategory(products: PosProduct[]) {
  const counts = new Map<string, number>();

  for (const product of products) {
    counts.set(
      product.categorySlug,
      (counts.get(product.categorySlug) ?? 0) + 1,
    );
  }

  return counts;
}

function toggleChoice(note: string, choice: string) {
  const choices = note
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return choices.includes(choice)
    ? choices.filter((item) => item !== choice).join(', ')
    : [...choices, choice].join(', ');
}

function toMoney(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    currency,
    style: 'currency',
  }).format(value);
}
