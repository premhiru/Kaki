---
id: phone.grab-ride
title: Grab ride
when_to_use: Book or monitor a Grab ride from the dedicated assistant phone.
inputs: [pickup, destination, passengers, tier, fare_cap]
surfaces: [phone, approval]
approvals: [booking, money.purchase]
locales: [sg, my, id, th, vn, ph]
languages: [en, zh, ms, ta]
version: 1
---

Launch Grab, resolve pickup/destination, select the stored tier preference, and stop at the fare screen with ETA, surge state, cancellation terms, and screenshot evidence. Never tap the final booking control before approval. After approval, confirm once and return the plate, driver, pickup point, and ETA. If the UI changes or the booking fails, provide Grab's exact support number and a short call/chat script.
