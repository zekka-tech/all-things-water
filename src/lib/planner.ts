/*
  Water Planner: people + habits in, litres per week and a setup out. Pure so
  it can be tested without the catalogue; the component resolves product ids
  against live stock.
*/

export type Setting = "home" | "office";
export type Style = "bottled" | "dispenser";
export type Fizz = "still" | "sparkling" | "mixed";
export type Temperature = "hot-cold" | "cold";

export interface PlannerInput {
  setting: Setting;
  people: number;
  /** A rule of thumb the visitor can change — not health advice. */
  litresPerPerson: number;
  style: Style;
  fizz: Fizz;
  temperature: Temperature;
}

export interface PlanLine {
  productId: string;
  quantity: number;
  /** Short reason shown under the line. */
  why: string;
  /** Whether it's used up and re-bought (worth a repeat order). */
  consumable: boolean;
}

export interface Plan {
  weeklyLitres: number;
  lines: PlanLine[];
}

export const PEOPLE_RANGE = { min: 1, max: 50 } as const;
export const LITRES_RANGE = { min: 0.5, max: 4, step: 0.25 } as const;
export const DEFAULT_LITRES: Record<Setting, number> = { home: 2, office: 1 };
export const DAYS_PER_WEEK: Record<Setting, number> = { home: 7, office: 5 };

/** 24 × 500 ml. */
export const CASE_LITRES = 12;
export const BOTTLE_LITRES = 18.9;

export const PRODUCT_IDS = {
  still: "atw-008",
  sparkling: "atw-007",
  floorCooler: "atw-001",
  counterCooler: "atw-002",
  bottle: "atw-003",
  cap: "atw-004",
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function weeklyLitres(input: Pick<PlannerInput, "setting" | "people" | "litresPerPerson">) {
  const people = Math.round(clamp(input.people, PEOPLE_RANGE.min, PEOPLE_RANGE.max));
  const litres = clamp(input.litresPerPerson, LITRES_RANGE.min, LITRES_RANGE.max);
  return Math.round(people * litres * DAYS_PER_WEEK[input.setting] * 10) / 10;
}

export function planWater(input: PlannerInput): Plan {
  const litres = weeklyLitres(input);

  if (input.style === "bottled") {
    const cases = Math.max(1, Math.ceil(litres / CASE_LITRES));
    const why = `${CASE_LITRES} L per case of 24`;
    if (input.fizz === "mixed") {
      const still = Math.ceil(cases / 2);
      const sparkling = Math.max(1, cases - still);
      return {
        weeklyLitres: litres,
        lines: [
          { productId: PRODUCT_IDS.still, quantity: still, why, consumable: true },
          { productId: PRODUCT_IDS.sparkling, quantity: sparkling, why, consumable: true },
        ],
      };
    }
    return {
      weeklyLitres: litres,
      lines: [{ productId: PRODUCT_IDS[input.fizz], quantity: cases, why, consumable: true }],
    };
  }

  // A week's water across 18.9 L bottles, plus one spare so a full bottle is
  // always waiting while the empties are out being refilled.
  const bottles = Math.max(2, Math.ceil(litres / BOTTLE_LITRES) + 1);
  return {
    weeklyLitres: litres,
    lines: [
      {
        productId:
          input.temperature === "hot-cold" ? PRODUCT_IDS.floorCooler : PRODUCT_IDS.counterCooler,
        quantity: 1,
        why: input.temperature === "hot-cold" ? "Hot and cold on tap" : "Compact, cold on tap",
        consumable: false,
      },
      {
        productId: PRODUCT_IDS.bottle,
        quantity: bottles,
        why: "A week's water plus one spare in rotation",
        consumable: false,
      },
      { productId: PRODUCT_IDS.cap, quantity: bottles, why: "One per bottle", consumable: false },
    ],
  };
}
