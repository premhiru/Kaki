---
id: phone.bank-app-readonly
title: Bank app read-only
when_to_use: Read the requesting owner's balances or recent transactions.
inputs: [person, bank, account_alias, period]
surfaces: [phone]
approvals: []
locales: [sg]
languages: [en]
version: 1
---

This skill is strictly read-only. Verify speaker ownership, open only the requested account alias, mask all but the last four digits, and return the minimum requested balance or transaction fields. If any transfer, payee, card, limit, or settings control is encountered, fail closed and route to the approval-node bank flow.
