import type { GigGaugeScenario, ScenarioResult, WorkArrangementType } from '../calculations/types';
import {
  annualiseAmount,
  buildPeriodBreakdown,
  type PeriodBreakdown,
} from '../calculations/periods';
import { summariseExpenses } from '../calculations/expenses';
import { splitScenarioIncome } from '../calculations/income';
import { computeScenarioResult } from '../calculations/scenarioResult';
import { getTaxConfig } from '../calculations/tax/taxConfig';
import { solveRequiredGrossSalary } from '../calculations/targets/solveRequiredGross';
import { solveRequiredRevenue } from '../calculations/targets/solveRequiredRevenue';

export type RequiredSolve =
  | {
      kind: 'grossSalary' | 'revenue';
      annualAmount: number;
      breakdown: PeriodBreakdown;
      achievable: true;
    }
  | { achievable: false; reason: string };

export type PlanResults =
  | { kind: 'regionUnsupported'; reason: string }
  | {
      kind: 'ok';
      scenarioResult: ScenarioResult;
      required: RequiredSolve | null;
      /**
       * True when income was not entered and `scenarioResult` is projected from
       * the achievable required gross/revenue solve so tax and take-home are visible.
       */
      projectedFromRequired: boolean;
    };

function isEmployedOnly(type: WorkArrangementType): boolean {
  return type === 'employed';
}

function cloneScenario(scenario: GigGaugeScenario): GigGaugeScenario {
  return JSON.parse(JSON.stringify(scenario)) as GigGaugeScenario;
}

/** Fill the solved required amount into the appropriate income field for display. */
export function scenarioWithRequiredIncome(
  scenario: GigGaugeScenario,
  required: Extract<RequiredSolve, { achievable: true }>,
): GigGaugeScenario {
  const next = cloneScenario(scenario);
  if (required.kind === 'grossSalary') {
    next.income = {
      ...next.income,
      grossAnnualSalary: required.annualAmount,
    };
  } else {
    next.income = {
      ...next.income,
      grossRevenue: required.annualAmount,
    };
  }
  return next;
}

/**
 * Plan-page results: full scenario result plus an optional reverse-solved
 * required gross/revenue when the goal is take-home.
 *
 * When the user has not entered income but a required solve is achievable,
 * the displayed `scenarioResult` is projected from that required amount so the
 * financial breakdown shows Income Tax, NI and take-home for the plan that
 * hits the goal. Entered income always wins over the projection.
 */
export function computePlanResults(scenario: GigGaugeScenario): PlanResults {
  const config = getTaxConfig(scenario.tax.taxYear, scenario.tax.region);
  if (!config.supported) {
    return { kind: 'regionUnsupported', reason: config.reason };
  }

  const enteredResult = computeScenarioResult(scenario);
  const summary = summariseExpenses(scenario.expenses, scenario.work);
  const incomeMissing = splitScenarioIncome(
    scenario.income,
    scenario.arrangementType,
  ).incomeMissing;

  let required: RequiredSolve | null = null;

  if (scenario.goal.type === 'takeHome' && scenario.goal.amount > 0) {
    const targetAnnualTakeHome = annualiseAmount(
      scenario.goal.amount,
      scenario.goal.period,
      scenario.work,
    );

    if (isEmployedOnly(scenario.arrangementType)) {
      const solved = solveRequiredGrossSalary(
        {
          targetAnnualTakeHome,
          annualWorkCosts: summary.totalCashCost,
          employeePensionContribution: scenario.income.employeePensionContribution,
          otherTaxableIncome: scenario.tax.otherTaxableIncome,
        },
        config.config,
      );
      required = solved.achievable
        ? {
            kind: 'grossSalary',
            annualAmount: solved.requiredAmount,
            breakdown: buildPeriodBreakdown(solved.requiredAmount, scenario.work),
            achievable: true,
          }
        : { achievable: false, reason: solved.reason };
    } else {
      const existingEmployment =
        (scenario.income.grossAnnualSalary ?? 0) + (scenario.income.bonuses ?? 0);
      const solved = solveRequiredRevenue(
        {
          targetAnnualTakeHome,
          annualDeductibleExpenses: summary.deductible,
          annualNonDeductibleExpenses: summary.nonDeductible,
          existingEmploymentGross: existingEmployment > 0 ? existingEmployment : undefined,
          employeePensionContribution: scenario.income.employeePensionContribution,
          otherTaxableIncome: scenario.tax.otherTaxableIncome,
        },
        config.config,
      );
      required = solved.achievable
        ? {
            kind: 'revenue',
            annualAmount: solved.requiredAmount,
            breakdown: buildPeriodBreakdown(solved.requiredAmount, scenario.work),
            achievable: true,
          }
        : { achievable: false, reason: solved.reason };
    }
  }

  if (incomeMissing && required?.achievable) {
    return {
      kind: 'ok',
      scenarioResult: computeScenarioResult(scenarioWithRequiredIncome(scenario, required)),
      required,
      projectedFromRequired: true,
    };
  }

  return {
    kind: 'ok',
    scenarioResult: enteredResult,
    required,
    projectedFromRequired: false,
  };
}

/**
 * Whether Home should show the results dashboard instead of the marketing empty state.
 * True when goal status is assessable, a required solve exists (achievable or not),
 * or the tax region is unsupported (so Scotland notices can surface on Home).
 */
export function shouldShowHomeDashboard(results: PlanResults): boolean {
  if (results.kind === 'regionUnsupported') {
    return true;
  }
  if (results.scenarioResult.goal.status !== 'insufficientData') {
    return true;
  }
  return results.required !== null;
}
