# NirmanVaani (निर्माणवाणी)
### A Multilingual Citizen Feedback & Infrastructure Priority Platform

**Built for**: Google Cloud Hackathon — *Build with AI: Code for Communities*  
**Track**: Digital Public Infrastructure (DPI)  
**Builder**: Abhinav Kumar (solo)  
**Timeline**: 6 Sep – 30 Sep 2026  

---

## 🔑 Demo Access (For Evaluators & Judges)

To evaluate the **Policymaker Command Center** and test administrative features (e.g. 1-Click DPI Budget Allocation):
Live Deployed URL: https://nirmanvaani.onrender.com (Note: if inactive, allow 30-60 seconds for the first request to load)

Local Web URL: http://127.0.0.1:8000 (for running the project yourself)
* **Policymaker Passcode**: Configured via `POLICYMAKER_SECRET_KEY` in `.env` (refer to Hack2Skill submission notes; defaults to `demo-passcode` if unset).
* *(See [Section 7: Known Limitations](#7-known-limitations-demo-vs-production) for evaluation rationale).*

---

## 1. The Problem
Governments across India struggle to consolidate citizen feedback and align it with national infrastructure priorities. Development requests live in fragmented systems — scattered across helplines, local offices, social media, and paper complaints — leading to misaligned public spending, unaddressed infrastructure gaps, and no reliable way to measure the impact of large-scale digital public infrastructure initiatives.

The hackathon brief calls for a scalable, multilingual AI platform built as a **Digital Public Good**, that aggregates citizen development requests via voice, text, and messaging apps across India's diverse linguistic regions — then analyses that feedback alongside demographic data, infrastructure indices, and public investment plans to surface demand hotspots and recommend high-priority projects to policymakers.

---

## 2. The Idea — NirmanVaani ("निर्माणवाणी")
"Nirman" (निर्माण) refers to infrastructure development, and "Vaani" (वाणी) means voice. NirmanVaani bridges the gap between what ordinary citizens are actually asking for in their own language and what policymakers see on an evidence-backed, explainable priority dashboard.

### Core Loop
1. **Citizens report a need**: (a broken road, no water supply, poor school infrastructure, patchy digital connectivity) by typing or speaking in Hindi, Bengali, Tamil, Marathi, Bhojpuri, or English.
2. **Gemini structures the raw input**: Detects language, translates to a common working language, classifies into a sector (`roads`, `water`, `power`, `health`, `education`, `sanitation`, `digital_access`), extracts geo-location entities, and scores urgency (1–5).
3. **Priority Scoring Engine**: Aggregates structured reports at the district/state level and cross-references them against real demographic and existing-infrastructure data from `data.gov.in` (Census, PMGSY, Jal Jeevan Mission, NHM) to compute a defensible priority score — not just "who complained the most", but "where is the gap between need and existing infrastructure the largest."
4. **Policymakers get a dashboard**: An interactive demand hotspot map, a ranked list of recommended projects with explainable mathematical score breakdowns, interactive policy weight sliders, and one-click budget allocation approval.
5. **Public Transparency Layer**: Citizens can track reported issues by Ticket ID (`NV-2026-XXXX`) and endorse neighboring complaints ("Me Too") to build public trust without spamming duplicate reports.

---

## 3. Priority Scoring Formula (Explainable AI)

Unlike black-box AI ranking models, NirmanVaani exposes an explainable, controllable algorithm:

$$\text{Priority Score} = w_1 \times (\text{Normalized Demand}) + w_2 \times (\text{Normalized Infra Gap}) + w_3 \times (\text{Normalized Population Reach})$$

Where:
* **Demand Signal ($w_1$, default 35%)**: $\sum (\text{Urgency} \times 1.5 + \text{Community Endorsements} \times 0.5)$, normalized 0–100.
* **Infrastructure Gap ($w_2$, default 40%)**: Official deficit metric from `data.gov.in` (e.g. PMGSY unconnected road %, Jal Jeevan tap deficit %, PHC doctor shortage %), normalized 0–100.
* **Population Reach ($w_3$, default 25%)**: Census demographic reach normalized 0–100 so that high-population rural districts are not drowned out by noisy low-impact areas.

Policymakers can dynamically adjust $w_1, w_2, w_3$ via sliders on the dashboard to observe real-time recalculations.

---

## 4. Architecture & Google Cloud Integration

```
[ Citizen Voice / Text (Hindi, Bengali, Tamil, etc.) ]
                        │
                        ▼
         [ Web Speech API / Voice Input ]
                        │
                        ▼
      [ Gemini AI Structuring Pipeline ]
       ├── Language Detection & Translation
       ├── Sector Classification (7 sectors)
       ├── Urgency Scoring (1-5)
       └── Geo-Entity & Landmark Extraction
                        │
                        ▼
    [ Grounding with data.gov.in Baselines ]
       ├── Census Demographic Reach
       ├── PMGSY Rural Road Deficit Indices
       └── Jal Jeevan & Health Indices
                        │
                        ▼
    [ Explainable Priority Scoring Engine ]
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
[ Public Transparency Portal ]   [ Policymaker Command Center ]
 - Ticket Search (NV-2026-X)      - Interactive GIS Hotspot Map
 - 4-stage lifecycle tracker      - Dynamic Weight Sliders
 - "Me Too" community upvote      - Ranked Recommendations
                                  - 1-Click DPI Budget Approval
```

> [!NOTE]
> **Firestore Security Rules & Cloud Migration Note**:
> The repository includes a production-hardened [`firestore.rules`](firestore.rules) file. This serves as preparation for a future cloud migration to managed Google Cloud Firestore. Because the current prototype runs locally on FastAPI with filesystem persistence (`data/reports.json`), the `firestore.rules` file is not active in the local runtime today and is ready for cloud deployment.

---

## 5. Judging Criteria Mapping

| Criterion | Weight | How NirmanVaani Addresses It |
|---|---|---|
| **Problem-Solution Fit** | 20% | Directly builds the exact flow described in the DPI hackathon brief: multilingual voice/text intake $\rightarrow$ AI structuring $\rightarrow$ cross-referencing with official data $\rightarrow$ prioritized policy actions. |
| **AI/Technical Execution** | 25% | Gemini performs load-bearing work (translation, classification, urgency scoring, entity extraction) with resilient structured JSON schemas and offline fallback. |
| **Depth & Reach Across India** | 20% | Architecture is state- and language-agnostic by design. Pre-grounded in real public data across Bihar, Uttar Pradesh, West Bengal, Maharashtra, and Tamil Nadu. |
| **Impact Potential** | 15% | Mathematical scoring explicitly weights population reach and official infrastructure deficits, highlighting high-impact rural fixes rather than only the loudest voices. |
| **Deployability & Scalability** | 20% | Designed for Google Cloud (Firestore, BigQuery, Cloud Functions, Firebase Hosting, Gemini API). Ready for ministry pilot. |

---

## 6. Quickstart: Running NirmanVaani Locally

### Prerequisites
* Python 3.10+
* Modern Web Browser (Chrome / Edge recommended for Web Speech API)

### 1. Launch the Server
```powershell
python server.py
```
Or with uvicorn:
```powershell
python -m uvicorn server:app --host 127.0.0.1 --port 8000
```

### 2. Open in Browser
Navigate to:
```
http://127.0.0.1:8000
```

### 3. Quick Demo Walkthrough for Evaluators
1. **Test Multilingual Intake**: Click any of the **1-Click Regional Presets** (e.g. *Roads - Bihar (Hindi)* or *Water - West Bengal (Bengali)*).
2. **Observe Gemini AI**: Watch the **Gemini AI Structuring Pipeline** preview instantly extract language, English translation, urgency rating, and district entities.
3. **Submit Complaint**: Click **Analyze & Submit to Platform**. A unique ticket ID (`NV-2026-XXXX`) is issued.
4. **Endorse a Complaint**: In the **Public Transparency Layer**, click **"👍 Me Too"** on any existing issue to observe community demand amplification.
5. **Switch to Policymaker Command Center**:
   - When prompted by the access modal, enter your configured policymaker passcode (or default `demo-passcode` / evaluator note).
   - Inspect the **National Demand Hotspot GIS Map** with sector-colored pins.
   - Adjust the **Infrastructure Deficit (w2)** slider from 40% to 70% to watch high-deficit rural projects dynamically jump to rank #1.
   - Click **Evidence Dossier** on any project to view citizen quotes and official data comparison.
   - Click **Approve for DPI Budget Allocation** to schedule ministry funds.
6. **Open Pitch Deck**: Click the **Pitch Deck** button in the navigation header to view the complete 10-slide presentation.

---

## 7. Known Limitations (Demo vs. Production)

1. **Shared Policymaker Passcode vs. Individual Officer Accounts**:
   - **Zero-Friction Judging Rationale**: For hackathon evaluation and zero-friction judging (allowing evaluators to test administrative and budget allocation flows immediately without having to set up OAuth, SSO, or individual Firebase user accounts), policymaker access operates via a shared passcode (`POLICYMAKER_SECRET_KEY`, defaulting to `demo-passcode` for local evaluation or configured via `.env`).
   - **Shared Identity Caveat**: Consequently, administrative approvals record a shared service identity (`uid: "service-account-policymaker"`, `email: "ministry-admin@dpi.gov.in"`) in the audit trail (`approved_by`) rather than identifying a specific real person.
   - **Production Authentication Roadmap**: In production, this shared key is retired. Policymakers will authenticate with individual accounts via India's **Parichay / MeriPehchaan (National SSO)** or individual Firebase Authentication. Individual government officer identities, verified `.gov.in` email credentials, and cryptographic tokens with verified custom claims (`role == 'policymaker'`) will be strictly required, ensuring end-to-end individual accountability for all budgetary decisions.

2. **Firestore Security Rules vs. Local Runtime**:
   - The repository includes a production-grade, default-deny [`firestore.rules`](firestore.rules) file.
   - This ruleset is ready for cloud deployment to Google Cloud Firestore. In the current local prototype, data is persisted locally to `data/reports.json` via FastAPI; therefore, `firestore.rules` is not actively enforced in the local prototype environment.

3. **Citizen Device Fingerprinting**:
   - Citizen "Me Too" endorsements are deduplicated per device using a client-side generated UUID (`nirmanvaani_device_id`) stored in browser storage and verified server-side. While effective against accidental double-clicks and basic manipulation, full production deployments will tie endorsements to mobile OTP or DigiLocker/Aadhaar verification.

---

## 8. Cloud Deployment: 1-Click Render.com Web Service

NirmanVaani is architected as a **unified web service**: FastAPI (`server.py`) directly serves both the REST endpoints and the responsive civic frontend (`/static`). This allows frictionless deployment to **Render.com** without requiring a credit card or separate frontend/backend hosting.

### Architecture Highlights
- **Single-Origin Simplicity**: Browser requests to `/api/*` run on the same origin as the frontend, completely eliminating cross-origin CORS complexity in production.
- **Docker-Powered**: Render automatically detects the root [`Dockerfile`](Dockerfile) and builds a lightweight Python 3.11 container.
- **Dynamic Port Binding**: The container dynamically binds to Render's injected `$PORT` environment variable.

### Deployment Steps on Render
1. **Push to GitHub**: Commit the repository and push to your GitHub account.
2. **Create Web Service**:
   - In the [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Web Service**.
   - Select your connected GitHub repository (`nirmanvaani`).
   - Choose the **Docker** runtime environment (Render auto-detects `Dockerfile`).
   - Select the **Free** instance type.
3. **Configure Environment Variables**:
   Under the **Environment** tab, set:
   * `GEMINI_API_KEY`: Your real Google AI Studio key (`AIzaSy...`).
   * `POLICYMAKER_SECRET_KEY`: A secure passcode for evaluator admin access (e.g. your private evaluation key).
   * `ALLOWED_ORIGINS`: `https://nirmanvaani.onrender.com` (or your assigned custom Render URL).
4. **Deploy**: Click **Create Web Service**.

> [!NOTE]
> **Render Free-Tier Spin-Down & Cold Start Behavior**:
> Render's free web services automatically spin down (sleep) after **15 minutes of inactivity** to conserve resources. When a new request arrives, the instance spins up with a cold start of approximately **30–60 seconds**.
> **Demo Tip for Evaluators/Judges**: Visit the deployed URL 1–2 minutes before live presentation or evaluation to wake the container so that all requests respond with instant sub-second performance.

