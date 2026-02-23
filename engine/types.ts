/** A single entry in a genome array. */
export type GenomeEntry = {
  role: `system` | `user` | `assistant`;
  evals: string[];
};
/** The parsed contents of a .task file. */
export type TaskFile = {
  genome: GenomeEntry[];
  budget: number;
};
/** A single message in the model's context window. */
export type ContextMessage = {
  role: string;
  content: string;
};
/**
 * The mutable runtime state of a running task.
 * Serialized in/out of isolated-vm before and after each eval.
 * Must remain JSON-serializable at all times.
 */
export type State = {
  genome: GenomeEntry[];
  budget: number;
  location: string;
  errors: string[];
  [key: string]: unknown;
};
/** Engine configuration loaded from config.json. */
export type Config = {
  model: string;
  population: number;
  concurrency: number;
  rate: number;
  vision: number;
  range: number;
  depth: number;
  chars: number;
  files: number;
  folders: number;
  memory: number;
  timeout: number;
  size: number;
  murder: boolean;
};
/** Which phase an expression is running in. */
export type Phase = `genome` | `behavior`;
/** Result of evaluating a single expression in isolated-vm. */
export type ExprResult = {
  /** String output: return value coerced to string, or an error message. */
  output: string;
  /** State after the expression ran (may be mutated). */
  state: State;
};
