# Service Models: IaaS, PaaS, SaaS

🚧 **Under construction** — scaffold for the syllabus; final content to be written.

The single most useful lens on cloud is **how much you operate versus how much is operated for
you**. That spectrum has three named stops — IaaS, PaaS, and SaaS — and knowing where a service
sits tells you instantly what work, risk, and control you keep.

## What this lesson covers

- The responsibility spectrum from on-prem (you do everything) to SaaS (you do almost nothing),
  with a clear diagram of who manages what at each layer (hardware → OS → runtime → app → data).
- **IaaS** — rent raw compute, storage, network (e.g. virtual machines). You still install and
  patch the OS and everything above it.
- **PaaS** — rent a managed platform (e.g. a managed database, an app runtime). The provider
  operates the engine; you bring data and configuration.
- **SaaS** — rent finished software (e.g. email, a BI tool). You bring only your usage.
- Where databases land on this spectrum — the bridge to the second module: a managed database is
  PaaS; a self-installed Postgres on a rented VM is IaaS.
- The trade-off in one line: less to operate means less to control.

## Key takeaways

- IaaS / PaaS / SaaS is a spectrum of *operational responsibility*, not product tiers.
- The higher you go, the more the provider operates — and the less you can customize.
- "Managed" almost always means PaaS: same engine, someone else runs it.

**Next:** Deployment models
