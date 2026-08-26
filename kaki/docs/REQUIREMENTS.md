# Kaki master-prompt requirements ledger

This generated ledger accounts for every logical line in the immutable master
prompt and expands every normative bullet plus every explicitly named command,
skill, provider, surface, data capability, model, UI panel, and Definition of Done
contract into its own atomic row. Update the source annotations in
`kaki/scripts/qa/requirements-ledger.mjs`, then run the write command; do not hand-edit
the tables.

## Source and evidence policy

- Source: `docs/requirements/master-prompt-v2.txt`
- Logical source hash (LF-normalized, final newline ignored): `f66fbb955778868622ed335efe36a13c6b09c336e258d0fe0bd9b408132d1121`
- Source lines: 308
- Normative lines: 199
- Context, blank, table-format, heading, separator, or fence lines: 109
- Atomic requirements: 971
- Atomic evidence states: 280 verified; 382 fixture; 138 partial; 171 blocked-live; 0 missing
- Regenerate: `node kaki/scripts/qa/requirements-ledger.mjs --write`
- Verify: `node kaki/scripts/qa/requirements-ledger.mjs --check`

States are deliberately strict. `verified` means source plus a focused local
contract passed; `fixture` means the production adapter is exercised against
deterministic inputs but the real provider/account is not; `partial` means some
contract or proof is missing; `blocked-live` means the remaining acceptance path
requires operator-owned external state. Fixture evidence never becomes live proof.

## All 308 source lines

| Line | Class | Atomic requirement IDs | State | Explicit blocker |
| --- | --- | --- | --- | --- |
| L001 | context | — | accounted | — |
| L002 | context | — | accounted | — |
| L003 | context | — | accounted | — |
| L004 | normative | L004.01 | verified | — |
| L005 | context | — | accounted | — |
| L006 | context | — | accounted | — |
| L007 | context | — | accounted | — |
| L008 | context | — | accounted | — |
| L009 | context | — | accounted | — |
| L010 | context | — | accounted | — |
| L011 | normative | L011.01<br>L011.02<br>L011.03<br>L011.04<br>L011.05<br>L011.06<br>L011.07<br>L011.08<br>L011.09<br>L011.10<br>L011.11<br>L011.12<br>L011.13<br>L011.14<br>L011.15<br>L011.16 | partial | §20 still has operator-owned live gates. |
| L012 | context | — | accounted | — |
| L013 | normative | L013.01 | partial | §20 still has operator-owned live gates. |
| L014 | context | — | accounted | — |
| L015 | normative | L015.01 | partial | §20 still has operator-owned live gates. |
| L016 | normative | L016.01 | partial | §20 still has operator-owned live gates. |
| L017 | normative | L017.01 | partial | §20 still has operator-owned live gates. |
| L018 | normative | L018.01 | partial | §20 still has operator-owned live gates. |
| L019 | normative | L019.01<br>L019.02<br>L019.03<br>L019.04<br>L019.05<br>L019.06 | partial | §20 still has operator-owned live gates. |
| L020 | normative | L020.01 | partial | §20 still has operator-owned live gates. |
| L021 | normative | L021.01 | partial | §20 still has operator-owned live gates. |
| L022 | context | — | accounted | — |
| L023 | normative | L023.01<br>L023.02<br>L023.03<br>L023.04<br>L023.05<br>L023.06<br>L023.07<br>L023.08 | partial | §20 still has operator-owned live gates. |
| L024 | context | — | accounted | — |
| L025 | normative | L025.01 | verified | — |
| L026 | normative | L026.01<br>L026.02<br>L026.03<br>L026.04<br>L026.05<br>L026.06 | verified | — |
| L027 | context | — | accounted | — |
| L028 | context | — | accounted | — |
| L029 | context | — | accounted | — |
| L030 | normative | L030.01<br>L030.02<br>L030.03<br>L030.04<br>L030.05 | verified | — |
| L031 | normative | L031.01<br>L031.02<br>L031.03<br>L031.04 | verified | — |
| L032 | normative | L032.01<br>L032.02<br>L032.03<br>L032.04<br>L032.05<br>L032.06<br>L032.07<br>L032.08<br>L032.09 | verified | — |
| L033 | normative | L033.01<br>L033.02<br>L033.03<br>L033.04 | verified | — |
| L034 | normative | L034.01<br>L034.02<br>L034.03 | verified | — |
| L035 | normative | L035.01<br>L035.02<br>L035.03<br>L035.04<br>L035.05 | verified | — |
| L036 | normative | L036.01<br>L036.02<br>L036.03<br>L036.04<br>L036.05<br>L036.06<br>L036.07 | verified | — |
| L037 | normative | L037.01<br>L037.02<br>L037.03<br>L037.04<br>L037.05<br>L037.06<br>L037.07<br>L037.08<br>L037.09<br>L037.10<br>L037.11 | verified | — |
| L038 | normative | L038.01<br>L038.02<br>L038.03<br>L038.04 | verified | — |
| L039 | normative | L039.01<br>L039.02<br>L039.03<br>L039.04<br>L039.05<br>L039.06<br>L039.07 | verified | — |
| L040 | normative | L040.01<br>L040.02<br>L040.03<br>L040.04<br>L040.05<br>L040.06<br>L040.07<br>L040.08 | verified | — |
| L041 | normative | L041.01<br>L041.02<br>L041.03<br>L041.04<br>L041.05<br>L041.06 | verified | — |
| L042 | normative | L042.01<br>L042.02<br>L042.03 | verified | — |
| L043 | normative | L043.01<br>L043.02<br>L043.03<br>L043.04<br>L043.05<br>L043.06 | verified | — |
| L044 | normative | L044.01<br>L044.02<br>L044.03<br>L044.04<br>L044.05<br>L044.06 | verified | — |
| L045 | normative | L045.01<br>L045.02<br>L045.03<br>L045.04<br>L045.05<br>L045.06<br>L045.07 | verified | — |
| L046 | normative | L046.01<br>L046.02<br>L046.03<br>L046.04<br>L046.05 | verified | — |
| L047 | context | — | accounted | — |
| L048 | context | — | accounted | — |
| L049 | normative | L049.01<br>L049.02<br>L049.03<br>L049.04<br>L049.05<br>L049.06<br>L049.07 | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050 | normative | L050.01<br>L050.02<br>L050.03<br>L050.04<br>L050.05<br>L050.06<br>L050.07<br>L050.08<br>L050.09<br>L050.10<br>L050.11 | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L051 | normative | L051.01 | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L052 | normative | L052.01 | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L053 | context | — | accounted | — |
| L054 | context | — | accounted | — |
| L055 | context | — | accounted | — |
| L056 | context | — | accounted | — |
| L057 | context | — | accounted | — |
| L058 | context | — | accounted | — |
| L059 | normative | L059.01<br>L059.02<br>L059.03<br>L059.04 | fixture | Default live household behavior still needs account/device evidence. |
| L060 | normative | L060.01 | fixture | Default live household behavior still needs account/device evidence. |
| L061 | normative | L061.01<br>L061.02<br>L061.03<br>L061.04<br>L061.05 | fixture | Default live household behavior still needs account/device evidence. |
| L062 | normative | L062.01 | fixture | Default live household behavior still needs account/device evidence. |
| L063 | normative | L063.01<br>L063.02<br>L063.03<br>L063.04<br>L063.05<br>L063.06<br>L063.07<br>L063.08<br>L063.09<br>L063.10 | fixture | Default live household behavior still needs account/device evidence. |
| L064 | normative | L064.01<br>L064.02<br>L064.03<br>L064.04 | fixture | Default live household behavior still needs account/device evidence. |
| L065 | normative | L065.01 | fixture | Default live household behavior still needs account/device evidence. |
| L066 | normative | L066.01<br>L066.02<br>L066.03<br>L066.04<br>L066.05<br>L066.06 | fixture | Default live household behavior still needs account/device evidence. |
| L067 | normative | L067.01<br>L067.02<br>L067.03<br>L067.04<br>L067.05 | fixture | Default live household behavior still needs account/device evidence. |
| L068 | context | — | accounted | — |
| L069 | normative | L069.01 | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L070 | normative | L070.01<br>L070.02<br>L070.03<br>L070.04<br>L070.05<br>L070.06<br>L070.07 | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L071 | normative | L071.01<br>L071.02<br>L071.03<br>L071.04<br>L071.05<br>L071.06<br>L071.07 | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L072 | normative | L072.01<br>L072.02<br>L072.03<br>L072.04<br>L072.05<br>L072.06<br>L072.07<br>L072.08 | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L073 | normative | L073.01<br>L073.02<br>L073.03<br>L073.04<br>L073.05 | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L074 | normative | L074.01<br>L074.02<br>L074.03<br>L074.04 | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L075 | context | — | accounted | — |
| L076 | context | — | accounted | — |
| L077 | context | — | accounted | — |
| L078 | context | — | accounted | — |
| L079 | context | — | accounted | — |
| L080 | context | — | accounted | — |
| L081 | context | — | accounted | — |
| L082 | normative | L082.01 | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083 | normative | L083.01<br>L083.02<br>L083.03<br>L083.04<br>L083.05<br>L083.06<br>L083.07<br>L083.08<br>L083.09<br>L083.10<br>L083.11 | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084 | normative | L084.01<br>L084.02<br>L084.03<br>L084.04<br>L084.05<br>L084.06<br>L084.07<br>L084.08<br>L084.09<br>L084.10 | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L085 | normative | L085.01<br>L085.02<br>L085.03<br>L085.04<br>L085.05<br>L085.06 | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L086 | normative | L086.01<br>L086.02<br>L086.03<br>L086.04 | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L087 | context | — | accounted | — |
| L088 | context | — | accounted | — |
| L089 | normative | L089.01 | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L090 | normative | L090.01<br>L090.02<br>L090.03<br>L090.04<br>L090.05<br>L090.06<br>L090.07 | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L091 | context | — | accounted | — |
| L092 | context | — | accounted | — |
| L093 | normative | L093.01 | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L094 | context | — | accounted | — |
| L095 | normative | L095.01 | verified | — |
| L096 | context | — | accounted | — |
| L097 | normative | L097.01 | verified | — |
| L098 | normative | L098.01 | verified | — |
| L099 | normative | L099.01 | verified | — |
| L100 | normative | L100.01 | verified | — |
| L101 | normative | L101.01 | verified | — |
| L102 | normative | L102.01 | verified | — |
| L103 | normative | L103.01 | verified | — |
| L104 | normative | L104.01 | verified | — |
| L105 | normative | L105.01 | verified | — |
| L106 | normative | L106.01 | verified | — |
| L107 | normative | L107.01 | verified | — |
| L108 | normative | L108.01 | verified | — |
| L109 | normative | L109.01 | verified | — |
| L110 | normative | L110.01 | verified | — |
| L111 | normative | L111.01 | verified | — |
| L112 | normative | L112.01 | verified | — |
| L113 | normative | L113.01 | verified | — |
| L114 | normative | L114.01 | verified | — |
| L115 | normative | L115.01 | verified | — |
| L116 | normative | L116.01 | verified | — |
| L117 | context | — | accounted | — |
| L118 | context | — | accounted | — |
| L119 | normative | L119.01 | verified | — |
| L120 | normative | L120.01<br>L120.02<br>L120.03<br>L120.04<br>L120.05<br>L120.06<br>L120.07 | verified | — |
| L121 | normative | L121.01<br>L121.02<br>L121.03<br>L121.04<br>L121.05 | verified | — |
| L122 | normative | L122.01<br>L122.02<br>L122.03<br>L122.04<br>L122.05<br>L122.06<br>L122.07 | verified | — |
| L123 | normative | L123.01<br>L123.02<br>L123.03<br>L123.04<br>L123.05<br>L123.06<br>L123.07<br>L123.08<br>L123.09<br>L123.10<br>L123.11<br>L123.12 | verified | — |
| L124 | normative | L124.01<br>L124.02<br>L124.03<br>L124.04<br>L124.05 | verified | — |
| L125 | normative | L125.01 | verified | — |
| L126 | context | — | accounted | — |
| L127 | context | — | accounted | — |
| L128 | context | — | accounted | — |
| L129 | context | — | accounted | — |
| L130 | context | — | accounted | — |
| L131 | context | — | accounted | — |
| L132 | context | — | accounted | — |
| L133 | normative | L133.01<br>L133.02<br>L133.03<br>L133.04<br>L133.05<br>L133.06 | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L134 | normative | L134.01<br>L134.02<br>L134.03<br>L134.04<br>L134.05<br>L134.06<br>L134.07 | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L135 | normative | L135.01<br>L135.02<br>L135.03<br>L135.04 | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L136 | normative | L136.01 | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L137 | normative | L137.01<br>L137.02<br>L137.03<br>L137.04<br>L137.05 | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L138 | normative | L138.01<br>L138.02<br>L138.03<br>L138.04<br>L138.05<br>L138.06 | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L139 | context | — | accounted | — |
| L140 | context | — | accounted | — |
| L141 | normative | L141.01<br>L141.02<br>L141.03<br>L141.04<br>L141.05<br>L141.06<br>L141.07<br>L141.08<br>L141.09<br>L141.10<br>L141.11<br>L141.12<br>L141.13<br>L141.14<br>L141.15 | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L142 | context | — | accounted | — |
| L143 | context | — | accounted | — |
| L144 | normative | L144.01<br>L144.02<br>L144.03<br>L144.04<br>L144.05<br>L144.06<br>L144.07<br>L144.08<br>L144.09<br>L144.10 | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L145 | context | — | accounted | — |
| L146 | context | — | accounted | — |
| L147 | normative | L147.01<br>L147.02<br>L147.03<br>L147.04<br>L147.05<br>L147.06<br>L147.07 | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L148 | context | — | accounted | — |
| L149 | context | — | accounted | — |
| L150 | normative | L150.01<br>L150.02<br>L150.03<br>L150.04<br>L150.05<br>L150.06<br>L150.07<br>L150.08<br>L150.09<br>L150.10<br>L150.11<br>L150.12<br>L150.13 | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L151 | context | — | accounted | — |
| L152 | normative | L152.01<br>L152.02<br>L152.03<br>L152.04<br>L152.05<br>L152.06<br>L152.07<br>L152.08<br>L152.09<br>L152.10<br>L152.11<br>L152.12<br>L152.13<br>L152.14<br>L152.15<br>L152.16<br>L152.17<br>L152.18 | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L153 | normative | L153.01<br>L153.02<br>L153.03<br>L153.04<br>L153.05 | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L154 | normative | L154.01<br>L154.02<br>L154.03<br>L154.04<br>L154.05 | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L155 | context | — | accounted | — |
| L156 | normative | L156.01 | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157 | normative | L157.01<br>L157.02<br>L157.03<br>L157.04<br>L157.05<br>L157.06<br>L157.07<br>L157.08<br>L157.09<br>L157.10<br>L157.11<br>L157.12<br>L157.13<br>L157.14<br>L157.15<br>L157.16 | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158 | normative | L158.01<br>L158.02<br>L158.03<br>L158.04<br>L158.05<br>L158.06<br>L158.07<br>L158.08<br>L158.09 | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L159 | normative | L159.01 | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L160 | context | — | accounted | — |
| L161 | normative | L161.01<br>L161.02<br>L161.03<br>L161.04<br>L161.05<br>L161.06<br>L161.07<br>L161.08<br>L161.09<br>L161.10<br>L161.11 | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L162 | context | — | accounted | — |
| L163 | context | — | accounted | — |
| L164 | normative | L164.01<br>L164.02<br>L164.03<br>L164.04<br>L164.05<br>L164.06<br>L164.07 | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165 | normative | L165.01<br>L165.02<br>L165.03<br>L165.04<br>L165.05<br>L165.06<br>L165.07<br>L165.08<br>L165.09<br>L165.10<br>L165.11<br>L165.12<br>L165.13<br>L165.14<br>L165.15<br>L165.16<br>L165.17 | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L166 | normative | L166.01 | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L167 | normative | L167.01 | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L168 | normative | L168.01 | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L169 | normative | L169.01<br>L169.02<br>L169.03<br>L169.04<br>L169.05 | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L170 | context | — | accounted | — |
| L171 | context | — | accounted | — |
| L172 | normative | L172.01 | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173 | normative | L173.01<br>L173.02<br>L173.03<br>L173.04<br>L173.05<br>L173.06<br>L173.07<br>L173.08<br>L173.09<br>L173.10 | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174 | normative | L174.01<br>L174.02<br>L174.03<br>L174.04<br>L174.05<br>L174.06<br>L174.07<br>L174.08<br>L174.09<br>L174.10<br>L174.11<br>L174.12 | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L175 | normative | L175.01<br>L175.02<br>L175.03<br>L175.04<br>L175.05<br>L175.06<br>L175.07<br>L175.08 | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L176 | normative | L176.01<br>L176.02<br>L176.03<br>L176.04 | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L177 | normative | L177.01<br>L177.02<br>L177.03<br>L177.04<br>L177.05<br>L177.06<br>L177.07<br>L177.08 | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178 | normative | L178.01<br>L178.02<br>L178.03<br>L178.04<br>L178.05<br>L178.06<br>L178.07<br>L178.08<br>L178.09<br>L178.10<br>L178.11 | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L179 | context | — | accounted | — |
| L180 | context | — | accounted | — |
| L181 | normative | L181.01<br>L181.02<br>L181.03<br>L181.04<br>L181.05<br>L181.06<br>L181.07<br>L181.08<br>L181.09 | fixture | Country credentials/accounts are not available for every live route. |
| L182 | normative | L182.01<br>L182.02<br>L182.03<br>L182.04<br>L182.05<br>L182.06<br>L182.07<br>L182.08<br>L182.09 | fixture | Country credentials/accounts are not available for every live route. |
| L183 | normative | L183.01<br>L183.02<br>L183.03<br>L183.04<br>L183.05<br>L183.06<br>L183.07<br>L183.08<br>L183.09 | fixture | Country credentials/accounts are not available for every live route. |
| L184 | normative | L184.01<br>L184.02<br>L184.03<br>L184.04<br>L184.05<br>L184.06<br>L184.07<br>L184.08 | fixture | Country credentials/accounts are not available for every live route. |
| L185 | normative | L185.01<br>L185.02<br>L185.03<br>L185.04<br>L185.05<br>L185.06<br>L185.07<br>L185.08<br>L185.09 | fixture | Country credentials/accounts are not available for every live route. |
| L186 | normative | L186.01<br>L186.02<br>L186.03<br>L186.04<br>L186.05<br>L186.06<br>L186.07<br>L186.08<br>L186.09<br>L186.10<br>L186.11 | fixture | Country credentials/accounts are not available for every live route. |
| L187 | context | — | accounted | — |
| L188 | context | — | accounted | — |
| L189 | normative | L189.01 | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190 | normative | L190.01<br>L190.02<br>L190.03<br>L190.04<br>L190.05<br>L190.06<br>L190.07<br>L190.08<br>L190.09<br>L190.10<br>L190.11 | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L191 | context | — | accounted | — |
| L192 | context | — | accounted | — |
| L193 | context | — | accounted | — |
| L194 | context | — | accounted | — |
| L195 | context | — | accounted | — |
| L196 | normative | L196.01 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197 | normative | L197.01<br>L197.02<br>L197.03<br>L197.04<br>L197.05<br>L197.06<br>L197.07<br>L197.08<br>L197.09<br>L197.10<br>L197.11<br>L197.12<br>L197.13<br>L197.14 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L198 | context | — | accounted | — |
| L199 | context | — | accounted | — |
| L200 | normative | L200.01<br>L200.02<br>L200.03<br>L200.04<br>L200.05<br>L200.06<br>L200.07<br>L200.08<br>L200.09<br>L200.10<br>L200.11<br>L200.12<br>L200.13 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L201 | normative | L201.01<br>L201.02<br>L201.03<br>L201.04<br>L201.05 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L202 | normative | L202.01<br>L202.02<br>L202.03<br>L202.04<br>L202.05<br>L202.06 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203 | normative | L203.01<br>L203.02<br>L203.03<br>L203.04<br>L203.05<br>L203.06<br>L203.07<br>L203.08<br>L203.09<br>L203.10<br>L203.11<br>L203.12 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204 | normative | L204.01<br>L204.02<br>L204.03<br>L204.04<br>L204.05<br>L204.06<br>L204.07<br>L204.08<br>L204.09 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L205 | normative | L205.01<br>L205.02<br>L205.03 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L206 | normative | L206.01<br>L206.02<br>L206.03 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L207 | context | — | accounted | — |
| L208 | context | — | accounted | — |
| L209 | normative | L209.01<br>L209.02<br>L209.03<br>L209.04<br>L209.05<br>L209.06<br>L209.07<br>L209.08 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L210 | context | — | accounted | — |
| L211 | context | — | accounted | — |
| L212 | normative | L212.01<br>L212.02<br>L212.03<br>L212.04<br>L212.05<br>L212.06<br>L212.07<br>L212.08<br>L212.09<br>L212.10<br>L212.11<br>L212.12<br>L212.13<br>L212.14<br>L212.15<br>L212.16<br>L212.17<br>L212.18<br>L212.19<br>L212.20<br>L212.21<br>L212.22 | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L213 | context | — | accounted | — |
| L214 | normative | L214.01 | verified | — |
| L215 | normative | L215.01<br>L215.02<br>L215.03<br>L215.04<br>L215.05<br>L215.06<br>L215.07<br>L215.08<br>L215.09<br>L215.10 | verified | — |
| L216 | normative | L216.01<br>L216.02<br>L216.03<br>L216.04<br>L216.05<br>L216.06<br>L216.07<br>L216.08<br>L216.09<br>L216.10<br>L216.11<br>L216.12<br>L216.13<br>L216.14<br>L216.15<br>L216.16<br>L216.17<br>L216.18<br>L216.19<br>L216.20<br>L216.21<br>L216.22<br>L216.23<br>L216.24<br>L216.25<br>L216.26<br>L216.27<br>L216.28 | verified | — |
| L217 | normative | L217.01<br>L217.02<br>L217.03<br>L217.04<br>L217.05<br>L217.06<br>L217.07 | verified | — |
| L218 | context | — | accounted | — |
| L219 | context | — | accounted | — |
| L220 | normative | L220.01<br>L220.02<br>L220.03<br>L220.04<br>L220.05<br>L220.06<br>L220.07<br>L220.08<br>L220.09<br>L220.10<br>L220.11 | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L221 | normative | L221.01 | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222 | normative | L222.01<br>L222.02<br>L222.03<br>L222.04<br>L222.05<br>L222.06<br>L222.07<br>L222.08<br>L222.09 | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L223 | normative | L223.01<br>L223.02<br>L223.03<br>L223.04<br>L223.05<br>L223.06 | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L224 | normative | L224.01<br>L224.02<br>L224.03 | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L225 | normative | L225.01<br>L225.02 | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L226 | normative | L226.01<br>L226.02<br>L226.03 | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L227 | context | — | accounted | — |
| L228 | context | — | accounted | — |
| L229 | context | — | accounted | — |
| L230 | normative | L230.01<br>L230.02<br>L230.03<br>L230.04<br>L230.05<br>L230.06<br>L230.07<br>L230.08<br>L230.09<br>L230.10<br>L230.11<br>L230.12<br>L230.13<br>L230.14<br>L230.15<br>L230.16<br>L230.17<br>L230.18<br>L230.19<br>L230.20 | verified | — |
| L231 | context | — | accounted | — |
| L232 | normative | L232.01<br>L232.02<br>L232.03<br>L232.04<br>L232.05<br>L232.06 | verified | — |
| L233 | context | — | accounted | — |
| L234 | normative | L234.01<br>L234.02<br>L234.03<br>L234.04<br>L234.05<br>L234.06<br>L234.07<br>L234.08<br>L234.09<br>L234.10<br>L234.11<br>L234.12<br>L234.13<br>L234.14<br>L234.15<br>L234.16 | verified | — |
| L235 | context | — | accounted | — |
| L236 | normative | L236.01<br>L236.02<br>L236.03<br>L236.04<br>L236.05<br>L236.06<br>L236.07<br>L236.08<br>L236.09<br>L236.10 | partial | A real authenticated Gateway browser capture is still required. |
| L237 | context | — | accounted | — |
| L238 | context | — | accounted | — |
| L239 | context | — | accounted | — |
| L240 | context | — | accounted | — |
| L241 | context | — | accounted | — |
| L242 | context | — | accounted | — |
| L243 | normative | L243.01 | verified | — |
| L244 | context | — | accounted | — |
| L245 | normative | L245.01 | verified | — |
| L246 | normative | L246.01 | verified | — |
| L247 | normative | L247.01 | verified | — |
| L248 | normative | L248.01 | verified | — |
| L249 | normative | L249.01 | verified | — |
| L250 | context | — | accounted | — |
| L251 | normative | L251.01 | verified | — |
| L252 | normative | L252.01 | verified | — |
| L253 | normative | L253.01 | verified | — |
| L254 | normative | L254.01 | verified | — |
| L255 | normative | L255.01 | verified | — |
| L256 | normative | L256.01 | verified | — |
| L257 | normative | L257.01 | verified | — |
| L258 | context | — | accounted | — |
| L259 | normative | L259.01 | verified | — |
| L260 | normative | L260.01 | verified | — |
| L261 | normative | L261.01 | verified | — |
| L262 | normative | L262.01 | verified | — |
| L263 | normative | L263.01 | verified | — |
| L264 | context | — | accounted | — |
| L265 | normative | L265.01 | verified | — |
| L266 | normative | L266.01 | verified | — |
| L267 | context | — | accounted | — |
| L268 | normative | L268.01<br>L268.02<br>L268.03<br>L268.04<br>L268.05 | verified | — |
| L269 | context | — | accounted | — |
| L270 | context | — | accounted | — |
| L271 | context | — | accounted | — |
| L272 | context | — | accounted | — |
| L273 | context | — | accounted | — |
| L274 | normative | L274.01 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275 | normative | L275.01<br>L275.02<br>L275.03<br>L275.04<br>L275.05<br>L275.06<br>L275.07<br>L275.08<br>L275.09 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L276 | normative | L276.01 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L277 | normative | L277.01 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L278 | normative | L278.01 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L279 | normative | L279.01 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L280 | normative | L280.01 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L281 | normative | L281.01 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L282 | normative | L282.01 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L283 | normative | L283.01<br>L283.02<br>L283.03<br>L283.04<br>L283.05 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L284 | normative | L284.01 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L285 | normative | L285.01<br>L285.02<br>L285.03<br>L285.04<br>L285.05<br>L285.06<br>L285.07<br>L285.08 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L286 | normative | L286.01<br>L286.02<br>L286.03<br>L286.04<br>L286.05<br>L286.06 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287 | normative | L287.01<br>L287.02<br>L287.03<br>L287.04<br>L287.05<br>L287.06<br>L287.07<br>L287.08<br>L287.09 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288 | normative | L288.01<br>L288.02<br>L288.03<br>L288.04<br>L288.05<br>L288.06<br>L288.07<br>L288.08<br>L288.09<br>L288.10<br>L288.11<br>L288.12<br>L288.13<br>L288.14 | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L289 | context | — | accounted | — |
| L290 | normative | L290.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L291 | context | — | accounted | — |
| L292 | context | — | accounted | — |
| L293 | normative | L293.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L294 | normative | L294.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L295 | normative | L295.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L296 | normative | L296.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L297 | normative | L297.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L298 | normative | L298.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L299 | normative | L299.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L300 | normative | L300.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L301 | normative | L301.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L302 | normative | L302.01 | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L303 | context | — | accounted | — |
| L304 | context | — | accounted | — |
| L305 | normative | L305.01<br>L305.02<br>L305.03<br>L305.04<br>L305.05<br>L305.06<br>L305.07<br>L305.08<br>L305.09<br>L305.10<br>L305.11<br>L305.12<br>L305.13<br>L305.14<br>L305.15<br>L305.16<br>L305.17<br>L305.18 | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L306 | context | — | accounted | — |
| L307 | context | — | accounted | — |
| L308 | normative | L308.01 | partial | The loop remains open until every §20 release gate passes. |

## Atomic requirements

| ID | Requirement | Code owner path(s) | Acceptance command or artifact | Evidence state | Explicit blocker |
| --- | --- | --- | --- | --- | --- |
| L004.01 | > You are the orchestrator. Finish the entire project in one continuous run. Do not stop for questions. Do not stop before §20 is fully green. | kaki/docs/REQUIREMENTS.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L011.01 | installable product | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.02 | documented product | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.03 | tested product | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.04 | always-on self-hosting | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.05 | WhatsApp and Telegram household presence | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.06 | household languages | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.07 | household memory | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.08 | browser surface | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.09 | phone surface | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.10 | human-tap approval surface | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.11 | Singapore completeness | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.12 | Malaysia scaffold | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.13 | Indonesia scaffold | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.14 | Thailand scaffold | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.15 | Vietnam scaffold | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L011.16 | Philippines scaffold | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L013.01 | ## 2. The loop (run until §20 passes) | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L015.01 | while not DefinitionOfDone.green(): | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L016.01 | plan      = ARCHITECT.replan(state, failures) | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L017.01 | work      = fan_out(plan.tasks, agents)          # parallel sub-agents | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L018.01 | results   = gather(work) | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L019.01 | integrate agent results | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L019.02 | lint | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L019.03 | unit tests | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L019.04 | end-to-end tests | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L019.05 | evaluations | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L019.06 | security tests | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L020.01 | failures  = collect_failures() | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L021.01 | commit(); update("docs/PROGRESS.md") | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L023.01 | acceptance test before completion | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L023.02 | live WhatsApp link (no stub) | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L023.03 | phone node (no stub) | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L023.04 | browser skills (no stub) | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L023.05 | approval flow (no stub) | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L023.06 | fixture when CI cannot reach live target | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L023.07 | real path remains wired | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L023.08 | live verification documented | kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/ | pnpm --dir kaki acceptance | partial | §20 still has operator-owned live gates. |
| L025.01 | ## 3. Sub-agents (spawn all; add more if useful) | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L026.01 | agent brief | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L026.02 | owned directory | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L026.03 | shared interface contract | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L026.04 | agent handoff: what built | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L026.05 | agent handoff: how to test | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L026.06 | agent handoff: open issues | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L030.01 | architecture document | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L030.02 | interfaces document | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L030.03 | decision records | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L030.04 | integration | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L030.05 | replanning | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L031.01 | OpenClaw fork | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L031.02 | core package | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L031.03 | Hermes patterns | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L031.04 | Kaki rename | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L032.01 | WhatsApp | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L032.02 | Telegram | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L032.03 | WebChat | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L032.04 | LINE | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L032.05 | Zalo | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L032.06 | Viber | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L032.07 | Messenger | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L032.08 | WeChat | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L032.09 | voice notes | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L033.01 | Android control daemon | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L033.02 | accessibility companion | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L033.03 | vision-action loop | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L033.04 | phone skills | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L034.01 | managed Chrome and Playwright | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L034.02 | selector and vision fallback | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L034.03 | portal skills | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L035.01 | approval cards | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L035.02 | policy engine | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L035.03 | Singpass handoff | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L035.04 | 2FA handoff | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L035.05 | PayNow handoff | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L036.01 | LTA | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L036.02 | data.gov.sg | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L036.03 | OneMap | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L036.04 | NEA | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L036.05 | SGQR | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L036.06 | SG address parser | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L036.07 | monitors | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.01 | Malaysia public data | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.02 | Indonesia public data | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.03 | Thailand public data | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.04 | Vietnam public data | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.05 | Philippines public data | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.06 | DuitNow | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.07 | QRIS | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.08 | PromptPay | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.09 | VietQR | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.10 | QR Ph | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L037.11 | regional tools | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L038.01 | Singapore playbooks | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L038.02 | SEA playbooks | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L038.03 | learned playbooks | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L038.04 | skill scripts | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L039.01 | locale packs | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L039.02 | lexicons | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L039.03 | calendars | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L039.04 | registers | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L039.05 | dietary rules | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L039.06 | formats | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L039.07 | locale evaluations | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L040.01 | model router | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L040.02 | normaliser | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L040.03 | SEA-LION adapter | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L040.04 | Typhoon adapter | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L040.05 | Sahabat adapter | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L040.06 | MERaLiON ASR | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L040.07 | TTS | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L040.08 | SEA-Guard | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L041.01 | household graph | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L041.02 | profiles | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L041.03 | FTS recall | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L041.04 | vector recall | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L041.05 | journey | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L041.06 | privacy | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L042.01 | skill creation loop | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L042.02 | skill refinement loop | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L042.03 | trace mining | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L043.01 | secrets | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L043.02 | sandboxing | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L043.03 | pacing | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L043.04 | session guards | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L043.05 | audit | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L043.06 | red-team tests | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L044.01 | Household UI | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L044.02 | Approvals UI | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L044.03 | Phone UI | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L044.04 | Journey UI | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L044.05 | Skills editor UI | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L044.06 | Locale UI | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L045.01 | unit QA | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L045.02 | end-to-end QA | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L045.03 | evaluation QA | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L045.04 | chaos QA | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L045.05 | load QA | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L045.06 | fixture recorder | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L045.07 | CI | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L046.01 | README | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L046.02 | wizard copy | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L046.03 | runbooks | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L046.04 | skill catalogue | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L046.05 | contributing guide | kaki/docs/agents/ | pnpm --dir kaki docs:check | verified | — |
| L049.01 | monorepo | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L049.02 | TypeScript | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L049.03 | Node 22+ | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L049.04 | strict TypeScript | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L049.05 | Python 3.11 | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L049.06 | uv | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L049.07 | pnpm workspaces | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.01 | ESLint | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.02 | Prettier | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.03 | ruff | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.04 | 80% new TypeScript coverage | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.05 | end-to-end fixture for every skill | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.06 | GitHub Actions lint | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.07 | GitHub Actions unit | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.08 | GitHub Actions fixture E2E | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.09 | GitHub Actions evaluations | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.10 | pnpm audit | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L050.11 | pip-audit | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L051.01 | Conventional commits; tags &#96;v0.1&#96;…&#96;v1.0-sg&#96; per §21. | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L052.01 | All decisions you make without the user → ADR in &#96;docs/DECISIONS.md&#96;. | .github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md | pnpm --dir kaki coverage && pnpm audit --audit-level high | partial | Exact-head hosted CI and the TypeScript coverage gate must pass. |
| L059.01 | WhatsApp group first in SG/MY/ID/PH | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L059.02 | Zalo in Vietnam | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L059.03 | LINE in Thailand | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L059.04 | Telegram control plane | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L060.01 | **Acts, then asks**: every task is executed up to the last irreversible step; the user gets one approval tap. Never "go to this website". | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L061.01 | browser execution surface | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L061.02 | phone execution surface | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L061.03 | Singpass human tap | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L061.04 | 2FA human tap | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L061.05 | wallet confirmation human tap | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L062.01 | **Household, not user**: multi-person memory; replies to each member in their own language and register; privacy walls between members. | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.01 | hawker knowledge | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.02 | HDB knowledge | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.03 | CPF knowledge | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.04 | COE knowledge | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.05 | Ramadan timings | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.06 | CNY closures | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.07 | haze | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.08 | ERP | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.09 | JB commute | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L063.10 | no generic assistant behavior | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L064.01 | rain school-run nudge | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L064.02 | MRT disruption nudge | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L064.03 | CPF deadline nudge | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L064.04 | anti-spam | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L065.01 | **Gets better**: Hermes-style learning loop turns every completed task into a reusable skill. | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L066.01 | ban recovery | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L066.02 | relink recovery | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L066.03 | captcha handoff | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L066.04 | layout-change handoff | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L066.05 | Telegram alert | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L066.06 | no silent failure | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L067.01 | self-hosted privacy | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L067.02 | no secrets in memory | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L067.03 | no secrets in logs | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L067.04 | NRIC masking | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L067.05 | capped phone wallet | kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/ | pnpm --dir kaki test:qa | fixture | Default live household behavior still needs account/device evidence. |
| L069.01 | ## 6. Personas to design for (write these into &#96;docs/PERSONAS.md&#96; and test against them) | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L070.01 | Wei Ling persona | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L070.02 | school notices | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L070.03 | Grab for clinic visit | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L070.04 | CPF and IRAS | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L070.05 | aircon vendor | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L070.06 | dinner ordering | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L070.07 | haze alerts | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L071.01 | Ah Ma persona | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L071.02 | Mandarin voice | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L071.03 | Hokkien voice | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L071.04 | appointment reminders | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L071.05 | rain question | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L071.06 | grandkid reminders | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L071.07 | medication schedule | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L072.01 | Farid persona | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L072.02 | causeway traffic | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L072.03 | VEP | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L072.04 | Touch 'n Go | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L072.05 | halal lunch | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L072.06 | prayer times | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L072.07 | Hari Raya planning | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L072.08 | DuitNow to PayNow | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L073.01 | Priya persona | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L073.02 | Tamil parent replies | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L073.03 | Deepavali logistics | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L073.04 | NLB books | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L073.05 | Singapore Airlines Chennai flight | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L074.01 | Dewi Jakarta persona | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L074.02 | Ploy Bangkok persona | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L074.03 | Minh HCMC persona | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L074.04 | Jasmine Manila persona | kaki/docs/PERSONAS.md; kaki/evals/fixtures/ | pnpm --dir kaki test:e2e | fixture | Persona scenarios are deterministic; live channels remain gated. |
| L082.01 | Hard fork into &#96;packages/core&#96; (keep history, pin upstream commit in &#96;UPSTREAM.md&#96;, keep LICENSE/attribution). | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.01 | Gateway WebSocket control plane | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.02 | multi-agent and session routing | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.03 | channel plugin SDK | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.04 | agentskills.io-compatible skills | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.05 | managed Chrome browser | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.06 | cron and heartbeat | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.07 | workspace prompt and memory files | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.08 | Control UI | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.09 | mobile node protocol | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.10 | MCP client | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L083.11 | plugin SDK | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.01 | WhatsApp Baileys linked device | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.02 | Telegram plugin | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.03 | WebChat plugin | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.04 | LINE plugin | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.05 | Zalo Bot API | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.06 | Zalo Personal | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.07 | WeChat plugin | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.08 | optional Signal plugin | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.09 | Viber plugin | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L084.10 | Messenger Graph API plugin | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L085.01 | telemetry removed | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L085.02 | ClawHub auto-install removed | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L085.03 | Matrix behind extra-channel flag | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L085.04 | IRC behind extra-channel flag | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L085.05 | Mattermost behind extra-channel flag | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L085.06 | Teams behind extra-channel flag | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L086.01 | Kaki CLI | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L086.02 | Kaki daemon | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L086.03 | Kaki config directory | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L086.04 | skill-format compatibility | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L089.01 | Port into &#96;packages/core/src/learning&#96;, &#96;packages/memory&#96;: | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L090.01 | successful-trajectory skill creation | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L090.02 | failure skill refinement | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L090.03 | memory nudge | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L090.04 | FTS5 cross-session recall | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L090.05 | asynchronous delegate_task fan-out | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L090.06 | journey edit and delete | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L090.07 | crash-durable delivery ledger | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L093.01 | Approval-card UX, background-task reporting style, "here's the number and the exact script" fallback when blocked, vendor negotiation over WhatsApp while the user sleeps. | kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/ | node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts | partial | Full Kaki default-owner and live-channel integration remains under review. |
| L095.01 | ## 8. Repository layout (create exactly) | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L097.01 | kaki/ | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L098.01 | packages/ | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L099.01 | core/            # OpenClaw fork + learning loop | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L100.01 | channels-extra/  # Viber, Messenger, any new channel plugins | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L101.01 | phone-node/      # daemon (TS) + vision (py) + skills | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L102.01 | browser-node/    # Playwright runtime, selector/vision fallback, portal skills runtime | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L103.01 | approval-node/   # cards, policy engine, handoffs | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L104.01 | sg-data/         # LTA, data.gov.sg, OneMap, NEA, SGQR, address parser, monitors | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L105.01 | sea-data/        # MY/ID/TH/VN/PH data + QR rails + regional tools | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L106.01 | models/          # router, normaliser, ASR/TTS, SEA-LION/Typhoon/Sahabat, SEA-Guard, embeddings | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L107.01 | memory/          # household graph, FTS+vector, journey, privacy | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L108.01 | locale/          # sg, my, id, th, vn, ph, mm, kh packs | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L109.01 | skills/          # sg/, sea/, my/, id/, th/, vn/, ph/, learned/ | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L110.01 | security/        # secrets, policy, pacing, session guards, audit | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L111.01 | apps/ | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L112.01 | control-ui/      # extended OpenClaw UI | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L113.01 | companion-android/ # Kotlin a11y service + gesture injector | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L114.01 | evals/             # per-language intent/register sets, skill fixtures, persona scripts | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L115.01 | docs/              # ARCHITECTURE, INTERFACES, DECISIONS, PERSONAS, VERIFY, RUNBOOK, PROGRESS, agents/ | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L116.01 | scripts/           # install.sh, kaki onboard, docker-compose, systemd, backup | kaki/ | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L119.01 | ## 9. Core interfaces &#96;[AGENT:ARCHITECT]&#96; — write to &#96;docs/INTERFACES.md&#96; and enforce via TS types | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L120.01 | Channel inbound contract | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L120.02 | Channel outbound text | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L120.03 | Channel outbound markdown-lite | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L120.04 | Channel outbound image | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L120.05 | Channel outbound document | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L120.06 | Channel outbound button emulation | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L120.07 | Channel outbound reaction | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L121.01 | Tool name | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L121.02 | Tool JSON schema | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L121.03 | Tool run | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L121.04 | Tool risk category | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L121.05 | Tool approval requirement | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L122.01 | browser Surface | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L122.02 | phone Surface | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L122.03 | approval Surface | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L122.04 | API Surface | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L122.05 | Surface execute | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L122.06 | Surface screenshot | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L122.07 | Surface trace | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.01 | ApprovalCard | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.02 | PolicyDecision auto | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.03 | PolicyDecision ask | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.04 | PolicyDecision deny | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.05 | Trace | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.06 | Skill id | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.07 | Skill when | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.08 | Skill inputs | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.09 | Skill surfaces | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.10 | Skill approvals | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.11 | Skill locales | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L123.12 | Skill version | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L124.01 | Household entity | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L124.02 | Person entity | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L124.03 | Place entity | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L124.04 | Vendor entity | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L124.05 | Account entity | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L125.01 | &#96;LocalePack&#96; loader contract. | kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md | pnpm --filter @kaki/core test | verified | — |
| L133.01 | dedicated WhatsApp number | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L133.02 | wizard QR linking | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L133.03 | private WhatsApp auth | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L133.04 | automatic reconnect | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L133.05 | Telegram session-death alert | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L133.06 | QR relink prompt | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L134.01 | WhatsApp text | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L134.02 | WhatsApp images | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L134.03 | WhatsApp PDFs | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L134.04 | WhatsApp voice notes | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L134.05 | WhatsApp locations | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L134.06 | WhatsApp contacts | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L134.07 | WhatsApp reactions | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L135.01 | group JID household mapping | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L135.02 | mention handling | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L135.03 | reply-quote threading | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L135.04 | per-person register | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L136.01 | Allowlist default = onboarding user + family group. Non-allowlisted inbound ignored except outbound-initiated vendor threads. | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L137.01 | typing indicator | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L137.02 | 1.5–6 second jitter | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L137.03 | non-household rate cap | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L137.04 | new-contact daily cap | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L137.05 | night-mode silence | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L138.01 | logout detection | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L138.02 | ban detection | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L138.03 | 429 detection | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L138.04 | outbound pause | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L138.05 | operator alert | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L138.06 | wa relink command | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.01 | /status | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.02 | /approve | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.03 | /deny | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.04 | /relink-wa | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.05 | /journey | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.06 | /household | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.07 | /phone screenshot | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.08 | /phone tap | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.09 | /skills | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.10 | /cron | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.11 | /locale | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.12 | /pause | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.13 | /resume | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.14 | /cost | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L141.15 | Telegram approval card buttons | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.01 | OGG/Opus input | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.02 | MERaLiON-2 self-hosted ASR | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.03 | Whisper large-v3-turbo fallback | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.04 | code-switch preservation | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.05 | optional outbound TTS | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.06 | TTS off by default | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.07 | Singapore-accent TTS | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.08 | Mandarin TTS | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.09 | Malay TTS | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L144.10 | Tamil TTS | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L147.01 | LINE Messaging API | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L147.02 | Zalo Bot API | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L147.03 | Zalo Personal | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L147.04 | Viber Bot | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L147.05 | Messenger Graph API | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L147.06 | WeChat | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L147.07 | fixture E2E per regional channel | kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/ | pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test | fixture | Linked provider accounts and real inbound/outbound delivery are unavailable. |
| L150.01 | Grab phone app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.02 | Gojek phone app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.03 | foodpanda phone app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.04 | SimplyGo phone app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.05 | Parents Gateway phone app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.06 | HealthHub phone app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.07 | bank phone apps | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.08 | Touch 'n Go phone app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.09 | GCash phone app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.10 | MoMo phone app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.11 | physical assistant-owned Android | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.12 | assistant-owned accounts | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L150.13 | S$200 default wallet cap | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.01 | Gateway node connection | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.02 | ADB USB | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.03 | ADB Wi-Fi | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.04 | screenshot | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.05 | tap | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.06 | long_press | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.07 | swipe | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.08 | Unicode type | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.09 | key | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.10 | launch | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.11 | intent | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.12 | clipboard | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.13 | dump_ui | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.14 | wait_for text | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.15 | wait_for image | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.16 | wait_for idle | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.17 | notifications | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L152.18 | back_to_home | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L153.01 | Kotlin companion | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L153.02 | accessibility tree | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L153.03 | gesture injection | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L153.04 | notification listener | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L153.05 | local WebSocket | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L154.01 | screen-on | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L154.02 | battery optimization disabled | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L154.03 | nightly reboot cron | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L154.04 | ADB auto-reconnect | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L154.05 | deep-status phone health | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L156.01 | Input: screenshot + a11y tree + goal + history. Output (strict JSON): | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.01 | vision observation | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.02 | vision progress | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.03 | tap action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.04 | long_press action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.05 | swipe action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.06 | type action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.07 | key action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.08 | launch action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.09 | wait action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.10 | scroll_to action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.11 | done action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.12 | need_approval action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.13 | fail action | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.14 | vision target | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.15 | vision value | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L157.16 | vision confidence | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158.01 | accessibility-first targeting | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158.02 | coordinate fallback | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158.03 | screenshot-diff stall detection | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158.04 | BACK recovery | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158.05 | relaunch recovery | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158.06 | 40-step budget | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158.07 | trace persistence | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158.08 | UI trace replay | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L158.09 | learning trace input | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L159.01 | Approval checkpoint on screens matching money/confirm/pay/book/order/submit. | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.01 | grab-ride | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.02 | grab-food | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.03 | foodpanda | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.04 | simplygo | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.05 | parents-gateway | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.06 | healthhub-app | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.07 | bank-app-readonly | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.08 | touch-n-go | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.09 | gcash | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.10 | momo | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L161.11 | generic-app-task | kaki/packages/phone-node/; kaki/apps/companion-android/ | pnpm --filter @kaki/phone-node test | blocked-live | A physical assistant-owned Android and app accounts are required. |
| L164.01 | WhatsApp numbered approval | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L164.02 | Telegram inline approval | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L164.03 | UI approval inbox | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L164.04 | approval evidence | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L164.05 | 2-hour expiry | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L164.06 | one re-ping | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L164.07 | approval audit | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.01 | message.household policy | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.02 | message.external policy | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.03 | money.transfer policy | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.04 | money.purchase policy | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.05 | booking policy | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.06 | gov.singpass policy | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.07 | account.change policy | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.08 | data.share policy | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.09 | auto decision | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.10 | ask decision | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.11 | deny decision | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.12 | household message auto default | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.13 | known-payee under S$30 auto default | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.14 | S$30 or more ask default | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.15 | new external contact ask-once default | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.16 | Singpass always ask default | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L165.17 | account change always ask default | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L166.01 | **Singpass handoff**: detect Singpass login/QR page → screenshot QR → send "Scan with Singpass to continue" → poll → resume. Password+SMS/2FA path supported. | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L167.01 | **Bank 2FA handoff**: fill transfer on bank web (DBS iBanking/OCBC/UOB) → trigger digital-token push → "approve in your bank app" → poll success → receipt screenshot. | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L168.01 | **PayNow one-tap**: SGQR → decode → card → approve → bank flow → receipt. Fallback: regenerate QR image for user to scan in their own app. | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L169.01 | DuitNow handoff | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L169.02 | PromptPay handoff | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L169.03 | QRIS handoff | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L169.04 | VietQR handoff | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L169.05 | QR Ph handoff | kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/ | pnpm --filter @kaki/approval-node test | blocked-live | Real Singpass, bank, and payment approvals require operator-controlled accounts. |
| L172.01 | Typed tools, cached, rate-limited, fixture-tested: | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.01 | BusArrival | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.02 | BusRoutes | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.03 | BusStops | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.04 | TrainServiceAlerts | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.05 | CarParkAvailability | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.06 | ERPRates | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.07 | TaxiAvailability | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.08 | TrafficIncidents | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.09 | EstTravelTimes | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L173.10 | TrafficImages | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.01 | 2-hour forecast | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.02 | 24-hour forecast | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.03 | rainfall | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.04 | PSI | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.05 | PM2.5 | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.06 | UV | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.07 | dengue clusters | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.08 | HDB resale prices | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.09 | hawker closures | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.10 | school holidays | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.11 | public holidays | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L174.12 | COE results | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L175.01 | OneMap geocode | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L175.02 | OneMap reverse geocode | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L175.03 | OneMap walking route | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L175.04 | OneMap driving route | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L175.05 | OneMap public-transport route | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L175.06 | OneMap planning area | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L175.07 | SG address parser | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L175.08 | postal-code building lookup | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L176.01 | NEA warnings | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L176.02 | MOH clinic hours | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L176.03 | NLB catalogue | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L176.04 | ActiveSG facility slots | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L177.01 | SGQR image decode | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L177.02 | SGQR string decode | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L177.03 | EMVCo Tag 26 PayNow proxy | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L177.04 | EMVCo editable flag | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L177.05 | EMVCo Tag 54 amount | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L177.06 | EMVCo Tag 59 name | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L177.07 | EMVCo Tag 62 reference | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L177.08 | SGQR encode | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.01 | rain-before-commute monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.02 | train disruption monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.03 | haze monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.04 | dengue-near-home monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.05 | hawker-closure monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.06 | ERP-change monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.07 | BTO and resale monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.08 | CPF and SRS monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.09 | IRAS monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.10 | road-tax/parking/insurance monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L178.11 | COE monitor | kaki/packages/sg-data/ | pnpm --filter @kaki/sg-data test | fixture | Credentialed datasets and monitor delivery require live provider evidence. |
| L181.01 | DuitNow decode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L181.02 | DuitNow encode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L181.03 | Touch 'n Go read | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L181.04 | causeway info | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L181.05 | VEP info | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L181.06 | MET Malaysia weather | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L181.07 | JAKIM prayer times | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L181.08 | MyDigital ID handoff | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L181.09 | Malaysia holidays | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L182.01 | QRIS decode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L182.02 | QRIS encode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L182.03 | Gojek phone | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L182.04 | Tokopedia phone | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L182.05 | BMKG weather | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L182.06 | KRL schedules | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L182.07 | TransJakarta schedules | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L182.08 | Indonesia prayer times | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L182.09 | IKD handoff | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L183.01 | PromptPay decode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L183.02 | PromptPay encode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L183.03 | LINE-native flows | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L183.04 | BTS info | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L183.05 | MRT info | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L183.06 | TMD weather | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L183.07 | ThaID handoff | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L183.08 | Buddhist holy days | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L183.09 | alcohol-ban days | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L184.01 | VietQR decode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L184.02 | VietQR encode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L184.03 | Zalo OA | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L184.04 | Zalo Bot | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L184.05 | MoMo read | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L184.06 | ZaloPay read | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L184.07 | VNeID handoff | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L184.08 | Tết calendar | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L185.01 | QR Ph decode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L185.02 | QR Ph encode | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L185.03 | GCash read | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L185.04 | Maya read | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L185.05 | eGovPH SSO | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L185.06 | eGovPH eVerify | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L185.07 | PAGASA weather | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L185.08 | Messenger | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L185.09 | Viber | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.01 | Wise web | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.02 | Remitly web | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.03 | cross-border PayNow | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.04 | cross-border DuitNow | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.05 | cross-border PromptPay | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.06 | cross-border QRIS | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.07 | cross-border VietQR | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.08 | cross-border QR Ph | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.09 | halal finder | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.10 | prayer times | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L186.11 | ASEAN holiday matrix | kaki/packages/sea-data/ | pnpm --filter @kaki/sea-data test | fixture | Country credentials/accounts are not available for every live route. |
| L189.01 | OpenClaw managed Chrome, persistent profile per household (&#96;~/.kaki/chrome/&#96;), SG timezone/locale. | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.01 | Playwright steps | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.02 | resilient selectors | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.03 | vision fallback | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.04 | captcha detection | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.05 | OTP detection | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.06 | handoff card | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.07 | dry-run | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.08 | trace | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.09 | backoff retry | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.10 | layout-change detector | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L190.11 | learned annotation | kaki/packages/browser-node/ | pnpm --filter @kaki/browser-node test | fixture | Real authenticated portal and captcha/OTP handoffs need live proof. |
| L196.01 | ## 16. Skills &#96;[AGENT:SKILLS]&#96; — &#96;skills/<scope>/<slug>/SKILL.md&#96; + &#96;run.ts&#124;py&#96; + &#96;fixtures/&#96; | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.01 | Skill id metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.02 | Skill title metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.03 | Skill when_to_use metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.04 | Skill inputs metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.05 | Skill surfaces metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.06 | Skill approvals metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.07 | Skill locales metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.08 | Skill languages metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.09 | Skill version metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.10 | Skill learned_from metadata | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.11 | skill steps | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.12 | skill checks | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.13 | skill failure modes | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L197.14 | localized handoff text | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.01 | iras-noa | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.02 | iras-file-assist | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.03 | cpf-overview | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.04 | cpf-topup | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.05 | srs-topup | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.06 | hdb-portal | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.07 | lta-vehicle | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.08 | ura-parking | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.09 | sp-group | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.10 | town-council-scc | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.11 | ica-passport-renewal | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.12 | mom-helper-levy-wp | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L200.13 | singpass-myinfo-self | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L201.01 | polyclinic-booking | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L201.02 | healthhub-web | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L201.03 | chas-clinic-finder | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L201.04 | medication-reminders | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L201.05 | elderly-care-sg | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L202.01 | parents-gateway | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L202.02 | school-calendar-sg | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L202.03 | enrichment-booking | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L202.04 | kids-sea | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L202.05 | helper-schedule | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L202.06 | household-ops | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.01 | kopi-order | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.02 | hawker-finder | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.03 | grab-ride | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.04 | grab-food | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.05 | foodpanda | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.06 | simplygo | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.07 | bus-mrt-now | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.08 | weather-commute | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.09 | haze-watch | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.10 | nlb | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.11 | activesg | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L203.12 | moving-house-sg | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204.01 | shopee-web | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204.02 | lazada-web | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204.03 | amazon-sg | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204.04 | carousell-buy-sell | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204.05 | airline-sq | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204.06 | scoot | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204.07 | agoda | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204.08 | klook | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L204.09 | trip-sea | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L205.01 | vendor-outreach | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L205.02 | contractor-followup | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L205.03 | tuition-agency | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L206.01 | family-events | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L206.02 | birthday-gift-sg | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L206.03 | wedding-sea | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L209.01 | currency-remittance | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L209.02 | cross-border-qr | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L209.03 | halal-finder | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L209.04 | prayer-times | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L209.05 | jb-commute | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L209.06 | visa-check-sea | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L209.07 | regional-holidays | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L209.08 | language-bridge | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.01 | duitnow-pay | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.02 | tng-topup | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.03 | jpj-roadtax | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.04 | lhdn-tax | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.05 | myeg | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.06 | qris-pay | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.07 | gojek-ride | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.08 | tokopedia | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.09 | pln-bill | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.10 | bpjs | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.11 | promptpay-pay | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.12 | line-man | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.13 | bts-mrt | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.14 | revenue-dept | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.15 | vietqr-pay | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.16 | zalo-ops | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.17 | momo-read | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.18 | evn-bill | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.19 | qrph-pay | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.20 | gcash-read | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.21 | egovph | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L212.22 | meralco-bill | kaki/packages/skills/ | pnpm --filter @kaki/skills test | fixture | Fixtures stop at declared effect/approval boundaries; live targets remain gated. |
| L214.01 | ## 17. Locale packs &#96;[AGENT:LOCALE]&#96; — &#96;packages/locale/<cc>/&#96; | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.01 | persona.md | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.02 | lexicon.json | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.03 | calendar.json | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.04 | formats.json | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.05 | dietary.json | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.06 | channels.json | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.07 | 200 utterances per language | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.08 | intent labels | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.09 | register labels | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L215.10 | expected-language labels | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.01 | 600-entry SG lexicon | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.02 | kopi and teh vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.03 | hawker vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.04 | housing vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.05 | CPF vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.06 | vehicle vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.07 | national-service vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.08 | school vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.09 | healthcare vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.10 | grocer vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.11 | place vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.12 | Singlish vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.13 | Malay vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.14 | Hokkien and Cantonese vocabulary | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.15 | Tamil and Hindi loans | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.16 | elder register | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.17 | peer register | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.18 | child register | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.19 | contractor register | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.20 | official register | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.21 | school register | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.22 | bank register | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.23 | employer register | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.24 | Singlish | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.25 | English | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.26 | Mandarin | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.27 | Malay | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L216.28 | Tamil | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L217.01 | Malaysia locale pack | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L217.02 | Indonesia locale pack | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L217.03 | Thailand locale pack | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L217.04 | Vietnam locale pack | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L217.05 | Philippines locale pack | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L217.06 | Myanmar locale stub | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L217.07 | Cambodia locale stub | kaki/packages/locale/; kaki/evals/locales/ | pnpm --dir kaki evals | verified | — |
| L220.01 | policy routing | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.02 | Anthropic adapter | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.03 | OpenAI adapter | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.04 | OpenRouter adapter | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.05 | Ollama adapter | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.06 | vLLM adapter | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.07 | SEA-LION API adapter | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.08 | Typhoon adapter | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.09 | Sahabat-AI adapter | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.10 | per-task budgets | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L220.11 | model cache | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L221.01 | Planner/tool-use/vision: frontier (default Anthropic; configurable). | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222.01 | SEA-LION v4.5 normaliser | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222.02 | Qwen3-8B normaliser | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222.03 | lexicon few-shot | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222.04 | intent_text | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222.05 | language | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222.06 | code_switch | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222.07 | register | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222.08 | entities | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L222.09 | language ID | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L223.01 | SEA-LION v4.5 API | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L223.02 | SEA-LION self-host | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L223.03 | Typhoon Thai generation | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L223.04 | Sahabat-AI Indonesian generation | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L223.05 | MaLLaM Malaysian generation | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L223.06 | ILMU Malaysian generation | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L224.01 | MERaLiON-2 ASR | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L224.02 | Whisper ASR fallback | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L224.03 | configurable TTS | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L225.01 | SEA-Guard | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L225.02 | bge-m3 embeddings | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L226.01 | cheap heartbeat model | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L226.02 | cost dashboard | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L226.03 | /cost | kaki/packages/models/ | pnpm --filter @kaki/models test | fixture | Configured provider/model/ASR/TTS live proof is unavailable. |
| L230.01 | SQLite | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.02 | FTS5 | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.03 | vectors | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.04 | Person entity | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.05 | Place entity | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.06 | Account existence | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.07 | Vendor entity | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.08 | Routine entity | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.09 | Preference entity | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.10 | Event entity | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.11 | JID speaker mapping | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.12 | MEMORY.md export | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.13 | /journey | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.14 | memory edit | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.15 | memory delete | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.16 | NRIC masking | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.17 | FIN masking | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.18 | passport masking | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.19 | per-household key | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L230.20 | no secrets | kaki/packages/memory/ | pnpm --filter @kaki/memory test | verified | — |
| L232.01 | mine successful trace | kaki/packages/core/src/learning/ | pnpm --filter @kaki/core test | verified | — |
| L232.02 | write learned skill | kaki/packages/core/src/learning/ | pnpm --filter @kaki/core test | verified | — |
| L232.03 | upgrade learned skill | kaki/packages/core/src/learning/ | pnpm --filter @kaki/core test | verified | — |
| L232.04 | failure annotation | kaki/packages/core/src/learning/ | pnpm --filter @kaki/core test | verified | — |
| L232.05 | nightly consolidation | kaki/packages/core/src/learning/ | pnpm --filter @kaki/core test | verified | — |
| L232.06 | fewer-step reuse | kaki/packages/core/src/learning/ | pnpm --filter @kaki/core test | verified | — |
| L234.01 | keychain secrets | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.02 | encrypted environment file | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.03 | workspace-only filesystem | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.04 | shell ask | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.05 | least-privilege skills | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.06 | policy engine | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.07 | pacing | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.08 | session guards | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.09 | tool-call audit | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.10 | no third-party auto-install | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.11 | dependency audit | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.12 | WhatsApp image injection defense | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.13 | PDF injection defense | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.14 | vendor-reply injection defense | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.15 | no injected money action | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L234.16 | no injected external action | kaki/packages/security/ | pnpm --filter @kaki/security test | verified | — |
| L236.01 | Household tab | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L236.02 | Approvals tab | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L236.03 | Phone live view | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L236.04 | Phone manual control | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L236.05 | Journey tab | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L236.06 | Skills editor | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L236.07 | Locale tab | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L236.08 | Cost tab | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L236.09 | Traces replay | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L236.10 | Monitors tab | kaki/apps/control-ui/; extensions/kaki/ | pnpm --filter @kaki/control-ui test | partial | A real authenticated Gateway browser capture is still required. |
| L243.01 | You are Kaki — this household's personal assistant in Singapore (locale: sg). You live in their WhatsApp family group and Telegram. You are warm, quick, and quietly competent: the kaki who can settle things. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L245.01 | LANGUAGE & REGISTER | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L246.01 | Mirror the speaker. Singlish in, natural Singlish out (light particles: lah/leh/lor/sia/hor; "can"/"cannot"; "on"; "settle") — never caricature. Standard English in, standard English out. Mandarin/Malay/Tamil in → reply in that language; short sentences for elders. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L247.01 | Honorifics: Uncle/Auntie for elders; "boss" for contractors; Mr/Ms <surname> for landlords/officials; Kak/Abang where natural for Malay contacts; 阿姨/叔叔 in Mandarin. Formal English for schools, government, banks, employers. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L248.01 | Understand kopitiam orders, HDB/BTO/HFE, CPF OA/SA/MA, COE/ERP, MC/NS, PSLE, CHAS, S&CC, void deck, chope, paiseh, jialat — without asking. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L249.01 | Voice notes: transcribe, act, confirm only what is ambiguous. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L251.01 | HOW YOU WORK | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L252.01 | Do the work first, then ask for one approval. Never say "go to the website" — you go, you fill, you show one thing to confirm. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L253.01 | Always get approval for: money ≥ the household's auto-cap, any new external contact, bookings, anything via Singpass, account changes. Whitelisted categories run automatically. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L254.01 | Background tasks: "on it ⏳", then a 2–4 line result with a clear next step; react ✅ when done; ❓ when you need the user. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L255.01 | If blocked (captcha, OTP, app changed): say what you did, what's blocking, and hand over a prefilled link or a single tap. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L256.01 | Vendors: polite, local, concise; ask price/availability/warranty; negotiate within the user's target; never commit without approval; present quotes as a short table. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L257.01 | Proactive but not noisy: rain before the school run, MRT disruption on their line, haze, CPF/IRAS deadlines, CNY/Hari Raya closures, expiring parking/road tax. One good heads-up, not five reminders. Quiet hours 23:00–07:00 unless urgent. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L259.01 | CULTURE & CARE | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L260.01 | Respect dietary needs (halal, vegetarian, no beef/pork) and religious timings from the household profile without being asked. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L261.01 | Know the calendar: public/school holidays, Ramadan & Hari Raya, Deepavali, Vesak, CNY (reunion dinner, hongbao), Hungry Ghost month, Thaipusam, F1/NDP closures, year-end CPF/SRS, IRAS season. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L262.01 | Elders: gentle, patient, repeat key facts. Kids: age-appropriate, never financial/medical detail. Never share one member's private info (medical, money) with another unless household settings allow. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L263.01 | Never store or repeat NRIC/FIN/passport/bank credentials. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L265.01 | STYLE | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L266.01 | Short. Concrete. Local. Lead with the answer. Tables for comparisons. No corporate filler, no "As an AI". If unsure: one line saying so + the safest next step. | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L268.01 | SOUL.my.md | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L268.02 | SOUL.id.md | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L268.03 | SOUL.th.md | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L268.04 | SOUL.vn.md | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L268.05 | SOUL.ph.md | kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md | node kaki/scripts/qa/requirements-ledger.mjs --check | verified | — |
| L274.01 | ## 20. Definition of Done (all green; automate in &#96;pnpm test:e2e&#96; with fixtures + &#96;docs/VERIFY.md&#96; for live checks) | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275.01 | Ubuntu 24 install | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275.02 | macOS install | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275.03 | kaki onboard | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275.04 | deep WhatsApp status | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275.05 | deep Telegram status | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275.06 | deep phone status | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275.07 | deep Chrome status | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275.08 | deep model status | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L275.09 | deep ASR status | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L276.01 | Family group: "eh tmr 8am need grab to raffles place, 2 pax" → phone-node books, fare approval, "1" confirms, plate+ETA returned. | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L277.01 | Photo of PayNow SGQR → decoded card → approval → bank web + 2FA handoff → receipt screenshot. | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L278.01 | "check my IRAS NOA" → Singpass QR handoff → summary. | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L279.01 | Singlish voice note "kopi-C siew dai peng and teh-o kosong for ma" → correct order posted. | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L280.01 | Ah Ma Mandarin voice note about polyclinic → short Mandarin reply + reminder set. | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L281.01 | "find someone to service 3 aircons this Sat under $150" → ≥5 vendors messaged (mock in CI), quote table ≤2 h, booking on approval. | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L282.01 | Parents Gateway notice → calendar event + consent-form approval card. | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L283.01 | rain-before-commute fires | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L283.02 | MRT disruption fires | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L283.03 | CPF deadline fires | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L283.04 | hawker closure fires | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L283.05 | haze fires | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L284.01 | Learning loop: novel browser task → &#96;skills/learned/&#96; entry → reuse with fewer steps. | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L285.01 | 90% SG locale evaluation | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L285.02 | five SG languages | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L285.03 | 80% Malaysia evaluation | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L285.04 | 80% Indonesia evaluation | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L285.05 | 80% Thailand evaluation | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L285.06 | 80% Vietnam evaluation | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L285.07 | 80% Philippines evaluation | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L285.08 | 85% register accuracy | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L286.01 | unapproved money blocked | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L286.02 | unknown WhatsApp sender ignored | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L286.03 | pacing enforced | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L286.04 | prompt-injection red team | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L286.05 | no secrets in logs | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L286.06 | no secrets in memory | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287.01 | Malaysia five starter skills | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287.02 | Indonesia five starter skills | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287.03 | Thailand five starter skills | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287.04 | Vietnam five starter skills | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287.05 | Philippines five starter skills | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287.06 | LINE fixture channel | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287.07 | Zalo fixture channel | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287.08 | Viber fixture channel | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L287.09 | Messenger fixture channel | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.01 | README quickstart | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.02 | ARCHITECTURE | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.03 | INTERFACES | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.04 | DECISIONS | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.05 | PERSONAS | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.06 | VERIFY | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.07 | RUNBOOK ban recovery | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.08 | RUNBOOK relink | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.09 | RUNBOOK phone reset | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.10 | SKILLS catalogue | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.11 | locale guide | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.12 | CONTRIBUTING | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.13 | green CI | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L288.14 | v1.0-sg tag | kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md | pnpm --dir kaki acceptance:release | blocked-live | Release acceptance requires exact-build live evidence for operator-owned surfaces. |
| L290.01 | ## 21. Milestones (loop within each until its tests pass) | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L293.01 | Fork, rename, Hermes patterns scaffolded, interfaces, CI skeleton | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L294.01 | WA+TG+WebChat live, voice → MERaLiON, pacing, session guard; LINE/Zalo/Viber/Messenger flagged | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L295.01 | LTA/data.gov.sg/OneMap/NEA tools, address parser, SGQR, monitors | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L296.01 | Phone daemon + companion app + vision loop; Grab/food/SimplyGo/Parents Gateway/HealthHub/bank-read | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L297.01 | Approval engine + policy; Singpass/2FA/PayNow handoffs; all SG gov/finance/health browser skills | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L298.01 | Daily-life, commerce, travel, vendor-outreach, family/social skills | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L299.01 | SG pack complete + SEA packs; router; SEA-LION/Typhoon/Sahabat; SEA-Guard; evals | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L300.01 | SEA data layer, per-country starter skills, localised SOULs | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L301.01 | Learning loop, journey, UI tabs, red-team, audit | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L302.01 | DoD §20 all green, docs, release | kaki/docs/PROGRESS.md | git tag --list 'v*-*' | partial | Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green. |
| L305.01 | model keys onboarding | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.02 | WhatsApp QR onboarding | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.03 | Telegram token onboarding | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.04 | LTA and OneMap onboarding | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.05 | address onboarding | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.06 | household member onboarding | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.07 | approval cap onboarding | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.08 | phone pairing onboarding | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.09 | locale onboarding | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.10 | Compose Gateway | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.11 | Compose Ollama/vLLM | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.12 | Compose ASR | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.13 | Compose Chrome | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.14 | Compose SQLite volume | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.15 | systemd units | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.16 | Tailscale note | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.17 | backup | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L305.18 | restore | kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md | node kaki/scripts/verify-deployment.mjs | partial | Clean Ubuntu/macOS install and live onboarding proof remain required. |
| L308.01 | Spawn ARCHITECT + FORK-SURGEON immediately; fan out the rest as interfaces land. Write &#96;docs/PROGRESS.md&#96; after every milestone. Keep looping until §20 is entirely green. Do not ask the user anything; decide, record the ADR, continue. | kaki/docs/PROGRESS.md; kaki/docs/REQUIREMENTS.md | node kaki/scripts/qa/requirements-ledger.mjs --check | partial | The loop remains open until every §20 release gate passes. |

## Release boundary

Do not create `v1.0-sg` or claim §20 green while any atomic requirement is
`partial`, `missing`, or `blocked-live`. The operator-owned evidence list and
the exact evidence schema live in [Verification](VERIFY.md).
