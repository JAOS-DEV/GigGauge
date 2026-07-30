/**
 * Core domain types for the GigGauge calculation engine.
 *
 * This module is pure TypeScript with no UI or React dependencies.
 */

export type WorkArrangementType =
  'employed' | 'selfEmployed' | 'contractor' | 'gigPlatform' | 'hybrid' | 'custom';

export type GoalType =
  'grossIncome' | 'profitBeforeTax' | 'takeHome' | 'matchScenario' | 'savingsTarget';

export type GoalPeriod = 'annual' | 'monthly' | 'weekly' | 'daily' | 'hourly';

export type ExpenseFrequency = 'weekly' | 'monthly' | 'annual';

export interface WorkExpense {
  id: string;
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
  /** When true the expense only applies during working weeks, not the full calendar year. */
  activeWorkingPeriodOnly: boolean;
  /** 0–100. Portion of the cost attributable to work rather than personal use. */
  businessUsePercentage: number;
  taxDeductible: boolean;
  category: string;
  notes?: string;
}

/** The subset of scenario data needed for period conversions. */
export interface WorkPattern {
  workingWeeksPerYear: number;
  workingDaysPerWeek: number;
  workingHoursPerWeek: number;
}

export interface ScenarioWork extends WorkPattern {
  paidHolidayDays: number;
  paidSickDays: number;
}

export interface ScenarioGoal {
  type: GoalType;
  period: GoalPeriod;
  amount: number;
  comparisonScenarioId?: string;
}

export interface ScenarioIncome {
  grossAnnualSalary?: number;
  grossRevenue?: number;
  /** Actual take-home from a payslip; used directly instead of estimated tax when present. */
  actualAnnualTakeHome?: number;
  bonuses?: number;
  tips?: number;
  otherIncome?: number;
  platformFeesAlreadyDeducted?: boolean;
  /** Annual employee pension contribution (salary-sacrifice simplification). */
  employeePensionContribution?: number;
}

export type TaxRegion = 'rUK' | 'scotland';

export interface ScenarioTax {
  country: 'UK';
  region: TaxRegion;
  taxYear: string;
  otherTaxableIncome: number;
  /**
   * Present in the schema for future use. Student loan repayments are NOT
   * included in any calculation; results carry a 'studentLoansNotIncluded'
   * note when this is enabled.
   */
  studentLoanEnabled: boolean;
}

export interface ScenarioEmploymentBenefits {
  employerPensionValue: number;
  otherBenefitsValue: number;
  annualCommutingCost: number;
}

export interface ScenarioPersonal {
  annualRetirementSaving: number;
  emergencyFundTarget: number;
  currentEmergencySavings: number;
  travelFundTarget: number;
  currentTravelSavings: number;
}

export interface GigGaugeScenario {
  schemaVersion: number;
  id: string;
  name: string;
  arrangementType: WorkArrangementType;
  goal: ScenarioGoal;
  work: ScenarioWork;
  income: ScenarioIncome;
  expenses: WorkExpense[];
  tax: ScenarioTax;
  employmentBenefits: ScenarioEmploymentBenefits;
  personal: ScenarioPersonal;
}

export type GoalStatus =
  'comfortablyAchieved' | 'narrowlyAchieved' | 'notAchieved' | 'insufficientData';

/**
 * Machine-readable notes attached to a result so the UI can explain
 * simplifications and unsupported areas without parsing free text.
 */
export type ResultNote =
  | 'studentLoansNotIncluded'
  | 'takeHomeProvidedDirectly'
  | 'goalTypeNotYetSupported'
  | 'taxRegionUnsupported'
  | 'businessLoss';

export interface ScenarioResult {
  /** Annual gross employment income (salary plus employment bonuses). */
  annualGrossIncome: number;
  /** Annual self-employed / gig revenue including tips and other business income. */
  annualRevenue: number;

  /** The goal amount expressed per period (monthly is calendar; weekly/daily/hourly are working periods). */
  periodTargets: {
    monthly: number;
    weekly: number;
    daily: number;
    hourly: number;
  };

  expenses: {
    deductible: number;
    nonDeductible: number;
    totalCashCost: number;
    breakdown: Record<string, number>;
  };

  /**
   * Self-employed: revenue minus deductible expenses (may be negative).
   * Employed: adjusted employment income (gross employment income).
   */
  profitBeforeTax: number;
  /** Positive magnitude of any business loss; 0 when profitable. */
  businessLoss: number;

  tax: {
    incomeTax: number;
    nationalInsurance: number;
    total: number;
    effectiveRate: number;
  };

  /**
   * Personal cash actually kept: after tax, National Insurance, pension
   * deduction and ALL work costs — comparable across arrangement types.
   */
  takeHome: number;
  takeHomeAfterRetirementSaving: number;

  effective: {
    perCalendarMonth: number;
    perWorkingWeek: number;
    perWorkingDay: number;
    perWorkingHour: number;
    /** Total cash costs as a fraction of gross income plus revenue (0 when no income). */
    expenseRatio: number;
  };

  goal: {
    /** The goal converted to an annual amount. */
    amount: number;
    /** Achieved value minus the annual goal amount. */
    difference: number;
    achieved: boolean;
    status: GoalStatus;
  };

  notes: ResultNote[];
}
