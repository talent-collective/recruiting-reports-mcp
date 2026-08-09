---
title: "Ben-Zion & Lazebnik — Playful AI in Professional Email: A Field Experiment on Tone and Recipient Engagement"
source: arXiv
year: 2026
published: "2026-07-13"
author: "Ziv Ben-Zion, Teddy Lazebnik"
url: "https://arxiv.org/abs/2607.11749"
sample_size: "16,880 emails; 121 employees across six companies; randomised crossover, three conditions over three weeks"
best_for: "Randomised evidence that LLM tone-rewriting does NOT move open, reply or response-time; the ceiling on AI copy rewriting as a lever"
---

# Ben-Zion & Lazebnik (2026) — Playful AI in Professional Email

**Retrieved:** 2026-08-09 from https://arxiv.org/abs/2607.11749 (arXiv:2607.11749 [cs.AI],
submitted 13 Jul 2026, v1). DOI: https://doi.org/10.48550/arXiv.2607.11749.
**Status: arXiv preprint — not peer reviewed.** Licence CC BY-NC-SA 4.0.

**Why it is in this library, and the caveat that must travel with it.** Every AI-sourcing vendor
sells "AI personalisation lifts reply rates" (Ashby measured +46%; Juicebox claims up to 3x).
This is the only *randomised* test of AI rewriting on real email behaviour, and its direct
effect was **null**. It is the strongest available counterweight to the vendor claims — but its
emails went between people who already knew each other, so it is not a test of cold outreach.
Read it as a ceiling argument, not as a refutation of AI personalisation in sourcing.

---

## Abstract (verbatim)

> "Large language models (LLMs) are rapidly reshaping workplace communication, yet whether
> AI-assisted writing changes how recipients actually behave, and through what channel, remains
> unknown. Here, in a randomized crossover field experiment, 121 employees across six companies
> sent work emails under three conditions over three weeks: unaided writing, GPT-5 rewriting in
> a playful tone, and GPT-5 rewriting in a professional tone. Across 16,880 emails, playful
> editing increased emotional positivity (B=+0.068, p<0.001), and professional editing decreased
> it (B=-0.041, p<0.001), yet neither condition directly altered open rates, reply rates, or
> response times. Instead, within-sender positivity strongly predicted both opening (OR=2.05)
> and replying (OR=3.32, p<0.001), a significant indirect pathway through which AI editing
> shaped behavior, in the absence of any direct effect. These findings suggest that AI-assisted
> communication shapes workplace engagement not through its use, but through the emotional tone
> of the language it produces."

---

## Design

| Element | Detail |
|---|---|
| Design | Randomised **crossover** field experiment |
| N (senders) | 121 employees across **six companies** |
| N (emails) | **16,880** |
| Duration | Three weeks |
| Conditions | (1) unaided writing · (2) GPT-5 rewriting in a **playful** tone · (3) GPT-5 rewriting in a **professional** tone |
| Outcomes | Open rate, reply rate, response time |

## Results

| Result | Estimate |
|---|---|
| Playful editing → emotional positivity | B = **+0.068**, p < 0.001 |
| Professional editing → emotional positivity | B = **−0.041**, p < 0.001 |
| **Direct effect of either condition on open rate, reply rate, response time** | **None** |
| Within-sender positivity → opening | OR = **2.05** |
| Within-sender positivity → replying | OR = **3.32**, p < 0.001 |

The 3.32 odds ratio is the eye-catching number and it is the **observational** half of the
paper — natural variation in a sender's own positivity, not something the randomisation
produced. The randomised half is the null.

---

## The limit — state it every time this is cited

Every message in the experiment went between people who **already knew each other**:
colleagues, clients, existing threads. A warm recipient reading a warmer-than-usual note from a
known sender is not the same situation as a stranger reading a first-touch recruiting pitch.
The paper does not claim otherwise and does not test cold outreach.

---

## Key Conclusions

- **Tone rewriting, randomised, did nothing to reply rates.** The mechanism the paper proposes
  is indirect: AI changes tone, tone correlates with replies — but assigning the tone did not
  produce the replies.
- This is the correct sceptical prior for **"AI personalisation" claims measured
  observationally**. Ashby's +46% AI-personalisation lift is a real measurement of real users,
  but the users who turn AI personalisation on are not a random half of the population, and this
  experiment is what that distinction looks like when you remove it.
- What it does **not** license: concluding AI personalisation is worthless in sourcing. Cold
  outreach personalisation is largely about *relevance and specificity* (referencing the
  candidate's actual work), which is a different intervention from *tone*, and it was not tested
  here.
- The unresolved question this leaves is exactly the gap worth running an experiment on:
  randomised AI-personalised vs generic **cold** recruiting outreach, on real passive candidates.
