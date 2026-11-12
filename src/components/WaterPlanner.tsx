import { useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Check, Repeat, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCatalog } from "@/context/CatalogContext";
import { flyToCart } from "@/lib/cartFlight";
import { DELIVERY_FEE, DELIVERY_THRESHOLD } from "@/lib/delivery";
import { cx, formatZAR } from "@/lib/format";
import { trackMarketing } from "@/lib/marketing";
import {
  DEFAULT_LITRES,
  DAYS_PER_WEEK,
  LITRES_RANGE,
  PEOPLE_RANGE,
  planWater,
  type Fizz,
  type PlannerInput,
  type Setting,
  type Style,
  type Temperature,
} from "@/lib/planner";
import { TransitionLink } from "./TransitionLink";
import { WaterSurface } from "./WaterSurface";

function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="label text-ink-500 dark:text-ink-400">{legend}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(
              "chip relative cursor-pointer select-none has-focus-visible:ring-2 has-focus-visible:ring-brand-500 has-focus-visible:ring-offset-2 dark:has-focus-visible:ring-offset-ink-950",
              option.value === value ? "chip-active" : "chip-idle",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Range({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  display: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="label text-ink-500 dark:text-ink-400">
          {label}
        </label>
        <output htmlFor={id} className="font-display text-lg font-semibold tabular-nums text-ink-900 dark:text-white">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full cursor-pointer accent-brand-600 dark:accent-brand-400"
      />
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{hint}</p>}
    </div>
  );
}

/** A tank that fills with the week's water — transform only, so it can't shift layout. */
function WaterLevel({ litres }: { litres: number }) {
  // Log scale: a couple living alone and a 50-person office both read.
  const fill = Math.min(1, Math.max(0.1, Math.log10(litres + 1) / Math.log10(800)));
  return (
    <div
      aria-hidden
      className="relative h-36 w-24 shrink-0 overflow-hidden rounded-b-[28px] rounded-t-xl border-2 border-brand-200 bg-white/70 shadow-depth-1 dark:border-brand-800 dark:bg-ink-900/60"
    >
      <div
        className="absolute inset-0 bg-linear-to-t from-brand-700 via-brand-500 to-brand-400 transition-transform duration-700 ease-out-expo"
        style={{ transform: `translate3d(0, ${((1 - fill) * 100).toFixed(1)}%, 0)` }}
      >
        <WaterSurface className="bottom-full h-3 text-brand-400 dark:text-brand-400" />
      </div>
      <span className="absolute inset-y-3 left-2 w-1.5 rounded-full bg-white/50" />
    </div>
  );
}

export function WaterPlanner({ className }: { className?: string }) {
  const { products, ready } = useCatalog();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const addRef = useRef<HTMLButtonElement>(null);
  const [added, setAdded] = useState(false);
  const [input, setInput] = useState<PlannerInput>({
    setting: "home",
    people: 4,
    litresPerPerson: DEFAULT_LITRES.home,
    style: "bottled",
    fizz: "still",
    temperature: "hot-cold",
  });

  const update = (patch: Partial<PlannerInput>) => {
    setAdded(false);
    setInput((current) => ({ ...current, ...patch }));
  };

  const plan = useMemo(() => planWater(input), [input]);

  const lines = plan.lines.flatMap((line) => {
    const product = products.find((p) => p.id === line.productId);
    if (!product) return [];
    const available = Math.max(0, Math.min(line.quantity, product.stock));
    return [{ ...line, product, available }];
  });
  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.available, 0);
  const canAdd = ready && lines.some((l) => l.available > 0);
  const repeatable = lines.find((l) => l.consumable && l.available > 0);
  const perDay = plan.weeklyLitres / DAYS_PER_WEEK[input.setting];

  const addSetup = () => {
    for (const line of lines) {
      if (line.available <= 0) continue;
      addItem(line.product, line.available);
      trackMarketing({
        type: "add_to_cart",
        productId: line.product.id,
        name: line.product.name,
        price: line.product.price,
        quantity: line.available,
      });
    }
    flyToCart(addRef.current);
    setAdded(true);
  };

  const repeat = () => {
    if (!repeatable) return;
    navigate("/account", {
      state: {
        newSubscription: {
          productId: repeatable.product.id,
          quantity: repeatable.available,
          frequency: "weekly",
        },
      },
    });
  };

  return (
    <div
      className={cx(
        "glass-card grid overflow-hidden rounded-[32px] lg:grid-cols-[1.1fr_1fr]",
        className,
      )}
    >
      <form className="space-y-7 p-6 sm:p-10" onSubmit={(event) => event.preventDefault()}>
        <div>
          <p className="label text-brand-700 dark:text-brand-300">Water planner</p>
          <h2 className="display-2 mt-3">
            How much water <span className="accent">do you need?</span>
          </h2>
          <p className="mt-3 max-w-md leading-relaxed text-ink-600 dark:text-ink-300">
            Tell us who's drinking and how. We'll work out a week's water and the setup to match.
          </p>
        </div>

        <Segmented<Setting>
          legend="Where"
          name="planner-setting"
          value={input.setting}
          options={[
            { value: "home", label: "Home" },
            { value: "office", label: "Office" },
          ]}
          onChange={(setting) => update({ setting, litresPerPerson: DEFAULT_LITRES[setting] })}
        />

        <Range
          label="People"
          value={input.people}
          min={PEOPLE_RANGE.min}
          max={PEOPLE_RANGE.max}
          display={`${input.people} ${input.people === 1 ? "person" : "people"}`}
          onChange={(people) => update({ people })}
        />

        <Range
          label={`Litres each, per ${input.setting === "home" ? "day" : "workday"}`}
          value={input.litresPerPerson}
          min={LITRES_RANGE.min}
          max={LITRES_RANGE.max}
          step={LITRES_RANGE.step}
          display={`${input.litresPerPerson.toFixed(2).replace(/\.?0+$/, "")} L`}
          hint="About 2 L a day at home and 1 L a workday at the office are common rules of thumb — adjust to suit."
          onChange={(litresPerPerson) => update({ litresPerPerson })}
        />

        <Segmented<Style>
          legend="How you drink it"
          name="planner-style"
          value={input.style}
          options={[
            { value: "bottled", label: "Bottled, by the case" },
            { value: "dispenser", label: "From a cooler" },
          ]}
          onChange={(style) => update({ style })}
        />

        {input.style === "bottled" ? (
          <Segmented<Fizz>
            legend="Still or sparkling"
            name="planner-fizz"
            value={input.fizz}
            options={[
              { value: "still", label: "Still" },
              { value: "sparkling", label: "Sparkling" },
              { value: "mixed", label: "A mix" },
            ]}
            onChange={(fizz) => update({ fizz })}
          />
        ) : (
          <Segmented<Temperature>
            legend="Temperature"
            name="planner-temperature"
            value={input.temperature}
            options={[
              { value: "hot-cold", label: "Hot & cold" },
              { value: "cold", label: "Cold only" },
            ]}
            onChange={(temperature) => update({ temperature })}
          />
        )}
      </form>

      <div className="relative flex flex-col bg-linear-to-b from-brand-50/90 to-white/80 p-6 sm:p-10 dark:from-ink-900/80 dark:to-ink-950/80">
        <div className="flex items-end gap-5" aria-live="polite" aria-atomic="true">
          <WaterLevel litres={plan.weeklyLitres} />
          <div>
            <p className="font-display text-5xl font-semibold tracking-tight tabular-nums text-ink-900 dark:text-white">
              {Math.round(plan.weeklyLitres)} L
            </p>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
              a week — about {perDay.toFixed(perDay < 10 ? 1 : 0)} L a {input.setting === "home" ? "day" : "workday"}
            </p>
          </div>
        </div>

        <h3 className="label mt-8 text-ink-500 dark:text-ink-400">Your setup</h3>
        <ul className="mt-3 divide-y divide-ink-200/70 dark:divide-white/10">
          {lines.map((line) => (
            <li key={line.productId} className="flex items-center gap-3 py-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-depth-1">
                <img
                  src={line.product.image}
                  alt=""
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              </span>
              <span className="min-w-0 flex-1">
                <TransitionLink
                  to={`/product/${line.product.slug}`}
                  className="block truncate text-sm font-semibold text-ink-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-300"
                >
                  {line.product.name}
                </TransitionLink>
                <span className="block text-xs text-ink-500 dark:text-ink-400">
                  {line.available === line.quantity
                    ? line.why
                    : line.available === 0
                      ? "Sold out right now"
                      : `Only ${line.available} in stock — we'll add ${line.available}`}
                </span>
              </span>
              <span className="text-right text-sm tabular-nums">
                <span className="block font-semibold text-ink-900 dark:text-white">× {line.quantity}</span>
                <span className="block text-xs text-ink-500 dark:text-ink-400">
                  {formatZAR(line.product.price * line.available)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-600 dark:text-ink-300">Setup total</span>
            <span className="font-display text-2xl font-semibold tabular-nums text-ink-900 dark:text-white">
              {formatZAR(subtotal)}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            {subtotal >= DELIVERY_THRESHOLD
              ? "Free delivery."
              : `${formatZAR(DELIVERY_FEE)} delivery — free from ${formatZAR(DELIVERY_THRESHOLD)}.`}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              ref={addRef}
              type="button"
              onClick={addSetup}
              disabled={!canAdd}
              className={cx(
                added ? "btn bg-emerald-600 text-white hover:bg-emerald-700" : "btn-primary",
                "flex-1 px-5 py-3",
              )}
            >
              {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              {added ? "Added to cart" : "Add setup to cart"}
            </button>
            {repeatable && (
              <button type="button" onClick={repeat} className="btn-outline px-5 py-3">
                <Repeat className="h-4 w-4" /> Make it weekly
              </button>
            )}
          </div>
          {added && (
            <TransitionLink
              to="/cart"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
            >
              View cart <ArrowRight className="h-4 w-4" />
            </TransitionLink>
          )}
        </div>
      </div>
    </div>
  );
}
