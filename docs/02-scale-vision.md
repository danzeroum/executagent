# 02 · Scale vision (NOT built now)

The original reference architecture targets ~10k concurrent users with self-hosted
inference. That is the destination, not the MVP. Each MVP component has a deliberate,
documented upgrade path so we never paint ourselves into a corner.

| Concern | MVP (now) | Scale replacement | Trigger to migrate |
| --- | --- | --- | --- |
| Async messaging | pgmq (Postgres queue) | Apache Kafka | Sustained > ~10k msg/s, or cross-service fan-out beyond Postgres throughput. |
| Vector routing | pgvector + HNSW | Qdrant / Weaviate cluster | Index > ~10–50M vectors or routing latency budget exceeded. |
| Auth / identity | Supabase Auth (OIDC/JWT, PKCE) + `profiles.role` RBAC | Keycloak (self-hosted) | Enterprise SSO, multi-tenant org hierarchies, custom token policies. |
| Progress channel | Supabase Realtime | Dedicated WebSocket service | Realtime connection limits or custom backpressure needs. |
| Compute | Edge Functions (Deno) | K8s microservices + HPA | Long-running jobs beyond function time limits; GPU workloads. |
| Inference | Managed APIs behind `ModelProvider` | self-hosted vLLM / TensorRT-LLM | Cost crossover or data-residency / latency requirements. |
| Observability | structured JSON logs + `trace_id` | OpenTelemetry + Jaeger + Prometheus/Grafana | Cross-service distributed tracing, SLO dashboards. |
| Caching | one cache table + provider-level reuse | multi-level (in-mem LRU + Redis + file) | Cache hit-rate / latency targets unmet. |
| Originality | intra-batch similarity (honest stub) | external-corpus plagiarism check | Product requires "checked against the web" guarantees. |
| PII in images | redact text metadata only | OCR-based in-image PII detection | Image artifacts begin carrying rendered PII. |
| Secrets | Supabase Vault + manual rotation | KMS + automated rotation | Compliance-mandated rotation cadence. |
| Rate limiting | basic per-user/per-tier in `create-task` | gateway (Kong/Traefik) tiered limits | Public API exposure / monetized tiers at scale. |

## Capacity notes (from the reference architecture, for later)

Targets to design toward — **not** MVP commitments: 99.9% availability, p50 cycle ≤ 6 min,
horizontal scaling per skill+tier, circuit breakers with tier-downgrade fallback (L→M→S),
RPO ≤ 5 min / RTO ≤ 30 min. These belong with the K8s migration, not the Supabase MVP.

## The self-hosted swap point

`packages/providers/src/selfHostedStub.ts` throws `NotImplemented`. When self-hosting
arrives, implement `ModelProvider` there (vLLM for S/M, TensorRT-LLM for L) and register it
in `registry.ts`. **No skill code changes** — that is the entire point of the abstraction.
