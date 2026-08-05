# API contract reviewer A/B demo

Use one PR that contains an obvious breaking contract change, such as changing
`user.id` from `number` to `string` or removing a required response field.

1. Clone the **API Contract Reviewer** agent twice.
2. Keep the four seeded skills linked to **With skills**, in their seeded
   order.
3. Unlink every skill from **Without skills**. Keep its prompt, provider, and
   model identical to the other agent.
4. Run both agents against the same PR and head SHA.
5. Compare whether each review identifies the exact old/new signature,
   caller failure mode, deprecation path, and versioning consequence.

The expected demonstration is not a guaranteed finding count. It is that the
with-skills review applies the four explicit compatibility directives while
the control review relies only on the broader system prompt.
