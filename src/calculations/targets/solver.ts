import { CalculationInputError, parseOrThrow, signedMoneySchema } from '../validation';

export const SOLVER_MAX_ITERATIONS = 100;
/** Convergence tolerance on the solved input amount, in pounds. */
export const SOLVER_TOLERANCE = 0.01;
/** Hard upper bound on any solved amount. */
export const SOLVER_UPPER_CAP = 10_000_000;

export interface SolverSuccess {
  achievable: true;
  requiredAmount: number;
  converged: boolean;
  iterations: number;
}

export interface SolverFailure {
  achievable: false;
  reason: string;
}

export type SolverResult = SolverSuccess | SolverFailure;

function evaluate(fn: (input: number) => number, input: number): number {
  const value = fn(input);
  if (!Number.isFinite(value)) {
    throw new CalculationInputError(
      `Solver objective returned a non-finite value for input ${input}`,
    );
  }
  return value;
}

/**
 * Binary search for the smallest input at which a monotonically increasing
 * function reaches the target.
 *
 * Bracketing: the upper bound starts at max(3 × target, £100,000) and doubles
 * until the target is bracketed or the £10m cap is hit (→ not achievable).
 * The search then bisects until the bracket is narrower than the tolerance
 * (£0.01) or the iteration cap is reached. Results are always finite.
 */
export function solveMonotonicTarget(fn: (input: number) => number, target: number): SolverResult {
  parseOrThrow(signedMoneySchema, target, 'solver target');

  if (evaluate(fn, 0) >= target) {
    return { achievable: true, requiredAmount: 0, converged: true, iterations: 0 };
  }

  let upper = Math.min(Math.max(3 * target, 100_000), SOLVER_UPPER_CAP);
  while (evaluate(fn, upper) < target) {
    if (upper >= SOLVER_UPPER_CAP) {
      return {
        achievable: false,
        reason:
          'The target cannot be reached within the solver upper limit. Check the target and cost assumptions.',
      };
    }
    upper = Math.min(upper * 2, SOLVER_UPPER_CAP);
  }

  let lower = 0;
  let iterations = 0;
  while (upper - lower > SOLVER_TOLERANCE && iterations < SOLVER_MAX_ITERATIONS) {
    iterations += 1;
    const mid = (lower + upper) / 2;
    if (evaluate(fn, mid) < target) {
      lower = mid;
    } else {
      upper = mid;
    }
  }

  return {
    achievable: true,
    requiredAmount: (lower + upper) / 2,
    converged: upper - lower <= SOLVER_TOLERANCE,
    iterations,
  };
}
