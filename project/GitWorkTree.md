# Strategy: "Git Worktrees + OpenSpec Partitions"

This is a sophisticated setup. You are using **OpenSpec** (likely the framework by Fission-AI) to drive development via structured markdown files, and you have specific folders for different agents (`.gemini`, `.claude`, `.codex`).

To achieve true **parallelism and isolation**—where Gemini works on Architecture, Claude on DB Schema, and Codex on Smart Contracts without "context pollution" (one agent getting confused by the other’s half-finished work)—you cannot simply run them in different terminal tabs in the same folder. They will overwrite each other's `openspec/changes` folders and confuse their context windows.

The most efficient, industry-standard way to handle this is using **Git Worktrees**.

Here is the strategic workflow to run these agents in parallel isolation.

### The Strategy: "Git Worktrees + OpenSpec Partitions"

Instead of cloning the repo 3 times (which wastes disk space and disconnects history), use `git worktree`. This allows you to check out different branches of the *same* repository into separate folders simultaneously.

#### Step 1: Create Isolated Agent Workspaces

Run these commands from your root terminal (at `AI_Bug_Bountry_App`). This creates sibling folders for each agent.

```bash
# 1. Create a branch for Gemini's task
git branch feature/gemini-arch
# 2. Create a specific workspace folder for Gemini linked to that branch
git worktree add ../gemini-workspace feature/gemini-arch

# 3. Create a branch for Claude's task
git branch feature/claude-db
# 4. Create a workspace for Claude
git worktree add ../claude-workspace feature/claude-db

# 5. Repeat for Codex
git branch feature/codex-contracts
git worktree add ../codex-workspace feature/codex-contracts

```

**Why this works:**

* **Isolation:** Gemini runs in `../gemini-workspace`. It literally *cannot see* what Claude is doing in `../claude-workspace`.
* **Context Purity:** When you point Gemini CLI to its folder, it only indexes the files relevant to its branch. It won't hallucinate based on Claude's temporary code.
* **Shared History:** All worktrees share the massive `.git` folder in your root. Commits happen instantly across all of them.

---

### Step 2: Configure the OpenSpec "Inputs"

You need to direct each agent to its specific responsibility using the OpenSpec structure shown in your image.

**In the `gemini-workspace` (Terminal 1):**

* **Goal:** Update System Architecture.
* **Command:** Tell Gemini to look strictly at `openspec/project/Architecture.md`.
* **OpenSpec Action:**
```bash
# Inside ../gemini-workspace
openspec new arch-update --proposal "Refine architecture based on Architecture.md"

```


*This creates `openspec/changes/arch-update` strictly in Gemini's folder.*

**In the `claude-workspace` (Terminal 2):**

* **Goal:** Generate SQL/Schema.
* **Command:** Tell Claude to focus on `openspec/project/DatabaseSchema.md`.
* **OpenSpec Action:**
```bash
# Inside ../claude-workspace
openspec new db-migration --proposal "Implement schema from DatabaseSchema.md"

```


*This creates `openspec/changes/db-migration` strictly in Claude's folder.*

---

### Step 3: The Parallel Execution Workflow

Here is how you orchestrate the agents simultaneously.

| Agent / Tool | Workspace Path | Source of Truth (Input) | Output Destination |
| --- | --- | --- | --- |
| **Gemini CLI** | `../gemini-workspace/` | `openspec/project/Architecture.md` | `openspec/changes/arch-update/` |
| **Claude Code** | `../claude-workspace/` | `openspec/project/DatabaseSchema.md` | `openspec/changes/db-migration/` |
| **Codex** | `../codex-workspace/` | `openspec/project/SmartContracts.md` | `openspec/changes/smart-contracts/` |

**Execution Example:**

1. **Launch Gemini:**
`cd ../gemini-workspace`
`gemini run "Analyze openspec/project/Architecture.md and implement the initial folder structure in the src folder. Use openspec format."`
2. **Launch Claude:**
`cd ../claude-workspace`
`claude "Read openspec/project/DatabaseSchema.md. Write the SQL migration files into the migrations folder."`

Because they are in worktrees, if Claude creates a file named `migrations/001_init.sql`, Gemini *will not see it* yet, preventing conflicts.

---

### Step 4: Merging the Work (The "Fan-In")

Once the agents are done and you have verified their work via OpenSpec (e.g., `openspec validate`), you merge them back to your main development folder.

1. **Commit in each workspace:**
* Gemini workspace: `git add . && git commit -m "feat: architecture update"`
* Claude workspace: `git add . && git commit -m "feat: db schema"`


2. **Merge in Root:**
```bash
cd AI_Bug_Bountry_App  # Back to your main root
git merge feature/gemini-arch
git merge feature/claude-db
git merge feature/codex-contracts

```


3. **Cleanup:**
`git worktree remove ../gemini-workspace` (and so on).

### Summary of Agent-Specific Roles (Based on your file structure)

* **Gemini (The Architect):** Assign it to `Architecture.md`, `Workflows.md`, and `Integration.md`. It handles the "Big Picture" struct.
* **Claude (The Backend Engineer):** Assign it to `DatabaseSchema.md`, `APIRoutes.md`, and `Security.md`. It writes the heavy logic.
* **Codex (The Specialist):** Assign it to `SmartContracts.md`. It handles the highly specific syntax execution.
