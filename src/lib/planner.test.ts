import { planWater, weeklyLitres, type PlannerInput } from "./planner";

const base: PlannerInput = {
  setting: "home",
  people: 4,
  litresPerPerson: 2,
  style: "bottled",
  fizz: "still",
  temperature: "hot-cold",
};

describe("weeklyLitres", () => {
  it("counts every day at home and working days at the office", () => {
    expect(weeklyLitres({ setting: "home", people: 4, litresPerPerson: 2 })).toBe(56);
    expect(weeklyLitres({ setting: "office", people: 10, litresPerPerson: 1 })).toBe(50);
  });

  it("clamps out-of-range input instead of producing nonsense", () => {
    expect(weeklyLitres({ setting: "home", people: 500, litresPerPerson: 2 })).toBe(700);
    expect(weeklyLitres({ setting: "home", people: 0, litresPerPerson: 0 })).toBe(3.5);
    expect(weeklyLitres({ setting: "home", people: 2.6, litresPerPerson: 99 })).toBe(84);
  });
});

describe("planWater — bottled", () => {
  it("rounds up to whole 12 L cases of the chosen water", () => {
    // 56 L → 4.67 cases → 5
    expect(planWater(base).lines).toEqual([
      expect.objectContaining({ productId: "atw-008", quantity: 5, consumable: true }),
    ]);
    expect(planWater({ ...base, fizz: "sparkling" }).lines[0]).toMatchObject({
      productId: "atw-007",
      quantity: 5,
    });
  });

  it("never plans zero cases", () => {
    const plan = planWater({ ...base, people: 1, litresPerPerson: 0.5 });
    expect(plan.weeklyLitres).toBe(3.5);
    expect(plan.lines[0].quantity).toBe(1);
  });

  it("splits a mixed plan, favouring still, with at least one of each", () => {
    expect(planWater({ ...base, fizz: "mixed" }).lines.map((l) => l.quantity)).toEqual([3, 2]);
    expect(
      planWater({ ...base, people: 1, litresPerPerson: 1, fizz: "mixed" }).lines.map(
        (l) => l.quantity,
      ),
    ).toEqual([1, 1]);
  });
});

describe("planWater — dispenser", () => {
  const dispenser: PlannerInput = { ...base, style: "dispenser" };

  it("picks the floor cooler for hot & cold and the counter-top for cold only", () => {
    expect(planWater(dispenser).lines[0].productId).toBe("atw-001");
    expect(planWater({ ...dispenser, temperature: "cold" }).lines[0].productId).toBe("atw-002");
  });

  it("keeps a week of bottles plus a spare, with a cap for each", () => {
    // 56 L → 2.96 bottles → 3, plus a spare
    const [, bottles, caps] = planWater(dispenser).lines;
    expect(bottles).toMatchObject({ productId: "atw-003", quantity: 4 });
    expect(caps).toMatchObject({ productId: "atw-004", quantity: 4 });
  });

  it("keeps at least two bottles in rotation for tiny households", () => {
    const plan = planWater({ ...dispenser, people: 1, litresPerPerson: 0.5 });
    expect(plan.lines[1].quantity).toBe(2);
  });

  it("marks hardware as non-consumable, so it isn't offered as a repeat order", () => {
    expect(planWater(dispenser).lines.every((l) => !l.consumable)).toBe(true);
  });
});
