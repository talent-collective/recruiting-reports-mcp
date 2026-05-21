# I Built a Recruiting Benchmarks Tool With Claude in Under Two Hours. Here's Every Prompt I Used.

This is the first post in a series where I build things in public. Not to show off, but to make it easier for others in TA to see what's actually possible and try it themselves. No coding required. Just a goal and a willingness to iterate.

From first prompt to a live, publicly accessible tool with automated weekly updates took just under two hours. Here is exactly how I did it.

---

## Problem

Every quarter I find myself hunting through the same handful of PDFs: Ashby's benchmarks, Gem's outreach data, LinkedIn's talent report. I know the data exists. I just can never remember which report has which number, and copy-pasting context into Claude every time I want to ask a question stopped being sustainable.

I wanted one place where all of it lived, queryable in plain English, always up to date, shareable with anyone in TA.

---

## Process

### Step 1: Collect the reports

I started by identifying the reports I actually reference. Ashby, Gem, LinkedIn, SHRM, iCIMS, Korn Ferry, HireVue. Then I prompted Claude to go get them:

> "Look up ashbyhq.com/talent-trends-report, scrape it, and add it to my knowledge base."

> "What about Gem? Yeah, all of them."

Claude pulled each report, extracted the meaningful data, and saved everything as structured markdown files. For each one it captured the methodology, sample size, key stats, and direct quotes so they could be cited properly later. I ended up with 22 reports.

### Step 2: Make them queryable

A folder of markdown files is not useful to anyone but me. I wanted something anyone could connect to Claude and use in plain English. That meant building an MCP server. MCP (Model Context Protocol) is how you connect external data sources directly into Claude so it can reference them in any conversation, without you having to paste anything in.

My prompt:

> "I want to create a function that allows anyone to reference this folder of markdown files. It could be a Claude skill or an MCP. I want anyone to be able to access it."

From there I layered in specific capabilities one prompt at a time:

> "I also want a feature to search for quotes across reports."

> "When users query the MCP, it's important that you ask them what year they're looking to query. Some people may want to compare year over year."

### Step 3: Deploy it publicly

I told Claude I wanted it publicly accessible. It walked me through pushing to GitHub and deploying on Render. The server has been live since.

### Step 4: Automate the updates

> "I want to create an agent that scours the web weekly for new reports, reads them, and adds only credible reports to my knowledge base. Send me an email when a new report is added."

A scheduled agent now runs every week, evaluates new reports for credibility and methodology, and adds qualifying ones automatically. I do not have to touch it.

---

## Solution

The result is a public MCP server with 22+ recruiting benchmark reports. Anyone with a Claude account can connect it in 30 seconds:

1. Settings > Customize > Connectors > Add custom connector
2. Paste in: `https://two026-recruiting-reports.onrender.com/mcp`
3. Toggle it on in your next chat

Then ask it anything:

- "What's the average time-to-fill for a 500-person company?"
- "What does the data say about offer acceptance rates at Series B startups?"
- "Find quotes on AI in hiring from 2026 reports"

Full source and report list: github.com/talent-collective/recruiting-reports-mcp

---

## Expected Impact

The immediate use case is faster answers to benchmark questions. Instead of "I think I saw something in the Ashby report," you get the actual number with the source and sample size in about 10 seconds.

The larger bet is that this is how TA teams should be using AI: not just as a writing tool, but as a live connection to the data and research that informs decisions. Most teams are still copying and pasting. Building an MCP means the context is always there.

All you need is a goal, a decent sense of how you might approach it, and Claude to help you get there. The prompts are the product. The code is just what happens in between.

Your turn.
