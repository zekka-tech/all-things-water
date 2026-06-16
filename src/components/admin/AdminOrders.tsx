import { useMemo } from "react";
import { formatZAR, cx } from "@/lib/format";
import { ClipboardList } from "lucide-react";

// ── Types ──
interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}

interface MockOrder {
  ref: string;
  date: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "processing" | "completed";
}

// ── Mock Orders ──
const MOCK_ORDERS: MockOrder[] = [
  {
    ref: "ATW-2024-001",
    date: "2024-06-01T10:30:00",
    customerName: "Thabo Molefe",
    items: [
      { productName: "Hot & Cold Water Cooler YLR-805LB", quantity: 1, price: 2645 },
      { productName: "18.9L Water Dispenser Bottle", quantity: 2, price: 150 },
    ],
    total: 2945,
    status: "completed",
  },
  {
    ref: "ATW-2024-002",
    date: "2024-06-02T14:15:00",
    customerName: "Priya Naidoo",
    items: [
      { productName: "Aquafria Sparkling 500ml", quantity: 3, price: 120 },
      { productName: "Aquafria Still 500ml", quantity: 2, price: 120 },
    ],
    total: 600,
    status: "completed",
  },
  {
    ref: "ATW-2024-003",
    date: "2024-06-03T09:00:00",
    customerName: "James van der Merwe",
    items: [
      { productName: "Counter Top Water Cooler YLR 95TB", quantity: 1, price: 1800 },
    ],
    total: 1800,
    status: "processing",
  },
  {
    ref: "ATW-2024-004",
    date: "2024-06-03T11:45:00",
    customerName: "Lerato Khumalo",
    items: [
      { productName: "Monate Water 500ml", quantity: 4, price: 175 },
      { productName: "Caps for 5-Gallon Bottle", quantity: 10, price: 10 },
    ],
    total: 800,
    status: "processing",
  },
  {
    ref: "ATW-2024-005",
    date: "2024-06-04T08:30:00",
    customerName: "David Nkosi",
    items: [{ productName: "Voss Original 800ml", quantity: 1, price: 1500 }],
    total: 1500,
    status: "pending",
  },
  {
    ref: "ATW-2024-006",
    date: "2024-06-04T16:00:00",
    customerName: "Sarah Williams",
    items: [
      { productName: "Aquafria Sparkling 500ml", quantity: 2, price: 120 },
      { productName: "Monate Water 500ml", quantity: 1, price: 175 },
      { productName: "Caps for 5-Gallon Bottle", quantity: 5, price: 10 },
    ],
    total: 465,
    status: "pending",
  },
  {
    ref: "ATW-2024-007",
    date: "2024-06-05T12:00:00",
    customerName: "Michael Dlamini",
    items: [
      { productName: "Hot & Cold Water Cooler YLR-805LB", quantity: 1, price: 2645 },
      { productName: "18.9L Water Dispenser Bottle", quantity: 3, price: 150 },
    ],
    total: 3095,
    status: "completed",
  },
];

// ── Status badge helper ──
function orderStatusBadge(status: MockOrder["status"]) {
  const map = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
    processing: { label: "Processing", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
    completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  };
  return map[status];
}

export default function AdminOrders() {
  // Check if there are any orders (from localStorage or mock data)
  const orders = useMemo(() => {
    // In a real app this would come from a backend — using mock data for now
    return MOCK_ORDERS;
  }, []);

  if (orders.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
          <ClipboardList className="h-7 w-7" />
        </div>
        <h3 className="font-display font-semibold text-ink-700 dark:text-ink-200">No orders yet</h3>
        <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">
          Orders will appear here once your store starts receiving them.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-800/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400">Reference</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400 sm:table-cell">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400">Customer</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400 lg:table-cell">Items</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ink-500 dark:text-ink-400">Total</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-ink-500 dark:text-ink-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {orders.map((order) => {
              const status = orderStatusBadge(order.status);
              const date = new Date(order.date).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const itemSummary = order.items
                .map((i) => `${i.quantity}× ${i.productName}`)
                .join(", ");

              return (
                <tr
                  key={order.ref}
                  className="transition-colors hover:bg-ink-50/50 dark:hover:bg-ink-800/20"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {order.ref}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-500 dark:text-ink-400 sm:table-cell">{date}</td>
                  <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{order.customerName}</td>
                  <td className="hidden max-w-[200px] truncate px-4 py-3 text-ink-500 dark:text-ink-400 lg:table-cell">
                    {itemSummary}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink-900 dark:text-white">
                    {formatZAR(order.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cx("badge", status.color)}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
