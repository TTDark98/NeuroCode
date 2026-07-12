# NeuroCode — Algorithm Visualization Platform

Welcome to the **NeuroCode** master repository. NeuroCode is an interactive, highly animated Single Page Application (SPA) designed to visualize standard and custom algorithms. It features a glassmorphic dark-futuristic styling, HSL color-tailored themes, micro-animations, and a hybrid execution engine combining local deterministic trace simulation with fallback LLM-synthesized trace generation.

---

## Table of Contents
1. [Executive Summary & Design Aesthetics](#1-executive-summary--design-aesthetics)
2. [Frontend Architecture & File Anatomy](#2-frontend-architecture--file-anatomy)
3. [Core State Machine & Event Flow](#3-core-state-machine--event-flow)
4. [Algorithm Step-Trace Formats](#4-algorithm-step-trace-formats)
5. [Database Schema Specification](#5-database-schema-specification)
6. [Full-Stack Development Plan & Status](#6-full-stack-development-plan--status)
7. [AI-Powered vs. Hybrid Engine Analysis](#7-ai-powered-vs-hybrid-engine-analysis)
8. [DBMS Lab Presentation Questions & Code Pointers](#8-dbms-lab-presentation-questions--code-pointers)
9. [Chronological Change Log](#9-chronological-change-log)

---

## 1. Executive Summary & Design Aesthetics

NeuroCode uses a glassmorphic dark-futuristic styling to deliver a modern, interactive visual experience.

### Key UX/UI Layout Sections:
*   **Navigation Bar**: Custom logo, page switches (Dashboard, Studio, Algorithms, Community), search interface, notification widget, user avatar, and a theme selector supporting:
    *   *Dark Futuristic* (Default)
    *   *Retro Pixel*
    *   *Light Minimalist*
    *   *Solarized Hacker*
    *   *Neuro Blush*
*   **Dashboard Page**: Greeting header, dynamic statistics grid (saved algorithm count, run counts, DB storage usage, and active time spent), quick action cards, and personal project feeds.
*   **Studio Page (Interactive Split-Panel Editor & Canvas)**:
    *   *Left Control Panel*: Algorithm library selector, run button, project copying, AI provider switches (Ollama/Gemini/NVIDIA NIM), LLM model settings, and input custom parameters.
    *   *Code Editor*: Overlay editor with line counters and real-time syntax highlighting.
    *   *Right Visualization Canvas*: Glassmorphic canvas drawing sorting array bars or SVG graph structures, live runtime statistics (swaps/comparisons), and seekable step trace history lists.
    *   *Footer Panel*: Playback controllers (Skip to Start, Step Back, Play/Pause, Step Forward, Skip to End), timeline progress track, and speed slider.
*   **Algorithms Library Page**: Filter tabs (All, Sorting, Searching, Graphs, Dynamic Programming) with standard algorithm collection cards.
*   **AI Assistant Panel**: Slide-out chat drawer to ask optimization and code adjustment questions.

---

## 2. Frontend Architecture & File Anatomy

*   **`index.html`**: The main entry shell. Houses page panels (`page-dashboard`, `page-studio`, etc.), editor textareas, control elements, and the slide-out assistant panel.
*   **`css/styles.css`**: Design system tokens (HSL variables for theme variations), glassmorphic classes (`.glass-card`), active element indicators (`.vis-bar-compare`, `.vis-bar-highlight-swap`), and SVG layout styles.
*   **`js/state.js`**: Global reactive state manager tracking state properties like `currentPage`, `currentAlgorithm`, `editorCode`, `steps`, `currentStep`, `isPlaying`, `speed`, and `timeSpent`.
*   **`js/main.js`**: App orchestrator handling SPA routing, page changes, theme updates, code editor sync scrolling/highlight overlays, custom input parsing, and ticks for logging user active time.
*   **`js/parser.js`**: Syntax tokenizer mapping code to highlighted spans (`highlightCode`), generating line numbers, resolving input structures (`parsePlaygroundInput`), and auto-detecting algorithm types using regular expressions.
*   **`js/algorithms.js`**: Local deterministic tracers computing sorted outputs and returning complete step histories for standard algorithms: Bubble Sort, Selection Sort, Merge Sort, Binary Search, BFS, and DFS traversals.
*   **`js/visualizer.js`**: Hooks to the active step array to draw sorting bars (divs using transition scale heights) or node-edge graph structures (SVG coordinates).
*   **`js/player.js`**: Visualizer playback loop controls. Manages setInterval triggers, timeline seeks, and forward/backward stepping.
*   **`js/storage.js`**: Replaces client local storage with asynchronous network requests fetching and saving user codes and properties from the server endpoints.
*   **`js/ai-generator.js`**: Communicates with selected AI API endpoints to generate JSON trace sequences when custom code is loaded.
*   **`js/assistant.js`**: Chat module query parser. Responds using keyword matrices or queries LLM endpoints when custom/advanced requests are submitted.

---

## 3. Core State Machine & Event Flow

When a user triggers an algorithm run, the application coordinates logic using a **hybrid execution flow**:

```
[ User clicks "Run" ]
          │
          ▼
{ Does the code match a built-in algorithm? }
          ├─── YES (Deterministic Engine) ───► Run local algorithm tracer instantly (0 latency)
          │                                                    │
          └─── NO (AI-Synthesized Engine) ────► Disable Run Button / Show Progress Loader
                                                               │
                                                               ▼
                                                  Call AI Generation endpoint (Gemini / Ollama / NIM)
                                                               │
                                                               ▼
                                                  { Check Response / Status }
                                                               ├─── 429/503 (Error) ───► Backoff & Retry (up to 3x)
                                                               │
                                                               └─── 200 (Success) ───► Register 'custom_ai' trace
                                                                                               │
                                                                                               ▼
                                                                                   Commit Trace payload to StateStore
                                                                                               │
                                                                                               ▼
                                                                                   Reset player indices (Step = 0)
                                                                                               │
                                                                                               ▼
                                                                                   Re-render Visualizer Canvas
```

---

## 4. Algorithm Step-Trace Formats

### A. Array Visualizer Frame (Sorting & Searching)
```json
{
  "array": [12, 32, 8, 41, 45, 56],
  "highlights": [
    { "index": 1, "type": "compare" },
    { "index": 2, "type": "compare" }
  ],
  "action": "comparing",
  "description": "Comparing arr[1] = 32 with arr[2] = 8",
  "comparisons": 4,
  "swaps": 2
}
```

### B. Graph Visualizer Frame (BFS & DFS)
```json
{
  "graph": {
    "nodes": [0, 1, 2, 3],
    "adjacencyList": { "0": [1, 2], "1": [0, 3], "2": [0], "3": [1] }
  },
  "visited": [0, 1],
  "currentNode": 1,
  "highlights": [
    { "node": 1, "type": "current" },
    { "node": 3, "type": "compare" }
  ],
  "action": "searching",
  "description": "Discovered neighbor 3 from current node 1 — pushing to queue."
}
```

---

## 5. Database Schema Specification

*   **Database Engine**: MariaDB / MySQL
*   **Database Name**: `neurocode`
*   **Default Engine**: `InnoDB` (enables Transactions and Foreign Key validation)

### Entity-Relationship (ER) Schema:

#### 1. `users` — User Account Profiles
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Account email / login username |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash of password (salt = 10) |
| `name` | VARCHAR(255) | DEFAULT NULL | Display name |
| `avatar` | LONGTEXT | DEFAULT NULL | Base64-encoded image string |
| `visualizer_runs` | INT | DEFAULT 0 | Cumulative visualizer runs |
| `time_spent` | INT | DEFAULT 0 | Cumulative active time (seconds) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date account was registered |

#### 2. `projects` — Saved Algorithms
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique project identifier |
| `user_id` | INT | NOT NULL, FK → `users(id)` | Owning user ID |
| `name` | VARCHAR(255) | NOT NULL | Project name |
| `code` | TEXT | NOT NULL | Algorithm source code |
| `input_data` | TEXT | NULL | Input array/graph configuration |
| `visualization_type` | VARCHAR(50) | DEFAULT 'bars' | Visualization canvas mode (`bars` or `graph`) |
| `steps_json` | LONGTEXT | NULL | Cached trace JSON frames |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Project creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last modification timestamp |

#### 3. `user_activity_log` — Event Logging for Heatmap Contributions
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique log entry ID |
| `user_id` | INT | NOT NULL, FK → `users(id)` | User who generated the action |
| `activity_type` | ENUM | NOT NULL | Type of action: `save_project`, `run_visualizer`, `share_project`, `upvote_project`, `bootstrap_generated` |
| `activity_date` | DATE | NOT NULL | Date activity was recorded |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Database log insertion timestamp |

> *Composite Index*: `idx_user_date` on `(user_id, activity_date)`

#### 4. `badges` — Gamification Achievement Rules
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique badge identifier |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Display name of the badge |
| `description` | VARCHAR(255) | NOT NULL | Clear explanation of the achievement rules |
| `icon` | VARCHAR(50) | NOT NULL | UI Icon reference |
| `color_theme` | VARCHAR(50) | NOT NULL | CSS badge color class |
| `rule_type` | ENUM | NOT NULL | Metric evaluated: `total_runs`, `total_projects`, `total_shares`, `total_time` |
| `rule_threshold` | INT | NOT NULL | Numeric condition required to trigger unlock |

#### 5. `user_badges` — Unlocked Badges (Junction Table)
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `user_id` | INT | NOT NULL, FK → `users(id)` | User who unlocked the badge |
| `badge_id` | INT | NOT NULL, FK → `badges(id)` | Badge identifier unlocked |
| `unlocked_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Timestamp the badge was awarded |

> *Composite Primary Key*: `(user_id, badge_id)`

#### 6. `user_streaks` — Streaks Progress Tracking
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `user_id` | INT | PRIMARY KEY, FK → `users(id)` | Relational reference identifying the user |
| `current_streak` | INT | DEFAULT 1 | Active consecutive daily usage streaks |
| `longest_streak` | INT | DEFAULT 1 | Record for highest consecutive active days |
| `last_activity_date` | DATE | NOT NULL | The most recent date user qualified as active |

---

## 6. Full-Stack Development Plan & Status

*   **PHASE 1: SERVER & DATABASE FOUNDATION (COMPLETED)**
    *   Node.js environment setup with Express and `mysql2`.
    *   Database tables created for core entities (Users, Projects, Activity Log, Badges, Streaks).
    *   Implemented REST authentication APIs with JWT tokens and `bcrypt` hashing.
*   **PHASE 2: PROJECT PERSISTENCE & USER SYNC (COMPLETED)**
    *   Replaced LocalStorage logic in `js/storage.js` with calls to `/api/projects`.
    *   Configured endpoints `/api/projects/save`, `/api/projects/load`, and `/api/projects/delete`.
    *   Built real-time active session duration tracking synced dynamically every 30 seconds.
*   **PHASE 3: "VS MODE" ARENA & BENCHMARK PROFILER (ROADMAP)**
    *   Split-screen layouts showing dual visualization animations side-by-side.
    *   Execution statistics graphing theoretical limits overlaid with real metrics.
*   **PHASE 4: REAL-TIME MULTIPLAYER (ROADMAP)**
    *   Setting up server Socket.io channels to synchronize code editor states.
    *   Broadcasting seek actions, playback states, and visual steps in multiplayer rooms.
*   **PHASE 5: PUBLIC GALLERY FEED (ROADMAP)**
    *   Galley routing and sharing components allowing project upvoting and forking.

---

## 7. AI-Powered vs. Hybrid Engine Analysis

*   **Fully AI-Powered Visualizer**:
    *   *Pros*: Can visualize any arbitrary data structure written by the user. No need to pre-program code tracers.
    *   *Cons*: High network latency (1-5s responses), offline limitations, API request cost, non-deterministic errors.
*   **Hybrid Engine (Our Architecture)**:
    *   *Deterministic Fallback*: Compares user input against local tracers inside `algorithms.js`. Provides instant, 100% accurate steps offline for standard algorithms.
    *   *AI Synthesis fallback*: If custom inputs/code structure modifications are detected, routes the query via `ai-generator.js` to build step JSON arrays.

---

## 8. DBMS Lab Presentation Questions & Code Pointers

Here are the most common DBMS-specific conceptual questions and their exact code locations:

### Q1: How do you protect against SQL Injection attacks?
*   **Answer**: By using **Parameterized Queries (Prepared Statements)**. Query variables are sent separately from the SQL statement parameters so they are never executed as database commands.
*   **Code Pointer**: [server.js: L371-L373](file:///home/tt/Documents/neurocode/server.js#L371-L373)
*   **Code Block**:
    ```javascript
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    ```

### Q2: What is Referential Integrity, and how does your database enforce it?
*   **Answer**: It ensures that relationships between tables remain consistent. We enforce this using **Foreign Key Constraints** with the `ON DELETE CASCADE` rule. If a user's record is deleted, MariaDB automatically cascades and purges all related rows in secondary tables.
*   **Code Pointer**: [schema.sql: L30](file:///home/tt/Documents/neurocode/schema.sql#L30)
*   **Code Block**:
    ```sql
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ```

### Q3: What is Database Connection Pooling, and why did you use it?
*   **Answer**: Establishing a connection to a database is resource-intensive. A connection pool keeps a set of active connections warm. When a client requests data, it borrows a connection from the pool and returns it immediately after execution, preventing database crashes under concurrent load.
*   **Code Pointer**: [server.js: L21-L39](file:///home/tt/Documents/neurocode/server.js#L21-L39)
*   **Code Block**:
    ```javascript
    const pool = mysql.createPool(poolConfig);
    ```

### Q4: Explain the difference between Stored/Derived Attributes and Denormalized Attributes in your project.
*   **Answer**: 
    *   **Derived Attributes** are calculated on-the-fly at runtime (e.g., counting projects or checking if a streak is broken).
    *   **Denormalized Attributes** (like `users.visualizer_runs` and `users.time_spent`) could theoretically be derived by running intensive counts on logs but are written directly to table columns to optimize read performance.
*   **Code Pointer (Derived Check)**: [server.js: L789-L796](file:///home/tt/Documents/neurocode/server.js#L789-L796)
*   **Code Block**:
    ```javascript
    if (streak.last_activity_date) {
        // ...
        if (diffDays > 1) {
            streak.current_streak = 0; // Derived at runtime if inactive
        }
    }
    ```

### Q5: How do you compute aggregate statistics for user contributions?
*   **Answer**: By executing the SQL `GROUP BY` clause combined with aggregate functions (like `COUNT`) on target column values.
*   **Code Pointer**: [server.js: L715-L722](file:///home/tt/Documents/neurocode/server.js#L715-L722)
*   **Code Block**:
    ```javascript
    const [rows] = await pool.query(
        `SELECT activity_date, activity_type, COUNT(*) as count 
         FROM user_activity_log 
         WHERE user_id = ? AND YEAR(activity_date) = ?
         GROUP BY activity_date, activity_type 
         ORDER BY activity_date ASC`,
        [req.user.id, currentYear]
    );
    ```

### Q6: Why did you choose Express application-level triggers instead of MySQL Database Triggers for badges and streaks?
*   **Answer**: Implementing logic at the application layer allows us to use asynchronous task managers, call external APIs (like LLM trace generation), send live toast updates to the frontend immediately, and keep our SQL statements highly portable.
*   **Code Pointer**: [server.js: L700-L702](file:///home/tt/Documents/neurocode/server.js#L700-L702)
*   **Code Block**:
    ```javascript
    // 3. Trigger badge check
    await checkAndUnlockBadges(userId);
    ```

---

## 9. Chronological Change Log

*   **[2026-05-22]**: Added Client-side Hybrid routing checks inside main controller processes. Added `fetchWithRetry` support to bypass transient 429/503 HTTP responses during LLM queries.
*   **[2026-05-22]**: Fixed provider-mismatch endpoint errors when selecting NVIDIA or Gemini models. Introduced global toast listeners to alert users during processing.
*   **[2026-05-23]**: Rescaled visualization sorting heights in `js/visualizer.js` to use a 0.55 coefficient for better visual feedback.
*   **[2026-05-23]**: Replaced project database backend targets from SQLite/MongoDB to a standardized MariaDB implementation.
*   **[2026-05-23]**: Verified route compatibility adjustments for wildcards in Express. Confirmed user database inserts, registration rules, logins, and JWT parses function successfully.
*   **[2026-05-23]**: Consolidated routing files, connection modules, and config blocks into `server.js` for simplicity. Created `schema.sql` to represent core entities.
*   **[2026-05-24]**: Integrated active student session logging. Added `time_spent` logic and dynamic increment routes `/api/users/increment-time`.
*   **[2026-05-24]**: Configured NIM support. Created live seek logs in the visualizer panel sidebar to enable users to click and jump directly to specific trace frames.
