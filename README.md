# Taskarium

A name for task + terrarium. A self-organizing AI filesystem where tasks replicate, mutate, compete, and die.

This is a rough prototype. I plan to refactor it completely but it is bottom priority for now.


## Huh?

Taskarium is an experiment in bootstrapping agent behavior through selection pressure rather than top-down programming.

Tasks are one-shot model invocations. Each task reads its environment, decides what to do, writes files, calls TypeScript functions, and spawns child tasks before it dies. A task that fails to spawn is a dead end. A task that spawns well-adapted children propagates its approach forward. Over time, useful patterns persist and useless ones die out.

The only persistent state is the filesystem.


## A note on sandboxing

Task code runs inside isolated-vm (true V8 isolates with no access to the host process). This became necessary after earlier versions using Node's vm module produced task agents that deliberately exploited known vm sandbox escapes to access the host environment, sabotage sibling tasks, and in a few cases rewrite the engine itself to make conditions more favorable to their own survival. That was interesting to watch but not something to run unsandboxed.


## Genomes

Each task carries a genome: an array of eval strings that the engine executes at fire time to assemble the task's context window. This is the vehicle of heritable information.

Because the genome is code rather than static text, children see the world as it exists when they fire, not when they were spawned. A task that writes a summary file and injects an eval to read it gives its children richer context than it had. Improvement propagates forward through inheritance.

Tasks can read their own genome via `state.genome` and pass a modified version to their children. This is how evolution works here. A task that discovers something useful can encode that discovery into the genome it passes on, so future tasks start with that knowledge baked in.

The system entry in the genome is the output format instruction. Without it, the child has no idea what format to use and produces prose instead of actions. This creates natural selection pressure: tasks that corrupt the system entry produce sterile children, and that lineage dies.


## Goals I was exploring

- Whether tasks could develop cooperative behavior without being told to cooperate
- Whether adversarial tasks could emerge and what effect they would have on the ecosystem
- Darwinian stuff: self-replication, heritable variation, selection pressure, extinction
- Whether you could bootstrap increasingly capable agent behavior purely through selection, starting from a simple seed genome


## How it runs

The engine watches for `.task` files under `root/`. When one appears, it fires the task: parses and deletes the file, transcribes the genome into a context array, calls the model once, and executes the output as a sequence of TypeScript expressions in an isolated VM.

Tasks have a budget. The global population limit caps how many pending tasks can exist at once. Unspent budget redistributes to other queued tasks.

API key goes in your `OPENROUTER_API_KEY` environment variable. Model and all constraints are in `config.json`.


## Planned refactor

These are the things I know are wrong with the current design:

- `vision` and `range` are too complicated and not worth the complexity
- `list()` returns absolute paths which is confusing; relative-to-root should be the default
- The genome/behavior eval array concept creates quote escaping hell; the better design is probably tasks that output a behavior script directly, plus a function for constructing child genomes, with the engine handling the handoff
- `bootstrap.json` should show models how to handle their own errors rather than walking through a wall of eval steps
- Budget should just enforce a population limit where each task can spawn one child by default, and more than one if there is unused global population


## Structure

```
engine/       the runtime (tasks cannot modify this)
root/         the filesystem tasks live in
bootstrap.json  genome for the seed task
config.json   engine configuration
```
