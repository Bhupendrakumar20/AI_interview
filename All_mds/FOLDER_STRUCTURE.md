# 📁 Project Structure Guide

Complete overview of the PrepWise project file organization and architecture.

---

## 📂 Root Directory Structure

```
PrepWise/
├── 📖 README.md                    ← START HERE! Main project documentation
├── 📖 .env.example                 ← Template for environment variables (copy to .env.local)
├── 📖 .gitignore                   ← Git configuration
├── 📁 docs/                        ← All project documentation
├── 📁 app/                         ← Next.js App Router (main application)
├── 📁 components/                  ← React components (32 components)
├── 📁 lib/                         ← Utilities, helpers, and actions
├── 📁 public/                      ← Static assets
├── 📁 middleware/                  ← Next.js middleware
├── 📁 types/                       ← TypeScript type definitions
├── 📁 scripts/                     ← NPM scripts and utilities
├── 📁 firebase/                    ← Firebase configuration
├── 🔧 package.json                 ← Project dependencies
├── 🔧 next.config.mjs              ← Next.js configuration
├── 🔧 tailwind.config.ts           ← TailwindCSS configuration
├── 🔧 tsconfig.json                ← TypeScript configuration
├── 🔧 jsconfig.json                ← JavaScript configuration
├── 🔧 eslint.config.mjs            ← ESLint configuration
├── 🔧 postcss.config.mjs           ← PostCSS configuration
└── 🔧 components.json              ← shadcn/ui component registry
```

---

## 📚 Documentation Folder (`docs/`)

```
docs/
├── README.md                           ← Documentation Index & Navigation
├── ADMIN_SETUP_GUIDE.md               ← Admin user setup and configuration
├── CLEANUP_SUMMARY.md                 ← Project consolidation and cleanup
├── CLEANUP_REPORT.md                  ← Historical cleanup records
├── JOBS_API_INTEGRATION.md            ← Jobs API setup guide
├── FIREBASE_SERIALIZATION_FIX.md      ← Firebase data handling
├── CSS_FIX_REPORT.md                  ← CSS fixes and updates
└── JAVASCRIPT_CONVERSION.md           ← Component migration notes
```

---

## 🚀 Application Folder (`app/`)

```
app/
├── layout.jsx                         ← Root layout with providers
├── globals.css                        ← Global styles
├── (auth)/                            ← Authentication routes (layout group)
│   ├── layout.jsx                    ← Auth layout wrapper
│   ├── sign-in/
│   │   └── page.jsx                 ← Login page
│   └── sign-up/
│       └── page.jsx                 ← Registration page
│
├── (root)/                            ← Main app routes (layout group)
│   ├── layout.jsx                    ← Main app layout
│   ├── page.jsx                      ← Dashboard/home page
│   ├── analytics/
│   │   └── page.jsx                 ← Analytics dashboard
│   ├── competitions/
│   │   └── page.jsx                 ← Competitions listing
│   ├── internships/
│   │   └── page.jsx                 ← Internships listing
│   ├── jobs/
│   │   └── page.jsx                 ← Jobs listing
│   ├── interview/                   ← Mock interviews module
│   │   ├── page.jsx                ← Interviews listing
│   │   └── [id]/
│   │       └── page.jsx            ← Interview detail/execution
│   ├── mock-test/                  ← Mock tests module
│   │   ├── companies.jsx           ← Company listing with pagination
│   │   └── practice.jsx            ← Practice question page
│   ├── mentorship/
│   │   └── page.jsx                ← Mentorship directory
│   ├── profile/
│   │   └── page.jsx                ← User profile
│   ├── question-bank/
│   │   └── page.jsx                ← Question bank
│   ├── salary-negotiation/
│   │   └── page.jsx                ← Salary negotiation help
│   ├── saved-internships/
│   │   └── page.jsx                ← Saved internships
│   ├── settings/
│   │   └── page.jsx                ← User settings
│   └── upgrade/
│       └── page.jsx                ← Premium upgrade page
│
├── admin/                            ← Admin panel routes
│   ├── layout.jsx                   ← Admin layout
│   ├── page.jsx                     ← Admin dashboard
│   ├── login/
│   │   └── page.jsx                ← Admin login
│   └── users/
│       └── page.jsx                ← User management
│
└── api/                             ← API routes
    ├── auth/                        ← Authentication endpoints
    │   ├── login/route.js
    │   ├── logout/route.js
    │   └── register/route.js
    └── vapi/                       ← Vapi AI endpoints
        └── webhook/route.js        ← Interview webhooks
```

---

## 🧩 Components Folder (`components/`)

```
components/
├── 📱 Page Components (Main features)
│   ├── ActivityTimeline.jsx             ← User activity timeline
│   ├── Agent.jsx                        ← AI agent component
│   ├── ChallengeSection.jsx             ← 100 Days Challenge section
│   ├── InterviewRunner.jsx              ← Interview execution component
│   ├── SalaryNegotiationChat.jsx        ← Salary negotiation interface
│   ├── QuestionBank.jsx                 ← Question bank display
│   └── StatsOverview.jsx                ← Statistics dashboard
│
├── 🎴 Card Components (Content display)
│   ├── ApplicationCard.jsx              ← Job application card
│   ├── CompanyListingCard.jsx           ← Company directory card
│   ├── CompetitionCard.jsx              ← Competition card
│   ├── FeaturedCard.jsx                 ← Featured opportunities
│   ├── InternshipCard.jsx               ← Internship opportunity
│   ├── InterviewCard.jsx                ← Past interview card
│   ├── JobCard.jsx                      ← Job listing card
│   ├── MentorCard.jsx                   ← Mentor profile card
│   └── QuestionCard.jsx                 ← Question card
│
├── 📋 Form Components
│   ├── AuthForm.jsx                     ← Login/Signup form
│   ├── FormField.jsx                    ← Reusable form field
│   ├── InterviewSetup.jsx               ← Interview setup form
│   ├── SettingsForm.jsx                 ← Settings form
│   └── UpdateProfileForm.jsx            ← Profile update form
│
├── 🎛️ Layout & Navigation
│   ├── DashboardNav.jsx                 ← Dashboard navigation
│   ├── Sidebar.jsx                      ← Main sidebar navigation
│   ├── TopBar.jsx                       ← Top navigation bar
│   └── QuickAccess.jsx                  ← Quick access menu
│
├── 📊 Utility Components
│   ├── DisplayTechIcons.jsx             ← Technology icons display
│   ├── FilterBar.jsx                    ← Filter component
│   ├── ApplicationModal.jsx             ← Modal for applications
│   ├── SafeDataWrapper.jsx              ← Data wrapper component
│   └── ToastProvider.jsx                ← Toast notifications
│
├── 🎨 UI Components (shadcn/ui)
│   └── ui/
│       ├── button.jsx                   ← Button component
│       ├── card.jsx                     ← Card wrapper
│       ├── dialog.jsx                   ← Modal/dialog
│       ├── dropdown-menu.jsx            ← Dropdown menu
│       ├── form.jsx                     ← React Hook Form wrapper
│       ├── input.jsx                    ← Input field
│       ├── label.jsx                    ← Form label
│       ├── sonner.jsx                   ← Toast provider
│       ├── table.jsx                    ← Table component
│       └── textarea.jsx                 ← Textarea field
│
└── 🔐 Admin Components
    └── admin/
        ├── AdminHeader.jsx              ← Admin header
        └── AdminSidebar.jsx             ← Admin sidebar
```

---

## 🛠️ Library Folder (`lib/`)

```
lib/
├── 📋 Action Files (`lib/actions/`)
│   ├── auth.action.js                  ← Authentication functions
│   ├── admin.action.js                 ← Admin operations
│   ├── dashboard.action.js             ← Dashboard data fetching
│   ├── general.action.js               ← General utilities
│   ├── jobs.action.js                  ← Jobs API integration
│   ├── jsearch.action.js               ← JSearch API integration
│   ├── mock-test.action.js             ← Mock test questions
│   ├── profile.action.js               ← User profile operations
│   └── saved-internships.action.js     ← Saved internships
│
├── 🧩 Service Modules (`lib/modules/`)
│   ├── auth/
│   │   ├── auth.service.ts            ← User authentication
│   │   └── index.ts
│   ├── interview/
│   │   ├── interview-setup.service.ts ← Interview configuration
│   │   └── index.ts
│   ├── interview-execution/
│   │   ├── execution.service.ts       ← Real-time execution
│   │   └── index.ts
│   ├── ai-analysis/
│   │   ├── analysis.service.ts        ← AI analysis module
│   │   └── index.ts
│   ├── scoring/
│   │   ├── scoring.service.ts         ← Scoring algorithm
│   │   └── index.ts
│   ├── feedback/
│   │   ├── feedback.service.ts        ← Feedback generation
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── dashboard.service.ts       ← Dashboard logic
│   │   └── index.ts
│   ├── interview-orchestrator.service.ts ← Master controller
│   └── README.md                       ← Architecture guide
│
├── 📦 Utility Files
│   ├── companies-data.js               ← Company & positions data
│   ├── firebase-helpers.js             ← Firebase utilities
│   ├── mock-test-constants.js          ← Mock test configuration
│   ├── pagination.js                   ← Pagination utilities
│   ├── utils.js                        ← General utilities
│   └── vapi.sdk.js                     ← Vapi initialization
```

---

## 🔐 Firebase Configuration (`firebase/`)

```
firebase/
├── admin.js                            ← Firebase Admin SDK setup
└── client.js                           ← Firebase Client SDK setup
```

---

## 🔄 Middleware (`middleware/`)

```
middleware/
├── admin.js                            ← Admin route protection
└── auth.js                             ← Authentication middleware
```

---

## 📝 Types (`types/`)

```
types/
├── index.d.ts                          ← Global TypeScript definitions
└── vapi.d.ts                           ← Vapi type definitions
```

---

## 🔧 Scripts (`scripts/`)

```
scripts/
├── createAdmin.js                      ← Create admin user
├── seedDatabase.js                     ← Database seeding
└── quickSeed.js                        ← Quick seeding utility
```

---

## 📦 Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies & scripts |
| `next.config.mjs` | Next.js configuration |
| `tailwind.config.ts` | TailwindCSS theming |
| `tsconfig.json` | TypeScript compiler options |
| `jsconfig.json` | JavaScript path aliases |
| `eslint.config.mjs` | Code linting rules |
| `postcss.config.mjs` | CSS processing |
| `components.json` | shadcn/ui settings |
| `.gitignore` | Git ignore rules |
| `.env.example` | Environment variables template |

---

## 🌍 Static Assets (`public/`)

```
public/
├── covers/                             ← Interview cover images
└── [other static files]
```

---

## 📊 Project Statistics

| Category | Count | Details |
|----------|-------|---------|
| **Pages** | 15+ | Across auth, root, and admin routes |
| **Components** | 32 | UI, cards, forms, and layouts |
| **Actions** | 9 | Organized by feature domain |
| **Modules** | 8 | Interview flow orchestration |
| **Documentation** | 7 | In docs/ folder + .env.example |
| **Config Files** | 8 | Next.js, TypeScript, Tailwind, etc. |

---

## 🔗 Important File Locations

### Configuration
- **Environment Variables**: `.env.example` (copy to `.env.local`)
- **TailwindCSS Styles**: `app/globals.css`
- **Type Definitions**: `types/index.d.ts`

### Core Application
- **Main Layout**: `app/layout.jsx`
- **Auth Layout**: `app/(auth)/layout.jsx`
- **Main Layout**: `app/(root)/layout.jsx`

### Key Features
- **Interviews**: `app/(root)/interview/` + `components/InterviewRunner.jsx`
- **Mock Tests**: `app/(root)/mock-test/` + `components/QuestionBank.jsx`
- **Internships**: `app/(root)/internships/` + `components/InternshipCard.jsx`
- **Jobs**: `app/(root)/jobs/` + `components/JobCard.jsx`

### Database & API
- **Firebase Client**: `firebase/client.js`
- **Firebase Admin**: `firebase/admin.js`
- **API Routes**: `app/api/`
- **Middleware**: `middleware/`

---

## 🚀 Getting Started from This Structure

1. **First Time?** → Read `README.md`
2. **Setting Up?** → Copy `.env.example` to `.env.local` and fill values
3. **Understanding Architecture?** → See `lib/modules/README.md`
4. **Looking for a Feature?** → Check `components/` and `app/(root)/`
5. **Need Admin?** → See `docs/ADMIN_SETUP_GUIDE.md`
6. **Integration Issues?** → Check relevant doc in `docs/`

---

## 📈 File Organization Best Practices Applied

✅ **Logical Grouping** - Related files in same folder  
✅ **Clear Naming** - File names describe purpose  
✅ **Separation of Concerns** - Actions, components, utilities separated  
✅ **Documentation** - Docs folder organized by topic  
✅ **Configuration** - All configs at root  
✅ **Environment** - `.env.example` template provided  
✅ **Type Safety** - TypeScript types centralized  
✅ **Scalability** - Module-based architecture  

---

**Last Updated**: February 28, 2026  
**Status**: 📚 Complete & Organized
