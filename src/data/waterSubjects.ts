/*
  The five "subjects of water" — one source for the Home dive, the /water
  guide and the planner's links. Copy is general and factual: no health
  claims, and nothing about a product the catalogue doesn't say itself.
*/
import { Droplets, Funnel, Mountain, Recycle, ThermometerSnowflake } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PhotoSlot } from "./photos";

export type SubjectId = "source" | "purity" | "sparkling" | "temperature" | "refill";

export interface WaterSubject {
  id: SubjectId;
  index: string;
  eyebrow: string;
  icon: LucideIcon;
  /** Headline split so the last words can take the accent serif. */
  title: string;
  accent: string;
  summary: string;
  /** Longer copy for the /water guide. */
  body: string[];
  photos: [PhotoSlot] | [PhotoSlot, PhotoSlot];
  /** Catalogue ids to surface alongside; missing or sold-out ones are skipped. */
  productIds: string[];
  link: { label: string; to: string };
}

export const waterSubjects: WaterSubject[] = [
  {
    id: "source",
    index: "01",
    eyebrow: "Source",
    icon: Mountain,
    title: "It all starts",
    accent: "underground.",
    summary:
      "Spring and mineral water rise from underground, filtered by rock on the way and carrying the minerals that give each water its taste.",
    body: [
      "Spring water comes from an underground source and flows, or is drawn, to the surface. As rain soaks down and the water makes its way back up, layers of rock and sand filter it naturally.",
      "Mineral water carries what it picked up on that journey — calcium, magnesium, bicarbonates. Those minerals are why two still waters can taste so different: one crisp, one soft and round.",
      "The label tells the story. It names the source, and most list the mineral content too.",
    ],
    photos: ["source"],
    productIds: ["atw-005", "atw-008"],
    link: { label: "Shop still water", to: "/shop?category=bottled-water" },
  },
  {
    id: "purity",
    index: "02",
    eyebrow: "Purity",
    icon: Funnel,
    title: "Clean water,",
    accent: "kept clean.",
    summary:
      "Filtration takes out what you don't want — sediment, and the taste and smell of chlorine — so the water tastes as clear as it looks.",
    body: [
      "Most filters work in stages. A sediment stage catches sand and rust; an activated-carbon stage takes up chlorine and many of the compounds behind off tastes and smells.",
      "Some systems add a reverse-osmosis membrane, which removes a far wider range of dissolved substances — including most of the minerals.",
      "A filter only works while it's fresh. Past its life, a cartridge stops doing its job, so replace it on the maker's schedule. Once water is bottled, a sealed cap keeps it that way.",
    ],
    photos: ["purity"],
    productIds: ["atw-004"],
    link: { label: "Ask us about filtration", to: "/contact" },
  },
  {
    id: "sparkling",
    index: "03",
    eyebrow: "Still or sparkling",
    icon: Droplets,
    title: "Still, or with",
    accent: "a little fizz.",
    summary:
      "Sparkling water is water with carbon dioxide dissolved in it. The bubbles are that gas escaping the moment you open the bottle.",
    body: [
      "Carbonation is carbon dioxide dissolved under pressure. Open the bottle, the pressure drops, and the gas comes out of the water as bubbles.",
      "Dissolved CO₂ forms a little carbonic acid, which gives sparkling water its gentle bite. Cold water holds gas better than warm, which is why it tastes fizziest straight from the fridge.",
      "Keep the cap on tight between pours and the fizz lasts longer.",
    ],
    photos: ["sparkling"],
    productIds: ["atw-007", "atw-008"],
    link: { label: "Shop bottled water", to: "/shop?category=bottled-water" },
  },
  {
    id: "temperature",
    index: "04",
    eyebrow: "Hot & cold",
    icon: ThermometerSnowflake,
    title: "Ice-cold or",
    accent: "steaming, on tap.",
    summary:
      "A hot-and-cold cooler pours chilled water at 5–10 °C and hot at 90–95 °C, with a child-safe lock on the hot tap.",
    body: [
      "A floor-standing cooler keeps one small tank chilled and another heated, so both are ready the moment you press a tap.",
      "Cold water at 5–10 °C is ready to drink; hot water at 90–95 °C is ready for tea. A child-safe lock keeps the hot tap closed until you mean it.",
      "Counter-top units save floor space in small kitchens and offices. Floor units suit busy reception areas.",
    ],
    photos: ["hot", "cold"],
    productIds: ["atw-001", "atw-002"],
    link: { label: "Shop dispensers", to: "/shop?category=dispensers" },
  },
  {
    id: "refill",
    index: "05",
    eyebrow: "Refill & reuse",
    icon: Recycle,
    title: "Refill,",
    accent: "don't rebuy.",
    summary:
      "One 18.9 L bottle holds as much as about 38 half-litre bottles. Keep a few in rotation, refill, and the plastic stays out of the bin.",
    body: [
      "The 18.9-litre (5-gallon) bottle is the standard for top-loading coolers, and it's built to be refilled again and again.",
      "Keep two or three in rotation: there's always a full one on the cooler while the empties are being refilled.",
      "A spare cap seals an opened bottle for the trip home and for storage — no spills in the car.",
    ],
    photos: ["refill"],
    productIds: ["atw-003", "atw-004"],
    link: { label: "Plan my setup", to: "/water#planner" },
  },
];
