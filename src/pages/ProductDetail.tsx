import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Calculator, Check, Repeat, ShoppingCart, Tag } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { StockBadge } from "@/components/StockBadge";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ProductReviews } from "@/components/ProductReviews";
import { Product3DPanel } from "@/components/Product3DPanel";
import { TransitionLink } from "@/components/TransitionLink";
import { FREQUENCY_OPTIONS, type Frequency } from "@/lib/subscriptions";
import { useCatalog } from "@/context/CatalogContext";
import { categoryLabel } from "@/data/categories";
import { photos } from "@/data/photos";
import { waterSubjects } from "@/data/waterSubjects";
import { BackInStockNotify } from "@/components/BackInStockNotify";
import { formatZAR } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { flyToCart } from "@/lib/cartFlight";
import { trackMarketing } from "@/lib/marketing";
import { NotFound } from "./NotFound";

export function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { products, ready } = useCatalog();
  const product = products.find((p) => p.slug === slug);
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [subFrequency, setSubFrequency] = useState<Frequency>("monthly");
  const addRef = useRef<HTMLButtonElement>(null);

  if (!product) return <NotFound />;

  // The guide chapter this product belongs to, if any.
  const subject = waterSubjects.find((s) => s.productIds.includes(product.id));

  const soldOut = !ready || product.stock <= 0;
  const related = products.filter((p) => p.id !== product.id)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, 3);

  const handleAdd = () => {
    addItem(product, qty);
    trackMarketing({
      type: "add_to_cart",
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
    });
    flyToCart(addRef.current);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const handleSubscribe = () => {
    navigate("/account", {
      state: {
        newSubscription: {
          productId: product.id,
          quantity: qty,
          frequency: subFrequency,
        },
      },
    });
  };

  return (
    <>
      <Seo title={product.name} description={product.tagline} />

      <div className="container-page py-8">
        {/* Breadcrumb */}
        <TransitionLink
          to="/shop"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </TransitionLink>

        {/* Product layout */}
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          {/* Image panel */}
          <div className="animate-fade-in">
            <Product3DPanel src={product.image} alt={product.name} />
          </div>

          {/* Details panel */}
          <div className="animate-fade-in-delay flex flex-col">
            {/* Category + stock */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                <Tag className="h-3 w-3" />
                {categoryLabel(product.category)}
              </span>
              <StockBadge stock={product.stock} />
            </div>

            <h1 className="mt-4 text-balance font-display text-[clamp(1.875rem,3.2vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink-900 dark:text-white">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-ink-900 dark:text-white">
                {formatZAR(product.price)}
              </span>
              <span className="text-sm text-ink-500 dark:text-ink-400">/ {product.unit}</span>
            </div>

            <p className="mt-5 leading-relaxed text-ink-600 dark:text-ink-300">
              {product.description}
            </p>

            {/* Features */}
            <ul className="mt-6 space-y-2.5">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 dark:bg-brand-500/15">
                    <Check className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                  </span>
                  <span className="text-ink-700 dark:text-ink-200">{f}</span>
                </li>
              ))}
            </ul>

            {/* Quantity + CTA */}
            <div className="mt-auto pt-8">
              <div className="flex flex-wrap items-center gap-4">
                {!soldOut && (
                  <QuantityStepper value={qty} max={product.stock} onChange={setQty} />
                )}
                <button
                  ref={addRef}
                  type="button"
                  onClick={handleAdd}
                  disabled={soldOut}
                  className={
                    added
                      ? "btn bg-emerald-600 px-6 py-3 text-base text-white hover:bg-emerald-700"
                      : "btn-primary px-6 py-3 text-base"
                  }
                >
                  {added ? (
                    <>
                      <Check className="h-5 w-5" /> Added to cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      {soldOut ? "Sold out" : "Add to cart"}
                    </>
                  )}
                </button>
              </div>

              {soldOut && (
                <BackInStockNotify productId={product.id} />
              )}

              <TransitionLink
                to="/water#planner"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-300"
              >
                <Calculator className="h-4 w-4" aria-hidden />
                Not sure how much you need? Plan your water
              </TransitionLink>

              {/* Repeat delivery */}
              {!soldOut && (
                <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
                    <Repeat className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    Subscribe for regular delivery
                  </p>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                    Never run out. We&rsquo;ll email a one-click pay link each time
                    it&rsquo;s due — no card details stored.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <select
                      aria-label="Delivery frequency"
                      value={subFrequency}
                      onChange={(e) => setSubFrequency(e.target.value as Frequency)}
                      className="input max-w-48"
                    >
                      {FREQUENCY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSubscribe}
                      className="btn-outline px-5 py-2.5 text-sm"
                    >
                      Set up repeat delivery
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* From the guide: the subject this product belongs to */}
        {subject && (
          <section
            aria-labelledby="subject-title"
            className="glass-card mt-16 grid overflow-hidden rounded-[28px] md:grid-cols-[2fr_3fr]"
          >
            <img
              src={photos[subject.photos[0]].src}
              srcSet={photos[subject.photos[0]].srcSet}
              sizes="(min-width: 768px) 40vw, 100vw"
              width={photos[subject.photos[0]].width}
              height={photos[subject.photos[0]].height}
              alt=""
              loading="lazy"
              decoding="async"
              className="aspect-[16/9] h-full w-full object-cover md:aspect-auto"
            />
            <div className="p-6 sm:p-8">
              <p className="label flex items-center gap-2 text-brand-700 dark:text-brand-300">
                <subject.icon className="h-4 w-4" aria-hidden /> From the water guide · {subject.eyebrow}
              </p>
              <h2 id="subject-title" className="mt-3 text-balance font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900 dark:text-white sm:text-3xl">
                {subject.title} <span className="accent">{subject.accent}</span>
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-ink-600 dark:text-ink-300">{subject.summary}</p>
              <TransitionLink
                to={`/water#${subject.id}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-[gap] hover:gap-2.5 dark:text-brand-300"
              >
                Read the chapter <ArrowRight className="h-4 w-4" aria-hidden />
              </TransitionLink>
            </div>
          </section>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="section-title">
              You may also <span className="accent">like.</span>
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        <ProductReviews productId={product.id} />
      </div>
    </>
  );
}
