# Architectural Analysis: Webhook Delivery Status Tracking

**Problem**: Add real-time delivery status tracking so merchants can see whether their webhooks were delivered, failed, or are pending retry.
**Date**: 2026-03-24
**Status**: FINAL

---

## 1. Executive Summary

Merchants cannot currently determine whether webhooks were delivered, causing a 40% increase in support ticket volume. We recommend **Solution 1: Extend the Existing Webhook Service** with a status tracking table and polling API, because it delivers the core value in 2-3 weeks with minimal operational complexity and team ramp-up. The key trade-off is accepting limited scalability headroom (existing database may bottleneck at 10x current volume) in exchange for speed-to-value and simplicity.

## 2. Problem Understanding

### 2.1 Business Objective
Reduce merchant support tickets related to webhook delivery uncertainty by providing self-service delivery status visibility. Target: 60% reduction in webhook-related support tickets within 3 months of launch.

### 2.2 Technical Challenge
The webhook service currently dispatches webhooks fire-and-forget. Delivery outcomes (success, failure, timeout) are logged but not persisted in a queryable format. Adding status tracking requires: (a) capturing delivery outcomes durably, (b) exposing them via an API, and (c) doing so without degrading webhook dispatch latency or throughput.

### 2.3 Success Criteria
- Merchants can query delivery status for any webhook sent in the last 30 days
- Status updates are visible within 5 seconds of delivery attempt completion
- No measurable increase in webhook dispatch latency (p99 < 200ms, currently ~150ms)
- Support ticket volume for webhook delivery inquiries decreases by 60% within 90 days

### 2.4 Scope Boundaries
**In scope:**
- Delivery status tracking (sent, delivered, failed, retrying, exhausted)
- API endpoint for merchants to query status by webhook ID or time range
- Status retention for 30 days

**Out of scope:**
- Webhook registration or configuration changes
- Push notifications to merchants on delivery failure (future epic)
- Historical backfill of delivery status for webhooks sent before launch
- Changes to the retry policy itself

## 3. Context Landscape

### 3.1 Existing Systems
- **webhook-service**: Java 17 / Spring Boot 3.2, PostgreSQL. Handles registration, dispatch, and retry. Dispatches ~50K webhooks/day. Retry policy: exponential backoff, max 5 attempts.
- **merchant-portal**: React SPA that merchants use for self-service. Currently shows webhook configuration only, not delivery status.
- **Past attempt**: In Q2 2025, a proposal to add webhook analytics was shelved due to competing priorities. The design doc (Confluence: "Webhook Analytics Proposal") suggested a separate analytics service with Kafka. The approach was considered over-engineered for the immediate need.

### 3.2 Product Scope
- **Epic**: PROJ-E-456 "Webhook Delivery Visibility"
- **Features**: Status API, merchant portal status page, delivery failure alerts (P2, deferred to next quarter)
- **Timeline**: Must ship core status API by end of Q2 2026. Portal integration in early Q3.
- **Adjacent work**: PROJ-E-460 "Webhook Retry Policy Overhaul" is planned for Q3 — any architecture should not conflict with this.

### 3.3 Codebase Analysis
**webhook-service** (`/Users/e124866/Projects/webhook-service`):
- Layered architecture: OpenAPI spec-first, delegate pattern, MapStruct mappers, Spring Data JPA
- PostgreSQL with Flyway migrations. Current schema has `webhook_config`, `webhook_endpoint`, `webhook_event` tables
- `webhook_event` table has ~15M rows (6 months). No delivery outcome column — outcomes logged to Splunk only
- Dispatch is synchronous within a `@Async` thread pool. HTTP client: RestTemplate (not WebClient)
- No event bus or message queue currently integrated
- Tech debt: RestTemplate should migrate to WebClient; JaCoCo coverage at 45% (below 80% target)

## 4. Assumptions & Unknowns

### Known Facts
| Fact | Source |
|------|--------|
| Current webhook volume: ~50K/day | Codebase analysis (webhook-service metrics) |
| PostgreSQL is the existing database | Codebase analysis (application.yml) |
| Retry policy: exponential backoff, max 5 attempts | Codebase analysis (RetryConfig.java) |
| Merchant portal is a React SPA | Confluence: "Merchant Portal Architecture" |
| Q3 retry policy overhaul is planned | Aha: PROJ-E-460 |

### Assumptions
| # | Assumption | Confidence | If Wrong, Changes... |
|---|-----------|------------|---------------------|
| A1 | PostgreSQL can handle status write load at current volume (50K inserts/day) | HIGH | Would not change — 50K/day is trivial for PostgreSQL |
| A2 | PostgreSQL can handle status write load at 10x volume (500K/day) | MEDIUM | If wrong, Solution 1 scalability score drops from 5 to 3; Solution 2 becomes more attractive |
| A3 | Team of 2 backend engineers is available for 4 weeks | MEDIUM | If fewer engineers or shorter timeline, Solution 1 is the only viable option |
| A4 | Merchants need status within 5 seconds, not sub-second | HIGH | If sub-second needed, polling API insufficient; would need WebSocket/SSE (increases complexity for all solutions) |
| A5 | 30-day retention is sufficient | HIGH | If longer retention needed, archival strategy required for all solutions |

### Information Gaps
- Exact peak webhook dispatch rate (per-minute) — would help assess DB write contention risk
- Merchant portal team's availability for frontend integration
- Whether the planned retry policy overhaul (Q3) will change the delivery outcome model

### Deferrable Decisions
- Choice of real-time push mechanism (WebSocket vs. SSE vs. polling) — can start with polling and add push later
- Archival strategy for status records older than 30 days — can defer until retention policy is finalized
- Whether to expose status via the existing merchant API gateway or create a new route — two-way door

## 5. Solution Proposals

### 5.1 Solution: Extend Existing Webhook Service

#### 5.1.1 Overview
Add a `webhook_delivery_status` table to the existing webhook-service PostgreSQL database. Capture delivery outcomes during the existing dispatch/retry flow and expose them via new REST endpoints on the same service.

```mermaid
graph LR
    subgraph webhook-service
        A[Webhook Dispatcher] -->|writes status| B[(PostgreSQL)]
        C[Status API] -->|reads status| B
        D[Retry Handler] -->|updates status| B
    end
    E[Merchant Portal] -->|GET /webhooks/{id}/status| C
    F[API Gateway] --> C
```

#### 5.1.2 How It Works
**Data Flow:**
1. Webhook dispatcher attempts delivery via HTTP
2. On response (success/failure/timeout), writes a row to `webhook_delivery_status`
3. On retry, updates the existing status row with new attempt count and outcome
4. Merchant queries `GET /webhooks/{id}/deliveries` to see status history

**Control Flow:**
- Status write happens synchronously after delivery attempt, within the existing `@Async` thread
- Status API is a new delegate implementation in the existing service
- No new infrastructure components

**Key Components:**
| Component | Responsibility |
|-----------|---------------|
| `WebhookDeliveryStatus` entity | JPA entity for delivery status records |
| `DeliveryStatusRepository` | Spring Data JPA repository |
| `DeliveryStatusService` | Business logic for status writes and queries |
| `DeliveryStatusApiDelegateImpl` | REST API delegate for status queries |
| `WebhookDispatcher` (modified) | Writes status after each delivery attempt |

**Integration Points:**
- Merchant Portal via existing API gateway (new endpoints on existing service)
- No new service-to-service integrations

#### 5.1.3 Arguments FOR This Approach
- **Technical**: Minimal new code (~500 LOC). Uses proven patterns already in the codebase (JPA, delegate pattern, Flyway migration). No new infrastructure.
- **Business**: Fastest path to value. Delivers core status visibility in 2-3 weeks.
- **Organizational**: Single team owns the change end-to-end. No cross-team coordination needed.
- **Operational**: No new services to deploy, monitor, or on-call for. Same CI/CD pipeline, same alerting.

#### 5.1.4 Arguments AGAINST This Approach
- **Technical risk**: Status writes add latency to the dispatch path (estimated: 1-3ms per write). Under high load, DB connection pool contention could affect dispatch throughput.
- **Complexity cost**: Couples status tracking to dispatch — harder to evolve independently.
- **Organizational friction**: None.
- **What could go wrong**: If the status table grows large and queries are slow, it could affect the dispatch service's database performance. A slow merchant query could impact webhook delivery if they share the connection pool.

#### 5.1.5 Failure Mode Analysis
| Failure Scenario | Impact | Detection | Recovery | Blast Radius |
|-----------------|--------|-----------|----------|-------------|
| Status write fails (DB error) | Webhook delivered but status not recorded | Error log + missing status alert | Retry write from dispatch log; webhook still delivered | Low — delivery unaffected |
| Status table causes DB slowdown | Dispatch latency increases | P99 latency alerting | Add indexes, partition table, or separate read replica | Medium — affects all webhooks |
| Status API overloaded by merchant queries | Merchant portal slow; potential DB impact | Request rate monitoring | Rate limiting on status API; read replica for queries | Medium — could affect dispatch if shared DB |

#### 5.1.6 Reversibility Assessment
**One-way doors:**
- Database schema (new table) — LOW reversal cost, can drop table if needed

**Two-way doors:**
- API endpoint design — can change in next major version
- Polling vs. push delivery to merchants — can add push later
- Retention policy (30 days) — can adjust via config

#### 5.1.7 Operational Impact
- **On-call burden**: Minimal increase. Same service, same alerts, one new table to monitor.
- **Monitoring requirements**: Add: status table size, status write latency, status API response times.
- **Deployment complexity**: Standard — single service deploy with Flyway migration.
- **Team cognitive load**: Low — extends familiar codebase with familiar patterns.

#### 5.1.8 Implementation Sketch
| Phase | Description | Effort | Dependencies |
|-------|------------|--------|-------------|
| 1 | DB migration + entity + repository | S | None |
| 2 | Modify dispatcher to write status | M | Phase 1 |
| 3 | Status query API (OpenAPI spec + delegate) | M | Phase 1 |
| 4 | Tests (unit + integration) | M | Phases 2, 3 |
| 5 | Merchant portal integration | M | Phase 3 + portal team |

**Total estimated effort**: 2-3 weeks (2 engineers)

---

### 5.2 Solution: Event-Sourced Delivery Status Service

#### 5.2.1 Overview
Create a new microservice dedicated to delivery status tracking. The webhook-service publishes delivery events to Kafka; the new service consumes them, builds a queryable status view, and exposes a status API.

```mermaid
graph LR
    subgraph webhook-service
        A[Webhook Dispatcher] -->|publish event| B[Kafka]
    end
    subgraph delivery-status-service [new]
        C[Event Consumer] -->|consume| B
        C -->|write| D[(Status DB)]
        E[Status API] -->|read| D
    end
    F[Merchant Portal] -->|GET /deliveries/{id}| E
    G[API Gateway] --> E
```

#### 5.2.2 How It Works
**Data Flow:**
1. Webhook dispatcher publishes a `WebhookDeliveryEvent` to Kafka after each attempt
2. Delivery-status-service consumes events and builds a materialized view of delivery status
3. Merchants query the status service directly via API gateway

**Control Flow:**
- Event publishing is async (fire-and-forget from dispatcher's perspective)
- Consumer builds read-optimized projections
- Status service has its own database (could be optimized for reads — e.g., Cosmos DB or Redis)

**Key Components:**
| Component | Responsibility |
|-----------|---------------|
| `DeliveryEventPublisher` (webhook-service) | Publishes events to Kafka topic |
| `DeliveryEventConsumer` (new service) | Consumes and processes delivery events |
| `StatusProjection` (new service) | Builds queryable status from event stream |
| `StatusQueryApi` (new service) | REST API for status queries |

**Integration Points:**
- webhook-service -> Kafka topic -> delivery-status-service
- Merchant Portal -> API Gateway -> delivery-status-service

#### 5.2.3 Arguments FOR This Approach
- **Technical**: Clean separation of concerns. Status tracking doesn't affect dispatch path. Event log provides complete audit trail. Read model can be optimized independently.
- **Business**: Exceeds requirements — enables future analytics, alerting, and trend analysis on delivery data.
- **Organizational**: Separate service could be owned by a different team in future.
- **Operational**: Independent scaling. Status service outage does not affect webhook delivery.

#### 5.2.4 Arguments AGAINST This Approach
- **Technical risk**: Kafka introduces eventual consistency — status may lag by seconds. Event schema design is a one-way door. Consumer failure causes status gap.
- **Complexity cost**: New service (CI/CD, monitoring, alerting, on-call), new Kafka topic, new database. Dramatically increases system complexity for a feature that could be a table and an API.
- **Organizational friction**: May need platform team to provision Kafka infrastructure. New service needs security review.
- **What could go wrong**: Consumer falls behind during traffic spikes — status shows stale data. Kafka configuration issues cause data loss. Team spends 3x estimated time learning event sourcing patterns.

#### 5.2.5 Failure Mode Analysis
| Failure Scenario | Impact | Detection | Recovery | Blast Radius |
|-----------------|--------|-----------|----------|-------------|
| Kafka unavailable | Events lost; status not updated | Kafka health check + publisher error rate | DLQ + replay from dispatch logs | Low — dispatch unaffected |
| Consumer lag | Status shows stale data | Consumer lag monitoring | Scale consumers; investigate slow processing | Low — data eventually consistent |
| Status DB outage | Status API returns errors | Health check | Failover or rebuild from event log | Low — dispatch unaffected |
| Event schema mismatch | Consumer crashes or drops events | Deserialization error alerting | Schema registry validation; backward-compatible changes | Medium — all status updates stop |

#### 5.2.6 Reversibility Assessment
**One-way doors:**
- Event schema design — HIGH reversal cost once consumers depend on it
- Service boundary (separate service + DB) — HIGH cost to merge back
- Kafka topic configuration (partitioning, retention) — MEDIUM cost to change

**Two-way doors:**
- Status database technology — can swap later if abstracted
- API design — can version

#### 5.2.7 Operational Impact
- **On-call burden**: Significant increase. New service, new Kafka topic, new DB. Additional failure modes to understand and respond to.
- **Monitoring requirements**: Kafka consumer lag, event processing latency, DLQ depth, status DB health, status API latency.
- **Deployment complexity**: Multi-service deployment. Must deploy Kafka topic config, consumer service, and webhook-service publisher changes in coordinated order.
- **Team cognitive load**: High. Event sourcing, Kafka operations, eventual consistency are new concepts for this team.

#### 5.2.8 Implementation Sketch
| Phase | Description | Effort | Dependencies |
|-------|------------|--------|-------------|
| 1 | Kafka topic provisioning + event schema | M | Platform team |
| 2 | Event publisher in webhook-service | M | Phase 1 |
| 3 | New service scaffold (Spring Boot, CI/CD, DB) | L | None |
| 4 | Event consumer + status projection | L | Phases 1, 3 |
| 5 | Status query API | M | Phase 4 |
| 6 | Tests (unit + integration + E2E) | L | Phases 2, 5 |
| 7 | Merchant portal integration | M | Phase 5 + portal team |

**Total estimated effort**: 8-10 weeks (2 engineers)

---

### 5.3 Solution: Async Status via Queue + Status Table

#### 5.3.1 Overview
A middle-ground approach: the webhook-service publishes delivery outcomes to an existing message queue. A lightweight consumer (could be within the same service or a minimal worker) writes status to a dedicated status table. Status API is on the existing service.

```mermaid
graph LR
    subgraph webhook-service
        A[Webhook Dispatcher] -->|publish| B[Message Queue]
        D[Status API] -->|read| E[(Status Table)]
    end
    C[Status Writer Worker] -->|consume + write| E
    C -->|consume| B
    F[Merchant Portal] -->|GET /webhooks/{id}/status| D
    G[API Gateway] --> D
```

#### 5.3.2 How It Works
**Data Flow:**
1. Webhook dispatcher publishes a lightweight status message to a queue after each attempt
2. A worker process (separate thread pool or minimal sidecar) consumes messages and writes to the status table
3. Status API reads from the same database, same as Solution 1

**Control Flow:**
- Message publishing is async — decouples status persistence from dispatch latency
- Worker provides backpressure via queue depth
- Status API is synchronous, on the existing service

**Key Components:**
| Component | Responsibility |
|-----------|---------------|
| `StatusMessagePublisher` | Publishes delivery outcomes to queue |
| `StatusWriterWorker` | Consumes queue, writes to status table |
| `webhook_delivery_status` table | Same as Solution 1 |
| `DeliveryStatusApiDelegateImpl` | Same as Solution 1 |

**Integration Points:**
- Internal queue (could be an in-process queue like Spring's `@Async` with `BlockingQueue`, or external like RabbitMQ if available)

#### 5.3.3 Arguments FOR This Approach
- **Technical**: Decouples status write from dispatch path (no latency impact). Queue provides natural buffer during load spikes. Can use in-process queue to avoid new infrastructure.
- **Business**: Delivers core value in 4-5 weeks. Near-real-time status (sub-second with in-process queue).
- **Organizational**: Stays within team boundary. If using in-process queue, no external dependencies.
- **Operational**: Moderate complexity increase. One new worker component, but same deploy unit if in-process.

#### 5.3.4 Arguments AGAINST This Approach
- **Technical risk**: Queue adds a failure point between dispatch and status recording. If worker crashes, status updates are delayed or lost (depending on queue durability). In-process queue loses messages on service restart.
- **Complexity cost**: More moving parts than Solution 1 but less than Solution 2. Queue semantics (at-least-once, ordering) need careful handling.
- **Organizational friction**: Minimal.
- **What could go wrong**: Worker thread pool exhaustion during spikes; in-process queue loses data on crash; external queue adds ops burden similar to Solution 2.

#### 5.3.5 Failure Mode Analysis
| Failure Scenario | Impact | Detection | Recovery | Blast Radius |
|-----------------|--------|-----------|----------|-------------|
| Worker crashes (in-process) | Queued statuses lost | Error log + gap detection | Accept data loss or replay from dispatch logs | Low — dispatch unaffected |
| Queue backlog grows | Status updates delayed | Queue depth monitoring | Scale worker threads; investigate slow writes | Low — eventual consistency |
| Status write failure | Individual status not recorded | Write error rate alerting | Dead letter + manual replay | Low |

#### 5.3.6 Reversibility Assessment
**One-way doors:**
- None significant — this is highly reversible

**Two-way doors:**
- Queue technology (in-process vs. external) — can upgrade later
- Worker deployment model (in-process vs. sidecar) — can split later
- Can migrate to full event sourcing (Solution 2) later if needed

#### 5.3.7 Operational Impact
- **On-call burden**: Small increase. Queue depth is a new metric to watch.
- **Monitoring requirements**: Queue depth, worker throughput, status write latency, consumer health.
- **Deployment complexity**: Same as Solution 1 if in-process queue. Slightly more complex if external queue.
- **Team cognitive load**: Moderate. Async processing patterns are familiar but need careful error handling.

#### 5.3.8 Implementation Sketch
| Phase | Description | Effort | Dependencies |
|-------|------------|--------|-------------|
| 1 | DB migration + entity + repository (same as Sol 1) | S | None |
| 2 | In-process queue + status writer worker | M | Phase 1 |
| 3 | Modify dispatcher to publish to queue | S | Phase 2 |
| 4 | Status query API (same as Sol 1) | M | Phase 1 |
| 5 | Tests (unit + integration) | M | Phases 2, 3, 4 |
| 6 | Merchant portal integration | M | Phase 4 + portal team |

**Total estimated effort**: 4-5 weeks (2 engineers)

---

## 6. Comparative Analysis

| Dimension | Sol 1: Extend Existing | Sol 2: Event-Sourced | Sol 3: Async Queue |
|-----------|----------------------|---------------------|-------------------|
| **Complexity** | Lowest — table + API on existing service | Highest — new service, Kafka, new DB | Medium — adds async worker |
| **Scalability** | Limited by existing PostgreSQL | Best — horizontally scalable, independent | Good — queue provides buffer |
| **Timeline** | 2-3 weeks | 8-10 weeks | 4-5 weeks |
| **Risk** | Low — proven patterns, familiar code | High — new technology, team learning curve | Medium — async error handling |
| **Operational Burden** | Minimal — same service | Significant — new service + Kafka | Small — one new component |
| **Reversibility** | High — easy to change or extend | Low — event schema + service are one-way doors | High — can evolve either direction |
| **Team Fit** | Excellent — existing tech stack | Poor — no event sourcing experience | Good — familiar async patterns |
| **Business Alignment** | Core need met; fast delivery | Exceeds need; slow delivery | Core need met; moderate timeline |

## 7. Recommendation Scoring

### Weights Applied
| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| Business Alignment | 15% | Core driver — reducing support tickets |
| Time to Value | 12% | Q2 deadline creates time pressure |
| Technical Soundness | 12% | Must be architecturally sound for 2+ years |
| Scalability Headroom | 8% | Important but not the top priority at current volume |
| Failure Resilience | 10% | Webhooks are business-critical |
| Operational Simplicity | 10% | Small team cannot absorb high ops burden |
| Team Fit | 10% | Small team, no time for extensive learning |
| Organizational Alignment | 5% | Single team, low cross-team risk |
| Reversibility | 8% | Want to keep options open for Q3 retry overhaul |
| Complexity Budget | 5% | Team already has tech debt to address |
| Security & Compliance | 5% | Standard compliance, no new boundaries ideally |

### Scores

| Dimension | Wt | Sol 1 | Justification | Sol 2 | Justification | Sol 3 | Justification |
|-----------|-----|-------|--------------|-------|--------------|-------|--------------|
| Business Alignment | 15% | 8 | Directly solves the core problem | 9 | Exceeds requirements with audit trail | 7 | Covers core need; near-real-time not instant |
| Time to Value | 12% | 9 | 2-3 weeks; fastest path | 5 | 8-10 weeks; misses Q2 target | 7 | 4-5 weeks; tight but feasible for Q2 |
| Technical Soundness | 12% | 7 | Proven but couples status to dispatch | 9 | Clean separation; textbook event sourcing | 8 | Well-understood async pattern |
| Scalability Headroom | 8% | 5 | Existing DB may bottleneck at 10x | 9 | Horizontally scalable by design | 7 | Queue buffers; scales to 5-7x |
| Failure Resilience | 10% | 6 | Shares failure domain with dispatch | 8 | Independent failure domain | 7 | Queue provides buffer |
| Operational Simplicity | 10% | 9 | No new services or infrastructure | 4 | New service + Kafka + new DB | 6 | One new worker component |
| Team Fit | 10% | 9 | Team owns this codebase already | 5 | No event sourcing experience | 7 | Familiar with async patterns |
| Org Alignment | 5% | 9 | Single team, single service | 6 | May need platform team for Kafka | 8 | Stays within team boundary |
| Reversibility | 8% | 8 | Feature flag; easy to extend later | 4 | Event schema + service are one-way doors | 7 | Can evolve to event sourcing if needed |
| Complexity Budget | 5% | 9 | Table + API; minimal addition | 3 | Service + Kafka + DB; significant | 6 | Worker + queue; contained |
| Security & Compliance | 5% | 8 | Same security perimeter | 7 | New service needs security review | 8 | Uses existing infrastructure |

### Composite Scores

| Solution | Raw Score | Confidence Band | Conditional Ranking |
|----------|-----------|----------------|-------------------|
| Sol 1: Extend Existing | **7.82** | +/- 0.4 | Ranked #1 assuming current volume holds and team has 2+ weeks |
| Sol 3: Async Queue | **7.05** | +/- 0.5 | Ranked #2; becomes #1 if dispatch latency sensitivity is confirmed |
| Sol 2: Event-Sourced | **6.33** | +/- 0.8 | Ranked #3; becomes #1 if volume grows 10x and timeline relaxes to Q3 |

### Sensitivity Analysis
- **If assumption A2 is wrong** (PostgreSQL can't handle 10x): Sol 1 drops from 7.82 to ~7.2 (scalability 5->3, resilience 6->4). Sol 3 becomes competitive. Sol 2 rises to #1 if timeline allows.
- **If assumption A3 is wrong** (only 1 engineer for 2 weeks): Sol 1 is the only viable option. Sol 3 and Sol 2 are not feasible.
- **If team learns event sourcing quickly** (A1 sensitivity): Sol 2 team_fit rises from 5 to 7, time_to_value from 5 to 7. Sol 2 composite rises to ~7.1, still behind Sol 1.

## 8. Final Recommendation

### Recommended Solution
**Solution 1: Extend Existing Webhook Service** — It delivers the core business value (webhook delivery visibility) in 2-3 weeks with minimal risk, zero new infrastructure, and no team ramp-up. It's the simplest solution that fully meets the stated requirements.

### Conditions for This Recommendation
This recommendation holds as long as:
- Webhook volume stays under ~200K/day (4x current) for the next 12 months
- The team has 2 backend engineers available for 2-3 weeks
- Status query latency of <500ms is acceptable (polling, not real-time push)
- The Q3 retry policy overhaul does not fundamentally change the delivery outcome model

### Contingency
If **webhook volume is expected to grow beyond 5x within 12 months**, reconsider **Solution 3 (Async Queue)** as the immediate approach, with a clear migration path to Solution 2 (Event-Sourced) when the operational maturity and team skillset justify it.

If **the timeline relaxes to Q3 or later**, Solution 2 becomes more attractive because the team has time to learn event sourcing and the architecture is better positioned for the retry policy overhaul.

### Next Steps (Priority Order)
1. **Approve this analysis** — review with tech lead and product owner
2. **Create Flyway migration** for `webhook_delivery_status` table — 1 engineer, 1 day
3. **Update OpenAPI spec** with status query endpoints — 1 engineer, 1 day
4. **Implement status write in dispatcher** — 1 engineer, 2-3 days
5. **Implement status query API** — 1 engineer, 2-3 days (parallel with step 4)
6. **Coordinate with merchant portal team** for frontend integration — schedule for week 3
7. **Set up monitoring** — status table size, write latency, API response times

### Decisions to Make Now vs. Defer
**Decide now:**
- Database table schema (one-way door once data is written)
- API contract for status queries (exposed to merchants; versioning needed)

**Safe to defer:**
- Push notifications for delivery failures (out of scope; future epic)
- Read replica for status queries (only needed at higher volume)
- Migration to async/event-sourced model (can do if volume demands it)

## 9. Appendix

### Glossary
| Term | Definition |
|------|-----------|
| Webhook | HTTP callback sent to a merchant-configured URL when an event occurs |
| Delivery status | Outcome of a webhook delivery attempt: delivered, failed, retrying, exhausted |
| DLQ | Dead Letter Queue — holds messages that failed processing for manual review |
| Event sourcing | Pattern where state changes are stored as a sequence of events |
| Blast radius | The scope of impact when a failure occurs |

### References
- [Confluence: Webhook Service Architecture](https://confluence.mastercard.int/display/WEBHOOKS/Architecture+Overview)
- [Confluence: Webhook Analytics Proposal (Q2 2025)](https://confluence.mastercard.int/display/WEBHOOKS/Analytics+Proposal)
- [Confluence: Merchant Portal Architecture](https://confluence.mastercard.int/display/PORTAL/Architecture)
- [Aha: PROJ-E-456 Webhook Delivery Visibility](https://mastercard.aha.io/epics/PROJ-E-456)
- [Aha: PROJ-E-460 Webhook Retry Policy Overhaul](https://mastercard.aha.io/epics/PROJ-E-460)
- Codebase: webhook-service (`/Users/e124866/Projects/webhook-service`)

### Sub-Agent Research Summaries
**confluence-research-agent**: Found the Webhook Service Architecture page and the shelved Analytics Proposal from Q2 2025. Key finding: the analytics proposal was considered over-engineered at the time. Also found merchant portal architecture confirming React SPA with standard API gateway integration.

**lead_developer (webhook-service)**: Java 17 / Spring Boot 3.2 / PostgreSQL. Spec-first OpenAPI with delegate pattern. 15M rows in webhook_event table. No delivery outcome tracking in the database. Tech debt: RestTemplate migration, JaCoCo coverage at 45%.
