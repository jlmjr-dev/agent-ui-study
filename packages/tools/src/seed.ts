/**
 * The workspace the tools operate on. A demo of a coding agent needs a
 * codebase to point at, and a real repository would be far too much to read,
 * so this is a deliberately small one: enough files that listing, globbing and
 * grepping return something interesting, small enough to read end to end.
 *
 * The bug in `cart.ts` is intentional. It is what the scripted "find the bug"
 * conversation actually finds.
 */
export const SEED_WORKSPACE: Record<string, string> = {
  "README.md": `# storefront

A small order-taking service. Prices are integers in cents everywhere;
formatting to a currency string happens once, at the edge.

- \`src/cart.ts\` totals a cart
- \`src/pricing.ts\` discounts and tax
- \`src/format.ts\` money and dates for display
`,

  "package.json": `{
  "name": "storefront",
  "version": "1.4.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "build": "tsc -b"
  }
}
`,

  "src/types.ts": `export type Money = number

export type LineItem = {
  sku: string
  name: string
  unitPrice: Money
  quantity: number
}

export type Discount = {
  code: string
  kind: "percent" | "fixed"
  value: number
}

export type Cart = {
  items: LineItem[]
  discount: Discount | null
  taxRate: number
}
`,

  "src/cart.ts": `import { applyDiscount, taxOn } from "./pricing"
import type { Cart, Money } from "./types"

export function subtotal(cart: Cart): Money {
  return cart.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  )
}

export function total(cart: Cart): Money {
  const base = subtotal(cart)
  const discounted = applyDiscount(base, cart.discount)

  return discounted + taxOn(base, cart.taxRate)
}
`,

  "src/pricing.ts": `import type { Discount, Money } from "./types"

export function applyDiscount(amount: Money, discount: Discount | null): Money {
  if (!discount) return amount

  if (discount.kind === "percent") {
    return Math.round(amount * (1 - discount.value / 100))
  }

  return Math.max(0, amount - discount.value)
}

export function taxOn(amount: Money, rate: number): Money {
  return Math.round(amount * rate)
}
`,

  "src/format.ts": `import type { Money } from "./types"

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function formatMoney(amount: Money): string {
  return formatter.format(amount / 100)
}

export function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}
`,

  "src/checkout.ts": `import { total } from "./cart"
import { formatMoney } from "./format"
import type { Cart } from "./types"

export function summarize(cart: Cart): string {
  const lines = cart.items.map(
    (item) => \`\${item.quantity} x \${item.name}, \${formatMoney(item.unitPrice)}\`
  )

  lines.push(\`Total: \${formatMoney(total(cart))}\`)

  return lines.join("\\n")
}
`,

  "src/cart.test.ts": `import { describe, expect, it } from "vitest"

import { subtotal, total } from "./cart"

const cart = {
  items: [
    { sku: "a", name: "Mug", unitPrice: 1200, quantity: 2 },
    { sku: "b", name: "Beans", unitPrice: 1850, quantity: 1 },
  ],
  discount: null,
  taxRate: 0.1,
}

describe("cart", () => {
  it("sums the line items", () => {
    expect(subtotal(cart)).toBe(4250)
  })

  it("adds tax to the total", () => {
    expect(total(cart)).toBe(4675)
  })
})
`,

  "src/pricing.test.ts": `import { describe, expect, it } from "vitest"

import { applyDiscount, taxOn } from "./pricing"

describe("applyDiscount", () => {
  it("takes a percentage off", () => {
    expect(applyDiscount(1000, { code: "TEN", kind: "percent", value: 10 })).toBe(900)
  })

  it("never goes below zero on a fixed discount", () => {
    expect(applyDiscount(500, { code: "BIG", kind: "fixed", value: 900 })).toBe(0)
  })
})

describe("taxOn", () => {
  it("rounds to the nearest cent", () => {
    expect(taxOn(1005, 0.0825)).toBe(83)
  })
})
`,

  "docs/decisions.md": `# Decisions

## Money is an integer number of cents

Floats lose money. Every amount in \`src/\` is an integer, and \`formatMoney\`
is the only place that divides by 100.

## Discounts apply before tax

The tax authority we file with expects tax on the discounted amount. This is
written down here because the code has been wrong about it before.
`,

  ".gitignore": `node_modules
dist
`,
}
