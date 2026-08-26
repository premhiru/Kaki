---
id: phone.grab-food
title: GrabFood order
when_to_use: Prepare a GrabFood basket and place it after one approval.
inputs: [restaurant, items, address, dietary, budget]
surfaces: [phone, approval]
approvals: [money.purchase]
locales: [sg, my, id, th, vn, ph]
languages: [en, zh, ms, ta]
version: 1
---

Apply household dietary rules before search. Build the basket, select a saved address, validate substitutions and fees, then show itemised total and ETA. Stop before Place order. On approval, submit once, record the order number, and stream preparation and rider updates.
