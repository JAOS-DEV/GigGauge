import type { GigGaugeScenario, GoalStatus, ResultNote, ScenarioResult } from './types';
import { parseOrThrow, scenarioSchema } from './validation';
import { annualiseAmount, buildPeriodBreakdown } from './periods';
import { summariseExpenses } from './expenses';
import { calculateBusinessProfit, splitScenarioIncome } from './income';
import { getTaxConfig } from './tax/taxConfig';
import { calculateEmploymentTax } from './tax/ukEmploymentTax';
import { calculateSelfEmploymentTax } from './tax/ukSelfEmploymentTax';
import { calculateCombinedTax } from './tax/combinedIncomeTax';

/**
 * A surplus below this fraction of the target counts as narrowly achieved;
 * at or above it counts as comfortably achieved.
 */
export const NARROW_ACHIEVEMENT_MARGIN = 0.05;

interface TaxOutcome {
  incomeTax: number;
  nationalInsurance: number;
  total: number;
  effectiveRate: number;
  /** Cash after tax but before non-deductible work costs. */
  netAfterTax: number;
}

/**
 * Computes the full result model for a scenario.
 *
 * Take-home here means the personal cash actually kept: after Income Tax,
 * National Insurance, pension deduction and ALL work costs. This makes
 * employed and self-employed scenarios comparable on a like-for-like basis.
 *
 * For employed arrangements every expense (deductible or not) is treated as
 * a personal cash cost with no tax relief, because employees cannot deduct
 * work costs from salary. For self-employed arrangements deductible expenses
 * reduce taxable profit; non-deductible costs only reduce cash.
 */
export function computeScenarioResult(scenario: GigGaugeScenario): ScenarioResult {
  const parsed = parseOrThrow(scenarioSchema, scenario, 'scenario');

  const pattern = parsed.work;
  const notes: ResultNote[] = [];
  if (parsed.tax.studentLoanEnabled) {
    notes.push('studentLoansNotIncluded');
  }

  const expenseSummary = summariseExpenses(parsed.expenses, pattern);
  const split = splitScenarioIncome(parsed.income, parsed.arrangementType);
  const isEmployedOnly = parsed.arrangementType === 'employed';
  const pension = parsed.income.employeePensionContribution ?? 0;
  const otherTaxable = parsed.tax.otherTaxableIncome;

  // Profit before tax: business profit for revenue-based work, adjusted
  // (gross) employment income for employed-only scenarios.
  let profitBeforeTax: number;
  let businessLoss = 0;
  if (isEmployedOnly) {
    profitBeforeTax = split.employmentGross;
  } else {
    const profitResult = calculateBusinessProfit(split.revenue, expenseSummary.deductible);
    profitBeforeTax = profitResult.businessProfit;
    businessLoss = profitResult.businessLoss;
    if (businessLoss > 0) {
      notes.push('businessLoss');
    }
  }

  const configResult = getTaxConfig(parsed.tax.taxYear, parsed.tax.region);
  const actualTakeHome = parsed.income.actualAnnualTakeHome;

  let taxOutcome: TaxOutcome | undefined;
  let takeHome = 0;
  let insufficient = split.incomeMissing;

  if (actualTakeHome !== undefined) {
    // Higher-confidence path: the user knows their real after-tax figure.
    notes.push('takeHomeProvidedDirectly');
    taxOutcome = {
      incomeTax: 0,
      nationalInsurance: 0,
      total: 0,
      effectiveRate: 0,
      netAfterTax: actualTakeHome,
    };
    takeHome = actualTakeHome - expenseSummary.totalCashCost;
  } else if (!configResult.supported) {
    notes.push('taxRegionUnsupported');
    insufficient = true;
  } else if (!split.incomeMissing) {
    const config = configResult.config;
    if (isEmployedOnly) {
      const tax = calculateEmploymentTax(
        {
          grossSalary: split.employmentGross,
          employeePensionContribution: Math.min(pension, split.employmentGross),
          otherTaxableIncome: otherTaxable,
        },
        config,
      );
      taxOutcome = {
        incomeTax: tax.incomeTax,
        nationalInsurance: tax.nationalInsurance,
        total: tax.totalTax,
        effectiveRate: tax.effectiveRate,
        netAfterTax: tax.takeHome,
      };
      takeHome = tax.takeHome - expenseSummary.totalCashCost;
    } else if (split.employmentGross > 0) {
      const tax = calculateCombinedTax(
        {
          grossSalary: split.employmentGross,
          employeePensionContribution: Math.min(pension, split.employmentGross),
          selfEmployedProfit: profitBeforeTax,
          otherTaxableIncome: otherTaxable,
        },
        config,
      );
      taxOutcome = {
        incomeTax: tax.incomeTax,
        nationalInsurance: tax.nationalInsurance,
        total: tax.totalTax,
        effectiveRate: tax.effectiveRate,
        netAfterTax: tax.takeHome,
      };
      takeHome = tax.takeHome - expenseSummary.nonDeductible;
    } else {
      const tax = calculateSelfEmploymentTax(
        { profit: profitBeforeTax, otherTaxableIncome: otherTaxable },
        config,
      );
      taxOutcome = {
        incomeTax: tax.incomeTax,
        nationalInsurance: tax.class4NationalInsurance,
        total: tax.totalTax,
        effectiveRate: tax.effectiveRate,
        netAfterTax: tax.netAfterTax,
      };
      takeHome = tax.netAfterTax - expenseSummary.nonDeductible;
    }
  }

  // Goal evaluation.
  const goalAnnual = annualiseAmount(parsed.goal.amount, parsed.goal.period, pattern);
  const goalBreakdown = buildPeriodBreakdown(goalAnnual, pattern);

  let achievedValue: number | undefined;
  switch (parsed.goal.type) {
    case 'grossIncome':
      achievedValue = split.employmentGross + split.revenue;
      break;
    case 'profitBeforeTax':
      achievedValue = profitBeforeTax;
      break;
    case 'takeHome':
      achievedValue = takeHome;
      break;
    case 'matchScenario':
    case 'savingsTarget':
      // Requires comparison/savings context that arrives in later releases.
      notes.push('goalTypeNotYetSupported');
      achievedValue = undefined;
      break;
  }

  const goalDataMissing =
    achievedValue === undefined ||
    goalAnnual <= 0 ||
    insufficient ||
    (parsed.goal.type !== 'grossIncome' && taxOutcome === undefined);

  let status: GoalStatus;
  let difference = 0;
  if (goalDataMissing || achievedValue === undefined) {
    status = 'insufficientData';
  } else {
    difference = achievedValue - goalAnnual;
    if (difference < 0) {
      status = 'notAchieved';
    } else if (difference < NARROW_ACHIEVEMENT_MARGIN * goalAnnual) {
      status = 'narrowlyAchieved';
    } else {
      status = 'comfortablyAchieved';
    }
  }

  const takeHomeBreakdown = buildPeriodBreakdown(takeHome, pattern);
  const totalGross = split.employmentGross + split.revenue;

  return {
    annualGrossIncome: split.employmentGross,
    annualRevenue: split.revenue,
    periodTargets: {
      monthly: goalBreakdown.calendarMonthly,
      weekly: goalBreakdown.workingWeekly,
      daily: goalBreakdown.workingDaily,
      hourly: goalBreakdown.workingHourly,
    },
    expenses: {
      deductible: expenseSummary.deductible,
      nonDeductible: expenseSummary.nonDeductible,
      totalCashCost: expenseSummary.totalCashCost,
      breakdown: expenseSummary.breakdown,
    },
    profitBeforeTax,
    businessLoss,
    tax: {
      incomeTax: taxOutcome?.incomeTax ?? 0,
      nationalInsurance: taxOutcome?.nationalInsurance ?? 0,
      total: taxOutcome?.total ?? 0,
      effectiveRate: taxOutcome?.effectiveRate ?? 0,
    },
    takeHome,
    takeHomeAfterRetirementSaving: takeHome - parsed.personal.annualRetirementSaving,
    effective: {
      perCalendarMonth: takeHomeBreakdown.calendarMonthly,
      perWorkingWeek: takeHomeBreakdown.workingWeekly,
      perWorkingDay: takeHomeBreakdown.workingDaily,
      perWorkingHour: takeHomeBreakdown.workingHourly,
      expenseRatio: totalGross > 0 ? expenseSummary.totalCashCost / totalGross : 0,
    },
    goal: {
      amount: goalAnnual,
      difference,
      achieved: status === 'comfortablyAchieved' || status === 'narrowlyAchieved',
      status,
    },
    notes,
  };
}
