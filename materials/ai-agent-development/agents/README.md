# AI Agent Development

A model you call once answers a question. A model you call in a **loop**, with **tools**, against
your own **data**, is an agent. This module builds that loop by hand on Gemini, turns it into an
agent that answers questions about a database, and then shows what it takes to run one safely: a
closed list of names instead of free SQL, walls that do not read the prompt, a price gate, evals, and
an identity for the agent and for its caller.

## What you'll learn

| # | Lesson | Duration |
|---|---|---|
| 00 | What a Language Model Is | 7 min |
| 01 | The Model Behind an API | 8 min |
| 02 | From a Completion to an Agent | 8 min |
| 03 | What We Are Building | 5 min |
| 04 | The Loop in Code | 14 min |
| 06 | Tools the Model Can Use | 12 min |
| 06b | Tools on the Database | 13 min |
| 07 | Answers Code Can Use | 12 min |
| 08 | Seeing Why It Chose | 15 min |
| 16 | The System Prompt | 10 min |
| 17 | The SQL Agent, End to End | 22 min |
| 19 | Task 1: Build the SQL Agent | 45 min |
| 19b | Why Free SQL Is Not Production | 18 min |
| 25 | Defences in Depth | 12 min |
| 12 | MCP: One Protocol for Tools | 15 min |
| 20 | What Every Request Carries | 17 min |
| 22 | Caching the Start | 12 min |
| 29 | A Framework: Google ADK | 11 min |
| 30a | Task 2: The Warehouse Agent | 30 min |
| 30b | Task 2: Deploy the Agent | 15 min |
| 30 | Evals and Observability | 20 min |
| 31b | From Proof of Concept to Production | 25 min |
| 28 | Patterns Built on the Loop | 8 min |
| 26 | Embeddings and Vector Search | 15 min |
| 35 | A Team of Agents | 20 min |

About 6 hours 29 minutes in all; the last two lessons are a bonus.

```{note}
🚧 Scaffold module — the lessons are written as lesson-app pages (`app: true` in the course), not as
MyST pages; the learning path is settled in `module.yml`.
```
