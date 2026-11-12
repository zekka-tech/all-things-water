import { assertEquals } from "jsr:@std/assert";
import { validateCatalogUpdates } from "./catalog-validation.ts";

Deno.test("catalogue changes accept editable fields and reject invalid or privileged fields", () => {
  assertEquals(
    validateCatalogUpdates({
      updates: [{
        id: "p1",
        price: 200,
        stock: 0,
        visible: false,
        name: " New name ",
      }],
    }),
    {
      ok: true,
      updates: [{
        id: "p1",
        price: 200,
        stock: 0,
        visible: false,
        name: "New name",
      }],
    },
  );
  for (
    const update of [
      { id: "p1", price: 0 },
      { id: "p1", stock: -1 },
      { id: "p1", stock: 2.5 },
      { id: "p1", stock: "2" },
      { id: "p1", cost: NaN },
      { id: "p1", visible: "false" },
      { id: "p1", name: " " },
      { id: "p1", reserved_stock: 0 },
      null,
      [],
    ]
  ) assertEquals(validateCatalogUpdates({ updates: [update] }).ok, false);
  assertEquals(
    validateCatalogUpdates({
      updates: [{ id: "p1", stock: 1 }, { id: "p1", stock: 2 }],
    }).ok,
    false,
  );
});

Deno.test("legacy stock updates remain accepted during rolling deployments", () => {
  assertEquals(
    validateCatalogUpdates({
      stockUpdates: { p1: 3 },
      auditEvents: [{ performedBy: "forged" }],
    }),
    {
      ok: true,
      updates: [{ id: "p1", stock: 3 }],
    },
  );
});
