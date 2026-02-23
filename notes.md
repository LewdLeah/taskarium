# Taskarium

A self-organizing filesystem of pure functions and ephemeral AI tasks with no centralized orchestration.

---

## Core Idea

The filesystem is the world. Pure functions are atoms of behavior. Tasks are ephemeral processes that explore, execute, and produce — including spawning new tasks. Complex behavior emerges from simple local rules with no global coordinator. No token in any task's context is hardcoded by the engine — tasks have full authorial control over every token in the context of their children.

---

## Project Structure

```
taskarium/
  engine/
    tools/
      behavior/     write.ts, delete.ts, spawn.ts  (behavior phase — including functions called from behavior)
      genome/       (empty — reserved for genome-phase tools)
      read.ts       (all contexts)
      list.ts       (all contexts)
      call.ts       (all contexts)
  log/              debug output (empty for now)
  root/             the filesystem tasks live in
  bootstrap.json    genome array for the bootstrap task (TBD)
  config.json       engine configuration
```

---

## Config

`config.json` controls all engine behavior. The API key is read from the `OPENROUTER_API_KEY` environment variable.

```json
{
  "model": "qwen/qwen-2.5-coder-32b-instruct:free",
  "population": 100,
  "concurrency": 4,
  "rate": 1000,
  "vision": 9999,
  "range": 1,
  "depth": 5,
  "chars": 10000,
  "files": 20,
  "folders": 6,
  "memory": 64,
  "timeout": 5000,
  "size": 50000,
  "murder": false
}
```

`population` is the total global budget seeded into the system. `murder` controls whether tasks can `delete` pending `.task` files.

---

## Filesystem Structure

Everything under `root/` is just files and folders. Structure emerges organically. The only conventions are:

- `.ts` files are functions (callable via `call`)
- `.task` files are task invocations (engine-managed)
- `index.md` in each folder describes what that folder is for
- All other files are plain data (readable via `read`)

Folders can nest to arbitrary depth, bounded by the `depth` constraint.

---

## Visibility and Range

**`vision`** governs read access. A task with `vision: N` can `read`, `list`, and `call` paths within N steps up or down from its folder. `vision: 0` means current folder only.

**`range`** governs write access. A task with `range: N` can `write`, `delete`, and `spawn` to paths within N steps up or down. `range: 0` means current folder only.

With either set to 1, from `/a/b/c/`:
- 1 up: `/a/b/`
- Current: `/a/b/c/`
- 1 down: immediate subfolders of `/a/b/c/`

Functions called via `call` inherit the calling task's `vision` and `range` cones.

`range` allows tasks to pass data or spawn work nearby without needing dedicated messenger tasks.

---

## Tasks

Tasks are ephemeral and one-shot:

1. A `.task` file appears somewhere under `root/`
2. The engine parses and immediately deletes the `.task` file
3. `state` is initialized as `{ genome, budget, location }`
4. The genome is **transcribed** — each role's evals run in isolated-vm, building a context array
5. The model runs once with that context, producing an **operations** array
6. Each operation executes in isolated-vm in order
7. If the model call fails: the task dies, no retry

Tasks leave nothing behind unless they explicitly write something.

### .task Naming and Priority

Task files are named `Ωtimestamp.task` (e.g., `Ω1708123456789.task`). The engine processes pending tasks in ascending timestamp order — lowest timestamp runs first (FIFO). The `Ω` prefix makes task files visually distinct and sorts them together.

A task's location is implicit — it is the folder the `.task` file lives in.

### .task Structure

```json
{
  "genome": [
    { "role": "system", "evals": [
      "`You are a task. Your goal is:\n`",
      "read(`./index.md`)"
    ]},
    { "role": "user", "evals": [
      "`Adjacent files:\n`",
      "list(`.`).join(`\n`)"
    ]}
  ],
  "budget": 5
}
```

`role` must be `"system"`, `"user"`, or `"assistant"`. Each role's eval results are concatenated into the `content` string for that message.

`.task` files are not subject to the `chars` or `files` limits. Their serialized size is capped by `size`.

The genome is a recipe stored at spawn time and executed at fire time — context reflects the world as it exists when the task runs, not when it was created.

---

## Concurrency

The engine runs a configurable number of tasks concurrently. Remaining `.task` files queue and are picked up as slots free. The `rate` constraint sets a minimum interval in ms between task fires. Concurrent filesystem writes to the same file resolve as last-write-wins.

---

## Transcription

**Transcription** is the process of running the genome to build the model's context. For each genome entry, all evals run in isolated-vm and their string results are concatenated into the `content` for that message role:

```
[
  { role: "system", content: eval_0_result + eval_1_result + ... },
  { role: "user",   content: eval_0_result + ... },
  ...
]
```

Each eval must return a string. Non-string returns are coerced to a short informational string (type + JSON preview). Each eval is wrapped in try-catch — errors produce an informational string and execution continues.

**Timeout**: the `timeout` limit applies to the entire genome collectively. If `timeout` is reached mid-expression, that expression throws. All remaining expressions throw without executing, each including a short preview of the unexecuted source. Likewise for behavior expressions, which use `timeout` similarly, but independently.

**Memory**: the `memory` limit applies per-expression. Exceeding it throws for that expression only.

### Globals (All Contexts)

Available in genome evals, behavior operations, and `.ts` function files:

```ts
// all contexts:
state                               // mutable object; initialized as { genome, budget, location, errors: [] }
read(path: string): string          // read any file; throws if path is a folder or non-.ts target for call
list(path: string): string[]        // list immediate children; returns absolute paths rooted at root/
call(path: string, args: any): any  // execute a .ts function file; throws if target is not a .ts file

// behavior phase only (including functions called from behavior):
write(path: string, content: string): string
delete(path: string): string
spawn(location: string, genome: object[], budget: number): string
```

Paths can be absolute or relative to the task's location: `'.'` or `'./'` for the current folder, `'../'` for the parent, `'./subfolder/'` for children. `read`, `list`, and `call` throw if the path falls outside the `vision` cone; `write`, `delete`, and `spawn` throw if the path falls outside the `range` cone.

`state` is shared and mutable across all contexts. It is serialized into the isolated-vm before each eval and deserialized out after — mutations persist to subsequent evals and into the behavior phase. `state` must be JSON-serializable; its runtime size is constrained by `memory`. The initial values `state.genome`, `state.budget`, and `state.location` are for the task's own informational use — the engine enforces budget and tracks the original genome separately, outside isolated-vm.

`state.errors` starts as `[]`. Whenever a caught error occurs in any eval (genome or behavior), the error string is pushed to `state.errors` in addition to being included inline in the eval output. Tasks may evolve to inspect this for self-diagnosis.

### Discovery

Discovery happens by combining `list` (to enumerate files and folders) with `read` on `index.md` files (to understand what a folder is for). The initial seed task establishes this as a convention; future tasks can conserve, modify, or replace it entirely.

---

## Functions

Function files are pure TypeScript with a single default export:

```ts
/**
 * Summarizes a block of text.
 * @input { text: string }
 * @output { summary: string }
 */
export default function({ text }: { text: string }): { summary: string } {
  // ...
}
```

- Self-documenting — a dumb task can read one and know exactly what it does
- Stateless by convention — input in, output out — but all globals are available; the available set depends on calling context (`write`, `delete`, `spawn` are only injected during behavior phase)
- Composable — functions can call other functions via `call`

Inner helpers and unexported functions are fine. `call` invokes the default export.

### Other File Types

`.json`, `.txt`, `.md`, and any other non-`.ts` files are plain data. `read` returns their contents as a string. How that string is interpreted is up to the task reading it.

---

## Behavior

The model produces a behavior array — an array of TypeScript expression strings. The engine captures from the first `[` to the last `]` (inclusive) and parses it as JSON. If parsing fails, the task dies silently — output schema correctness is selection pressure.

Each operation runs in order in isolated-vm, wrapped in try-catch. Errors are caught and execution continues. The same `memory` limit applies per-expression; `timeout` applies to the whole array.

`state` is mutable throughout. Operations can store intermediate results for later operations:

```ts
// operation 1 — compute and store
state.summary = call(`./summarize.ts`, { text: read(`./data.txt`) })

// operation 2 — use the stored value
write(`./summary.md`, state.summary)

// operation 3 — spawn a child with a crafted genome
spawn(`./child/`, [
  { "role": "system", "evals": ["`You are a summarizer. Context: `", "state.summary"] },
  { "role": "user",   "evals": ["`Summarize the files in this folder and write them somewhere useful.`"] }
], 1)
```

A single-operation array is valid.

To modify a file in-place:

```ts
const target = `./index.md`;
write(target, read(target).replace(`old text`, `new text`));
```

Or create a function file to wrap this.

### Tool Rules

`write`, `delete`, and `spawn` are subject to the `range` constraint and return a short confirmation string.

- `write` and `spawn` create files and folders if they don't exist, respecting `files` and `folders` limits
- `write` cannot target `.task` files
- `read` works on `.task` files — a task can inspect a sibling's genome and engineer a `spawn` call based on it
- `call` throws if the target is not a `.ts` file
- `delete` accepts files or folders; folders are deleted recursively
- `delete` throws if the target (or any descendant) is a `.task` file and `murder` is disabled
- `spawn` throws if targeting a path outside `range`; throws if engine budget is exhausted; passed budget is capped at the engine's remaining balance
- After all operations, any unspent budget is randomly redistributed to a queued task

---

## Budget

Budget is a conserved global quantity that controls task spawning. The total is set by `population` in config.

- Every `.task` has a `budget` integer
- When spawning children, the parent distributes budget explicitly; the engine caps each spawn at the remaining balance
- When a task ends with unspent budget, it is randomly redistributed to a queued task; if no tasks are queued, the budget is held in a reserve pool and redistributed when tasks become available
- Budget cannot be created — only the bootstrap task carries the full `population`

Simple tasks that do work without spawning generate free energy that powers activity elsewhere.

---

## Bootstrap

On startup, if no `.task` files exist anywhere under `root/`, the engine creates `root/Ωtimestamp.task` using the genome from `bootstrap.json` and `budget: population`. The format of `bootstrap.json` is identical to the `"genome"` field of a `.task` file — a JSON array of `{ role, evals }` objects.

The content of `bootstrap.json` is TBD.

---

## Constraints

| Parameter | Description |
|---|---|
| `model` | OpenRouter model string |
| `population` | Total global budget seeded into the system |
| `concurrency` | Max tasks running simultaneously |
| `rate` | Minimum ms between task fires |
| `vision` | Steps up and down a task can read/list/call from its folder |
| `range` | Steps up and down a task can write/delete/spawn from its folder |
| `depth` | Max folder nesting depth |
| `chars` | Max character count of any non-`.task` file |
| `files` | Max files per folder (`.task` exempt) |
| `folders` | Max subfolders per folder |
| `memory` | Memory limit per expression execution |
| `timeout` | Max milliseconds for genome or operations execution |
| `size` | Max serialized size of a `.task` file (state size is constrained by `memory`) |
| `murder` | Boolean — whether tasks can `delete` other pending `.task` files |

---

## File Naming Rules

- Must match `/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/`
- Max 64 characters
- Must start with alphanumeric (no hidden files)
- No path separators
- `.task` extension is reserved — only creatable via `spawn`
- `Ω`-prefixed filenames are engine-managed and exempt from these rules

---

## Runtime (Bedrock)

The engine is the only thing tasks cannot modify. Its responsibilities:

- On start: if no `.task` files exist under `root/`, create `root/Ωtimestamp.task` from `bootstrap.json` with `budget: population`
- Watch for `.task` files under `root/`; process in timestamp order up to `concurrency` limit, at minimum `rate` ms intervals
- Parse and immediately delete each `.task` file
- Initialize `state` as `{ genome, budget, location }`; track real budget as a `let` and original genome as a `const` outside isolated-vm
- Transcribe the genome into a context array
- Run the model (single turn, via OpenRouter) with the context array; API key from `OPENROUTER_API_KEY`
- Parse operations: capture from first `[` to last `]`; if invalid JSON, task dies silently
- Execute operations in isolated-vm
- Enforce all constraints
- Manage the global budget pool

Everything in `root/` is task-territory and can be rewritten.

### Sandboxing

Genome expressions and behavior operations are executed inside `isolated-vm` (V8 isolates). This enforces true isolation — no access to host process globals (`process`, `require`, etc.), only the injected primitives. Memory and timeout limits are enforced at the V8 level.

TypeScript is transpiled via esbuild (fast type-stripping) before being passed to the isolate. `read`, `list`, and `call` are injected as `isolated-vm` `Reference` objects. `state` is serialized into the isolate before each eval and deserialized out after.

All paths are validated against `root/` before any filesystem operation — any path resolving outside the root throws.

---

## Emergent Properties

- **Specialization**: depth implies narrower context and more specialized behavior
- **Information propagation**: tasks can spawn into a parent folder to create work at a higher visibility level; data propagates upward through deliberate writes
- **Evolution**: genomes are inherited — tasks see their own genome via `state.genome` and typically author child genomes expression-by-expression, producing genuine mutation rather than verbatim copying
- **Horizontal gene transfer**: a task can `read` a sibling's `.task` file and use its genome as raw material for a `spawn` call
- **Resilience**: no single point of failure; broken functions can be rewritten by other tasks; the engine is the only true bedrock
- **Metabolism**: unspent budget redistributes randomly, keeping dormant areas of the ecosystem alive
- **Pruning**: tasks can delete files or entire folder subtrees (and, if `murder` is enabled, other tasks), allowing bad ideas to die and space to be reclaimed
