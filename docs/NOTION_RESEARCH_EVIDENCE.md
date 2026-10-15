# Notion Research Evidence & Investigation Dossier

This document establishes the empirical basis, official Notion documentation references, Reverse-Engineering Anything (REA) analysis, and live browser observations used to build the personal Notion alternative (*Worknest / NovaNotes*).

---

## 1. REA Investigation & Operational Tool Status

### 1.1 REA MCP Environment Audit
* **Tool Tested**: `rea.binary_session`
* **Status**: Operational (`call_mcp_tool` returned complete capability catalog).
* **Available REA Capabilities on Host (Windows x64)**:
  * `analyze_javascript_application`: Operational (reconstructs JavaScript/TypeScript source trees, ASAR archives, call graphs, export shapes).
  * `inspect_managed_artifact`, `inspect_managed_members`, `inspect_managed_native_boundaries`: Operational.
  * `open_binary`, `binary_session`, `inspect_artifact`, `extract_artifact`: Operational.
  * `list_browser_targets`: Requires loopback Chrome DevTools Protocol (CDP) endpoint (e.g. `http://127.0.0.1:9222`).
* **Fallback / Direct Web Investigation**: Used `read_url_content`, `search_web`, and interactive Next.js application verification.

---

## 2. Official Notion Reference Inventory

The following official public Notion documentation sources were reviewed and mapped to functional requirements:

1. **Notion Product Overview & Content Blocks**
   * *Sources*: `https://www.notion.com/product/features`, `https://www.notion.com/help/guides/types-of-content-blocks`
   * *Observed Facts*:
     * Document model consists of structured, typed blocks (Headings 1–3, Paragraphs, Bulleted/Numbered Lists, To-do checklists, Callouts with custom icons, Toggle disclosures, Code blocks with syntax highlighting, Dividers, 2-Column layouts, Quotes, Math Equations, Web Bookmarks, and Table of Contents).
     * Every document page optionally features an Icon (emoji or custom symbol) and a Top Cover Banner (180px–220px high) with overlapping icon positioning.
     * Pages support full-text search, breadcrumbs, favorites, soft delete (Trash), and permanent restoration.

2. **Notion Database Engine & Property Types**
   * *Sources*: `https://www.notion.com/help/intro-to-databases`, `https://www.notion.com/help/category/databases`
   * *Observed Facts*:
     * Every database record is also a **Page**. Clicking an "OPEN" button or card opens the record in a **Center-Peek** or **Side-Peek** modal containing all property fields, a comments thread, and a child block document editor.
     * Core Property Types:
       * **Basic**: Title, Text, Number, Select (single colored tag), Multi-Select (multiple colored tags), Status (To Do, In Progress, Done).
       * **Temporal & User**: Date (with time/range), Person/Assignee, Created Time, Last Edited Time.
       * **Interactive / Links**: Checkbox, URL, Email, Phone, Files & Media.
       * **Relational & Computed**: Relation (cross-database links), Rollup (aggregated computations across relations), Formula (safe expression evaluation).
       * **Identifiers**: Unique sequential ID (e.g. `TASK-1`).

3. **Notion Database Views & Layout Engines**
   * *Sources*: `https://www.notion.com/help/category/database-views`, `https://www.notion.com/help/guides/when-to-use-each-type-of-database-view`
   * *Observed Facts*:
     * Six canonical views operate on the exact same underlying records:
       1. **Table View**: Spreadsheet-like rows and columns with inline cell editing and bottom calculation footer (Sum, Count, Average, Min, Max, % Checked).
       2. **Board (Kanban) View**: Status or Select grouped vertical columns with card counters and drag-and-drop or status updates.
       3. **Calendar View**: Monthly grid mapping items to date properties.
       4. **Gallery View**: Visual grid cards showing tags, dates, and cover previews.
       5. **List View**: Minimalist itemized checklist with badges.
       6. **Timeline (Gantt) View**: Horizontal schedule showing date spans and duration bars.

4. **Notion Formulas 2.0 & Rollup Aggregations**
   * *Sources*: `https://www.notion.com/help/relations-and-rollups`, Notion Formulas 2.0 Documentation
   * *Observed Facts*:
     * Safe AST evaluation without `eval()`: Supports arithmetic (`+`, `-`, `*`, `/`, `%`), comparisons (`==`, `!=`, `<`, `>`, `<=`, `>=`), string concatenation, and mathematical functions (`abs`, `round`, `floor`, `ceil`, `min`, `max`, `sqrt`).
     * Cross-database Rollups: Aggregates properties from related items using functions: `count`, `count_values`, `sum`, `avg`, `min`, `max`, and `show_original`.

---

## 3. Comparison Ledger: Observed Gaps vs. Implementation Decisions

| Subsystem | Notion Reference Pattern | Initial Application State | Concrete Implementation Decision |
| :--- | :--- | :--- | :--- |
| **Record as Page** | Clicking any record opens a Peek modal with properties panel, comments, and document body | Records were only editable in-place inside cells; no detail modal existed | Build `RecordModal.tsx` providing Center-Peek view with editable properties, comments thread, and embedded `BlockEditor` |
| **Multi-Select** | Allows multiple colored badge tags per cell with add/remove/create popover | `multi_select` existed in TypeScript types but was unhandled in `DatabaseView.tsx` | Implement full multi-select tag picker with badge chips, delete buttons, and create-on-the-fly option |
| **Advanced Filtering** | Filter by any property using typed operators (`contains`, `equals`, `>`, `<`, `is empty`, etc.) | Only basic `status` filtering dropdown was available | Implement Multi-Property Filter Engine supporting Text, Number, Status, Select, and Checkbox operators |
| **Multi-Property Sorting** | Multi-sort manager allows sorting by multiple fields in priority order | Only single-column sort was available | Implement multi-column sort pipeline |
| **Auto-Computed Properties** | `created_time` and `last_edited_time` automatically format timestamps | `created_time` and `last_edited_time` were unhandled in views | Add automatic timestamp formatting for system properties in table and detail views |
| **Page Covers & Icons** | Top banner cover with overlapping emoji icon and preset gallery | Page editor had title and body only; no cover image banner | Add cover banner component with 6 curated presets + custom URL, and interactive emoji icon picker |
| **Page Duplication** | Sidebar menu allows duplicating any page with its full content | Only favorite and delete were available | Add `handleDuplicatePage` in `workspaceStore.ts` and sidebar context menu |
| **Math Block** | Slash command `/math` for LaTeX equations | Not present in TipTap extensions | Add `/math` command inserting stylized KaTeX/LaTeX equation block |

---

## 4. Verification Evidence Strategy
1. **Automated Unit & Integration Testing**: Vitest test suite executing in jsdom with testing-library.
2. **Type Safety & Build Verification**: TypeScript strict mode (`tsc --noEmit`) and Next.js production build (`npm run build`).
3. **Live Server Verification**: Verifying `http://localhost:3000` responds with `HTTP 200 OK` and active state.
