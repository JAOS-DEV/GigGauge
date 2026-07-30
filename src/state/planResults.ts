import type { GigGaugeScenario, ScenarioResult, WorkArrangementType } from '../calculations/types';
import {
  annualiseAmount,
  buildPeriodBreakdown,
  type PeriodBreakdown,
} from '../calculations/periods';
import { summariseExpenses } from '../calculations/expenses';
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
    };

function isEmployedOnly(type: WorkArrangementType): boolean {
  return type === 'employed';
}

/**
 * Plan-page results: full scenario result plus an optional reverse-solved
 * required gross/revenue when the goal is take-home.
 */
export function computePlanResults(scenario: GigGaugeScenario): PlanResults {
  const config = getTaxConfig(scenario.tax.taxYear, scenario.tax.region);
  if (!config.supported) {
    return { kind: 'regionUnsupported', reason: config.reason };
  }

  const scenarioResult = computeScenarioResult(scenario);
  const summary = summariseExpenses(scenario.expenses, scenario.work);

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

  return { kind: 'ok', scenarioResult, required };
}
