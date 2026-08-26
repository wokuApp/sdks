---
'@wokuapp/sdk': patch
---

Remove `actionPlans.send()`. Sending action plans to external destinations (Jira, Monday, ClickUp, Notion) is not available in production, so the method only advertised destinations that do not work. Manage plans inside woku with `approve`, `complete`, `cancel`, `reopen`, `resume`, and the task methods. The production external integrations are Shopify and Zendesk.
