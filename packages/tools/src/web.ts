export type SearchResult = {
  title: string
  url: string
  snippet: string
}

/**
 * A fixed index rather than a network call. Every scripted conversation that
 * searches asks about one of these, and an unknown query returns nothing
 * rather than inventing a source.
 */
const INDEX: { keywords: string[]; results: SearchResult[] }[] = [
  {
    keywords: ["sales tax", "tax discount", "tax on discounted", "tax order"],
    results: [
      {
        title: "Sales tax on discounted sales: state revenue guidance",
        url: "https://example.gov/revenue/sales-tax-discounts",
        snippet:
          "When a seller reduces the sales price by a discount of its own, tax is computed on the reduced price. Manufacturer coupons reimbursed to the seller are treated differently.",
      },
      {
        title: "Order of operations for discounts and tax in commerce systems",
        url: "https://example.com/commerce/discounts-before-tax",
        snippet:
          "Applying tax to the pre-discount subtotal overcharges the customer and is the most common rounding-adjacent bug in checkout code.",
      },
    ],
  },
  {
    keywords: ["intl.numberformat", "currency formatting", "format money"],
    results: [
      {
        title: "Intl.NumberFormat, MDN",
        url: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat",
        snippet:
          "Constructing a formatter is expensive relative to formatting; hoist it out of hot paths and reuse the instance.",
      },
    ],
  },
  {
    keywords: ["streaming", "server-sent events", "sse"],
    results: [
      {
        title: "Using server-sent events, MDN",
        url: "https://developer.mozilla.org/docs/Web/API/Server-sent_events/Using_server-sent_events",
        snippet:
          "An event stream is a long-lived HTTP response of text/event-stream, delivered as discrete events the client handles as they arrive.",
      },
    ],
  },
]

export function searchWeb(query: string): SearchResult[] {
  const needle = query.toLowerCase()

  const entry = INDEX.find((candidate) =>
    candidate.keywords.some(
      (keyword) => needle.includes(keyword) || keyword.includes(needle)
    )
  )

  return entry?.results ?? []
}
