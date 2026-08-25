import type { Scenario, ScriptedStep } from "./scenario"

const FIXED_CART = `import { applyDiscount, taxOn } from "./pricing"
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

  return discounted + taxOn(discounted, cart.taxRate)
}
`

const debugging: Scenario = {
  id: "debugging",
  label: "Debug the cart total",
  prompt:
    "Something is wrong with the cart total when a discount is applied. Find it.",
  keywords: ["bug", "wrong", "cart total", "discount", "broken", "fix"],
  turns: [
    [
      {
        type: "thinking",
        text: "A total that is only wrong with a discount applied points at the order of operations between the discount and the tax, not at the arithmetic itself. I should read the cart and pricing modules, and check whether the project has written down which order it wants.",
      },
      {
        type: "text",
        text: "I'll read the cart and pricing code, then check what the project says the order should be.\n\n",
      },
      {
        type: "tool",
        name: "set_todos",
        input: {
          items: [
            { text: "Read the cart and pricing modules", done: false },
            {
              text: "Confirm the intended discount and tax order",
              done: false,
            },
            { text: "Fix the calculation", done: false },
            { text: "Run the test suite", done: false },
          ],
        },
      },
      { type: "tool", name: "read_file", input: { path: "src/cart.ts" } },
      { type: "tool", name: "read_file", input: { path: "src/pricing.ts" } },
    ],
    [
      {
        type: "text",
        text: "Found it. In `total`, the discount is applied to the subtotal but the tax is computed from `base`, the amount *before* the discount:\n\n```ts\nconst discounted = applyDiscount(base, cart.discount)\n\nreturn discounted + taxOn(base, cart.taxRate)\n//                        ^^^^ pre-discount\n```\n\nSo a discounted cart is taxed on money the customer never pays. Let me confirm which order this project intends before changing it.\n\n",
      },
      {
        type: "tool",
        name: "search_files",
        input: { query: "discount", glob: "docs/*.md" },
      },
    ],
    [
      {
        type: "text",
        text: "`docs/decisions.md` is explicit: **discounts apply before tax**, and it notes the code has been wrong about this before. So this is a regression, not an open question. Fixing it:\n\n",
      },
      {
        type: "tool",
        name: "write_file",
        input: { path: "src/cart.ts", content: FIXED_CART },
      },
      {
        type: "tool",
        name: "set_todos",
        input: {
          items: [
            { text: "Read the cart and pricing modules", done: true },
            { text: "Confirm the intended discount and tax order", done: true },
            { text: "Fix the calculation", done: true },
            { text: "Run the test suite", done: false },
          ],
        },
      },
      { type: "tool", name: "run_command", input: { command: "pnpm test" } },
    ],
    [
      {
        type: "text",
        text: "The suite is green.\n\n**What was wrong:** `total()` in `src/cart.ts` discounted the subtotal and then taxed the undiscounted amount, so every discounted order was overcharged by `taxRate x discount`. On a 10% discount and 10% tax that is about 1% of the order value, small enough to look like a rounding difference in a spot check.\n\n**The fix:** tax the discounted amount, which is what `docs/decisions.md` says the tax authority expects.\n\n```diff\n- return discounted + taxOn(base, cart.taxRate)\n+ return discounted + taxOn(discounted, cart.taxRate)\n```\n\n**One gap worth closing:** `src/cart.test.ts` only covers a cart with `discount: null`, which is why this survived. A case with a discount would have caught it, and would catch it again.",
      },
    ],
  ],
}

const research: Scenario = {
  id: "research",
  label: "Discounts and sales tax",
  prompt: "Should sales tax be calculated before or after a discount?",
  keywords: ["sales tax", "before or after", "tax be calculated", "should tax"],
  turns: [
    [
      {
        type: "thinking",
        text: "This is a question about outside rules rather than about this codebase, so I should look it up rather than reason from first principles.",
      },
      { type: "text", text: "Let me look that up.\n\n" },
      {
        type: "tool",
        name: "web_search",
        input: { query: "sales tax discount order of operations" },
      },
    ],
    [
      {
        type: "text",
        text: "**After the discount**, for a discount the seller offers itself.\n\nThe reasoning is that tax follows the actual sales price. If a shop takes 10% off, the customer's sales price is the reduced one, so that is the number tax is computed on. Taxing the pre-discount subtotal charges the customer on money that never changed hands.\n\nThere is one real exception: a **manufacturer coupon the seller is reimbursed for** is generally taxed on the full price, because the seller still receives it, just from two payers.\n\nFor this codebase that means `applyDiscount` then `taxOn`, in that order, which is also what `docs/decisions.md` already committed to.",
      },
    ],
  ],
}

const artifact: Scenario = {
  id: "artifact",
  label: "Write an onboarding guide",
  prompt: "Write me a short onboarding guide for this codebase.",
  keywords: [
    "guide",
    "onboarding",
    "document",
    "write me",
    "readme",
    "docs for",
  ],
  turns: [
    [
      {
        type: "text",
        text: "Let me look at what is actually here before writing anything.\n\n",
      },
      { type: "tool", name: "list_files", input: { path: "src" } },
      { type: "tool", name: "read_file", input: { path: "docs/decisions.md" } },
    ],
    [
      {
        type: "text",
        text: "Here is a guide covering the money rule, the module layout and the one trap in the code.\n\n",
      },
      {
        type: "tool",
        name: "create_artifact",
        input: {
          id: "onboarding",
          title: "Onboarding: storefront",
          kind: "markdown",
          content: `# Onboarding: storefront

A small order-taking service. You can read all of it in an afternoon.

## The one rule that matters

**Money is an integer number of cents.** Every amount in \`src/\` is an
integer. Floats lose money at the third decimal place, and a cent lost per
order is a real accounting problem at volume.

The single place that leaves integer space is \`formatMoney\` in
\`src/format.ts\`, which divides by 100 for display. If you find yourself
writing \`/ 100\` anywhere else, that is the bug.

## Layout

| File | Owns |
| --- | --- |
| \`src/types.ts\` | \`Money\`, \`LineItem\`, \`Discount\`, \`Cart\` |
| \`src/cart.ts\` | Summing a cart, and the order of discount and tax |
| \`src/pricing.ts\` | Discount arithmetic and tax |
| \`src/format.ts\` | The only place money becomes a string |
| \`src/checkout.ts\` | The human-readable summary |

## The trap

Discounts apply **before** tax. Tax is computed on what the customer
actually pays, not on the pre-discount subtotal. This is written down in
\`docs/decisions.md\` because the code has drifted from it before, and the
symptom is subtle: totals are correct until a discount is involved, and then
wrong by roughly \`taxRate x discount\`.

When you touch \`total()\`, add a test with a discount in it.

## Running things

\`\`\`bash
pnpm test    # vitest
pnpm build   # tsc -b
\`\`\`
`,
        },
      },
    ],
    [
      {
        type: "text",
        text: "That's in the side panel. It leads with the cents rule because that is the invariant a newcomer is most likely to break, and it calls out the discount-before-tax ordering explicitly, since the code has regressed on it before.",
      },
    ],
  ],
}

const buildArtifact: Scenario = {
  id: "build",
  label: "Build a tip calculator",
  prompt: "Build me a small tip calculator I can actually use.",
  keywords: [
    "build me",
    "make me",
    "calculator",
    "little app",
    "widget",
    "tool that",
  ],
  turns: [
    [
      {
        type: "thinking",
        text: "Something interactive, self-contained, and small enough to read in one screen. An HTML artifact renders live, so that is the right kind.",
      },
      { type: "text", text: "Here you go.\n\n" },
      {
        type: "tool",
        name: "create_artifact",
        input: {
          id: "tip-calculator",
          title: "Tip calculator",
          kind: "html",
          content: `<style>
  :root { color-scheme: light dark; }
  body {
    font: 15px/1.5 system-ui, sans-serif;
    margin: 0; padding: 24px;
    display: grid; place-items: center; min-height: 100vh;
  }
  .card {
    width: min(320px, 100%);
    display: grid; gap: 14px;
  }
  label { display: grid; gap: 6px; font-weight: 500; }
  input, select {
    font: inherit; padding: 8px 10px; border-radius: 8px;
    border: 1px solid color-mix(in oklab, currentColor 25%, transparent);
    background: transparent; color: inherit;
  }
  .out {
    display: flex; justify-content: space-between;
    padding: 10px 0; border-top: 1px solid color-mix(in oklab, currentColor 15%, transparent);
  }
  .total { font-size: 20px; font-weight: 650; }
</style>

<div class="card">
  <label>Bill
    <input id="bill" type="number" value="48.50" min="0" step="0.01" />
  </label>
  <label>Tip
    <select id="pct">
      <option value="15">15%</option>
      <option value="18" selected>18%</option>
      <option value="20">20%</option>
      <option value="25">25%</option>
    </select>
  </label>
  <label>Split between
    <input id="people" type="number" value="1" min="1" step="1" />
  </label>
  <div class="out"><span>Tip</span><span id="tip">-</span></div>
  <div class="out total"><span>Each pays</span><span id="each">-</span></div>
</div>

<script>
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
  const fields = ["bill", "pct", "people"].map((id) => document.getElementById(id))

  function render() {
    // Cents, not dollars, so the split never drifts by a rounding error.
    const cents = Math.round(Number(document.getElementById("bill").value || 0) * 100)
    const pct = Number(document.getElementById("pct").value)
    const people = Math.max(1, Math.trunc(Number(document.getElementById("people").value || 1)))

    const tip = Math.round(cents * pct / 100)
    document.getElementById("tip").textContent = money.format(tip / 100)
    document.getElementById("each").textContent = money.format(Math.ceil((cents + tip) / people) / 100)
  }

  fields.forEach((field) => field.addEventListener("input", render))
  render()
</script>
`,
        },
      },
    ],
    [
      {
        type: "text",
        text: "Two details worth pointing at: it works in cents internally so splitting never drifts by a rounding error, and the per-person share rounds **up**, so the table never comes up a cent short.",
      },
    ],
  ],
}

const explain: Scenario = {
  id: "explain",
  label: "How streaming works here",
  prompt: "How does streaming actually work in this app?",
  keywords: [
    "streaming",
    "how does this app",
    "how does this work",
    "server-sent",
    "stream events",
  ],
  turns: [
    [
      {
        type: "text",
        text: 'Streaming here is the same shape as the Messages API\'s server-sent events, on purpose.\n\nA provider yields events rather than returning a string:\n\n```ts\ntype StreamEvent =\n  | { type: "message_start"; message: { id, model, role } }\n  | { type: "content_block_start"; index; content_block }\n  | { type: "content_block_delta"; index; delta }\n  | { type: "content_block_stop"; index }\n  | { type: "message_delta"; delta: { stop_reason }; usage }\n  | { type: "message_stop" }\n```\n\nThose events go through an assembler that folds them into a message. Three things it has to get right:\n\n1. **Tool inputs arrive as split JSON.** `input_json_delta` carries fragments of an argument object, so they are buffered per block index and parsed once the block closes.\n2. **An interrupted stream still has to render.** If the arguments were cut off mid-object, the call is kept with whatever parsed rather than throwing away the block.\n3. **Every snapshot is a fresh array.** Mutating in place would leave React comparing a reference to itself and skipping the repaint.\n\nThe agent loop sits on top and hides the round trip: on the wire, calling a tool is several messages, but on screen it is one reply that did some work in the middle, so the loop re-indexes each pass\'s blocks into one continuous message.',
      },
    ],
  ],
}

export const SCENARIOS: readonly Scenario[] = [
  debugging,
  research,
  artifact,
  buildArtifact,
  explain,
]

/**
 * What an unmatched prompt gets. It says plainly that this is a scripted
 * build rather than improvising an answer it cannot actually produce.
 */
export const FALLBACK_TURNS: ScriptedStep[][] = [
  [
    {
      type: "text",
      text: "This build ships with scripted conversations rather than a model, so I can only answer the ones it knows. Try one of the suggestions on a new chat, or open **Settings** and add an API key to run this same interface against the real Messages API.\n\nEverything else here is real: the streaming, the tool calls against the workspace, the branching when you edit a message, and the artifacts panel.",
    },
  ],
]
