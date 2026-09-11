# Public website analysis — Phase 2

**Date:** 7 September 2026  
**Reference:** https://svyuvasuraksha.org/  
**Assets in this workspace:** logo (Phase 1) plus images/PDFs/Excel downloaded from the live public bundle into `frontend/public/assets/`. No reconstructed source project was present.

This file is an implementation map. It is not a government order.

---

## 1. Existing navigation (live public site)

Top utility (GIGW-style): Skip to Main Content, text size (A+ / A / A−), accessibility.

Main header:

| Item | Type | Live route |
|------|------|------------|
| Home | Link | `/` |
| About Us | Dropdown | |
| → Parent Department | | `/about-scheme` |
| → Implementing Body | | `/implementing-body` |
| → Nodal Agency | | `/nodalAgency` |
| Insurance Scheme | Dropdown | |
| → Personal Accident | | `/personal-accidents` |
| → Mediclaim | | `/mediclaim-coverage` |
| Downloads | Dropdown | |
| → G.R'S | | `/gr` |
| → National Insurance Company | | `/national-document` |
| → ICICI Lombard GIC | | `/icici-document` |
| Press | Link | `/press` |
| Contact | Link | `/contact` |
| Login | Link | live site sends users to `https://app.svyuvasuraksha.org/login` |

**Sign Up** is not in the public header on the live site (it is on the college app). Phase 2 still adds **Login → `/login`** and **Sign Up → `/signup`** as requested (placeholders only).

Footer “Information” / policies hub: `/website-policies` and child policy routes.

---

## 2. Existing public pages

Implemented in Phase 2 (live names preserved, plus requested aliases):

| New / requested | Live equivalent | Notes |
|-----------------|-----------------|--------|
| `/` | `/` | Home: slider, quotes, about, scheme cards |
| `/about`, `/about-scheme` | `/about-scheme` | Parent Department |
| `/scheme` | (no single live slug) | Overview pointing to official sections |
| `/implementing-body` | same | DHE text + director photo |
| `/nodal-agency`, `/nodalAgency` | `/nodalAgency` | IRIBL text + CEO photo |
| `/insurance` | (hub) | Cards to PA + Mediclaim |
| `/personal-accidents` | same | Benefits published on live page |
| `/mediclaim-coverage` | same | Benefits published on live page |
| `/documents` | mixed downloads | Library of official files |
| `/downloads`, `/gr` | `/gr` + download menus | GRs + Excel + PDFs |
| `/useful-links` | footer links | Government URLs from live footer |
| `/contact` | `/contact` | Published emails/phones |
| `/faq` | **not a live route** | Only Q&A supported by published copy |
| `/press` | `/press` | One ThePrint/ANI item linked from live site |
| `/privacy-policy` | same | Live paragraph |
| `/terms`, `/terms-and-conditions` | live page **empty** | Placeholder + TODO |
| `/website-policy`, `/website-policies` | `/website-policies` | Index of GIGW policies |
| Policy children | as live | Copyright, hyperlink, archival, etc. |
| `/disclaimer` | live page **empty** | TODO |
| `/login`, `/signup` | portal | Phase 3 stubs |

---

## 3. Existing images (now in `frontend/public/assets/images/`)

| File | Source on live site | Use |
|------|---------------------|-----|
| `slider-01.jpg` … `slider-03.jpg` | CSS `Slider`, `Slider-02`, `Slider-03` | Home hero |
| `watermark.jpg` | `WaterMarkImage` | Decorative / about |
| `parent-department.png` | `YojanaParentDept` | Parent department |
| `dte-logo.png` | `DTELogo` | Technical education mark where relevant |
| `integrated-risk.jpg` | `IntegratedlogoJpg` | Nodal agency |
| `company.jpg` | `Comapny.jpg` (live filename typo) | Insurance / home |
| `plans.jpg`, `policy-type.jpg`, `personal-accident.jpg` | live media | Scheme cards |
| `shailendra-deolankar.jpg` | `Shailendra` | Implementing body |
| `chintan-adva.jpg` | `Chintan` | Nodal agency |
| `/logo.svg` | `LOGO-01.svg` | Header / footer |

No other recovered image set exists in the workspace. No stock photography is used.

---

## 4. Existing documents (now in `frontend/public/assets/documents/`)

| File | Live bundle name |
|------|------------------|
| `PA-SVYSY.pdf` | Personal accident document |
| `Mediclaim-SVYSY.pdf` | Mediclaim document |
| `Vidyarthi-Vima-GR.pdf` | Vidyarthi Vima GR |
| `Vidyarthi-Vima-GR-2023-10-16.pdf` | GR dated 16 Oct 2023 |
| `Format-Insurance.xlsx` | `Format Insurance.xlsx` |
| `National-Claim-Doc.pdf` | National Insurance claim document |
| `ICICI-GPA-Claim-Form.pdf` | ICICI GPA claim form |
| `ICICI-Claim-Requirements-Student.pdf` | ICICI student claim requirements |
| `ICICI-Claim-Requirements-Parents.pdf` | ICICI parents claim requirements |

PDFs/Excel are linked on click (view/download). They are not fetched until the user opens them.

---

## 5. Existing links (from live footer / portal)

- https://dhepune.gov.in/ — Directorate of Higher Education  
- https://dte.maharashtra.gov.in/ — Directorate of Technical Education  
- https://htedu.maharashtra.gov.in/Main/DirectorateofArts — Directorate of Arts  
- https://msbte.org.in/ — Maharashtra State Board of Technical Education  
- https://www.maharashtra.gov.in/ — Government of Maharashtra (present in live bundle)  
- Press item: https://theprint.in/ani-press-releases/maharashtras-new-student-insurance-program-aims-to-secure-futures/1810822/

No additional government URLs are invented.

---

## 6. Published contact (live site)

- Display email: `info@svyuvasuraksha.org` (live footer `mailto:info@buypolicynow.com`)  
- Phone: `+91 96490 02216`  
- ICICI Lombard (live `/icici-document`): Amrish Duddalwar, 8605007196, Nagpur address  
- National Insurance (live `/national-document`): Rahul Balasaheb Patil, 8411886135, Pune Divisional Office-III  

---

## 7. Missing content

| Item | Handling |
|------|----------|
| Terms and Conditions body | Live page is an empty container → `TODO: VERIFY OFFICIAL CONTENT` |
| Disclaimer body | Live page empty → TODO |
| Personal accident **sum insured table** | Live text refers to “table above” but amounts are in the PDF → page describes benefits in words and links the PDF; no invented table |
| Content review / archival **tables** | Structure exists on live site; row data not fully recovered → TODO under the recovered paragraphs |
| Dedicated FAQ page | Does not exist live → FAQ only from published copy |
| Visit counter `11332` | Not copied (it is a live counter, not static official data) |
| Google Translate widget | Not rebuilt in Phase 2 (third-party script) |
| Official office postal address for DHE Pune | Not clearly published on the public contact block → not invented |

---

## 8. Pages to implement

Header, footer, home, all live public/policy routes, requested aliases (`/about`, `/scheme`, `/insurance`, `/documents`, `/downloads`, `/useful-links`, `/faq`, `/terms`, `/website-policy`), login/signup **placeholders**, document cards with working PDF/Excel links.
