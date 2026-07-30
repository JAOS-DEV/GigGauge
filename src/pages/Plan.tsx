import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import type {
  GigGaugeScenario,
  GoalPeriod,
  GoalType,
  WorkArrangementType,
} from '../calculations/types';
import {
  CheckboxField,
  DraftNumberField,
  SelectField,
  TextField,
} from '../components/FieldControls';
import { CostEditor } from '../components/plan/CostEditor';
import { PlanSection } from '../components/plan/PlanSection';
import { PlanResultsPanel } from '../components/plan/PlanResultsPanel';
import { prepareScenarioForDetailedPlan } from '../state/planHandoff';
import { EXAMPLE_COST_ID_PREFIX, QUICK_MAIN_COST_ID } from '../state/quickEstimateMapping';
import { useScenario } from '../state/useScenario';
import { goalPeriodValues } from '../state/quickEstimateMapping';

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  annual: 'Per year',
  monthly: 'Per calendar month',
  weekly: 'Per working week',
  daily: 'Per working day',
  hourly: 'Per working hour',
};

function moneyString(value: number | undefined): string {
  return value === undefined || value === 0 ? '' : String(value);
}

function parseMoney(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return undefined;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function Plan(): ReactElement {
  const { scenario, quickForm, setActiveState } = useScenario();
  const adoptedRef = useRef(false);

  // If the user opens Plan via nav/Home while Quick still owns example-* rows,
  // adopt them once so deletes cannot be resurrected by Quick remount.
  useEffect(() => {
    if (adoptedRef.current) {
      return;
    }
    const needsAdoption =
      scenario.expenses.some(
        (expense) =>
          expense.id.startsWith(EXAMPLE_COST_ID_PREFIX) || expense.id === QUICK_MAIN_COST_ID,
      ) || quickForm?.includeExampleCosts === true;
    if (!needsAdoption) {
      adoptedRef.current = true;
      return;
    }
    const prepared = prepareScenarioForDetailedPlan(scenario, quickForm);
    adoptedRef.current = true;
    setActiveState(prepared.scenario, prepared.quickForm);
  }, [scenario, quickForm, setActiveState]);

  const update = (next: GigGaugeScenario): void => {
    setActiveState(next, quickForm);
  };

  const weeksOff = useMemo(
    () => 52 - scenario.work.workingWeeksPerYear,
    [scenario.work.workingWeeksPerYear],
  );

  const arrangement = scenario.arrangementType;
  const showEmploymentIncome =
    arrangement === 'employed' || arrangement === 'hybrid' || arrangement === 'custom';
  const showSelfEmploymentIncome =
    arrangement === 'selfEmployed' ||
    arrangement === 'contractor' ||
    arrangement === 'gigPlatform' ||
    arrangement === 'hybrid' ||
    arrangement === 'custom';

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">Detailed plan</h1>
        <p className="mt-1 text-base text-slate-600">
          Edit every assumption. Costs from Quick estimate or examples appear as editable rows you
          can tweak or delete.
        </p>
      </header>

      <section aria-labelledby="plan-results-heading" className="flex flex-col gap-3">
        <h2 id="plan-results-heading" className="text-lg font-semibold text-blue-950">
          Results
        </h2>
        <PlanResultsPanel scenario={scenario} />
      </section>

      <PlanSection id="goal" title="Goal" defaultOpen>
        <TextField
          id="scenario-name"
          label="Scenario name"
          value={scenario.name}
          onChange={(event) => update({ ...scenario, name: event.target.value })}
        />
        <SelectField
          id="arrangementType"
          label="Work arrangement"
          value={scenario.arrangementType}
          onChange={(event) =>
            update({
              ...scenario,
              arrangementType: event.target.value as WorkArrangementType,
            })
          }
        >
          <option value="employed">Employed</option>
          <option value="selfEmployed">Self-employed</option>
          <option value="contractor">Contractor</option>
          <option value="gigPlatform">Gig or platform worker</option>
          <option value="hybrid">Hybrid employed plus side income</option>
          <option value="custom">Custom</option>
        </SelectField>
        <SelectField
          id="goalType"
          label="Goal type"
          value={scenario.goal.type}
          onChange={(event) =>
            update({
              ...scenario,
              goal: { ...scenario.goal, type: event.target.value as GoalType },
            })
          }
        >
          <option value="takeHome">Personal take-home</option>
          <option value="grossIncome">Gross income</option>
          <option value="profitBeforeTax">Profit before tax</option>
        </SelectField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            id="goalAmount"
            label="Goal amount (£)"
            inputMode="decimal"
            value={moneyString(scenario.goal.amount)}
            onChange={(event) => {
              const amount = parseMoney(event.target.value) ?? 0;
              update({ ...scenario, goal: { ...scenario.goal, amount } });
            }}
          />
          <SelectField
            id="goalPeriod"
            label="Goal period"
            value={scenario.goal.period}
            onChange={(event) =>
              update({
                ...scenario,
                goal: { ...scenario.goal, period: event.target.value as GoalPeriod },
              })
            }
          >
            {goalPeriodValues.map((period) => (
              <option key={period} value={period}>
                {PERIOD_LABELS[period]}
              </option>
            ))}
          </SelectField>
        </div>
      </PlanSection>

      <PlanSection id="work" title="Work pattern" defaultOpen>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DraftNumberField
            id="workingWeeks"
            label="Working weeks per year"
            value={scenario.work.workingWeeksPerYear}
            min={1}
            max={52}
            onCommit={(value) =>
              update({
                ...scenario,
                work: { ...scenario.work, workingWeeksPerYear: value },
              })
            }
          />
          <DraftNumberField
            id="workingDays"
            label="Working days per week"
            value={scenario.work.workingDaysPerWeek}
            min={1}
            max={7}
            onCommit={(value) =>
              update({
                ...scenario,
                work: { ...scenario.work, workingDaysPerWeek: value },
              })
            }
          />
          <DraftNumberField
            id="workingHours"
            label="Working hours per week"
            value={scenario.work.workingHoursPerWeek}
            min={0.01}
            max={168}
            integer={false}
            inputMode="decimal"
            onCommit={(value) =>
              update({
                ...scenario,
                work: { ...scenario.work, workingHoursPerWeek: value },
              })
            }
          />
        </div>
        <p className="text-sm text-slate-500">
          That leaves {weeksOff} {weeksOff === 1 ? 'week' : 'weeks'} off per year. Unpaid time off
          is mainly controlled by reducing working weeks.
        </p>
      </PlanSection>

      <PlanSection
        id="income"
        title="Income"
        defaultOpen
        help={
          <>
            <p>
              Optional. Enter earnings for the job or gig in this scenario (what you earn now, or
              expect to earn) so results can compare that income with your goal.
            </p>
            <p className="mt-2">
              To see only what you need to earn, leave Income empty and use the required salary or
              revenue figure above — that comes from your goal, work pattern and costs.
            </p>
            <p className="mt-2">
              Use gross figures (before tax). Gross revenue is total billed or platform payouts
              before business costs — not take-home. Optional payslip take-home replaces the tax
              estimate when filled. The platform-fees tick is for your notes only and does not
              change the maths; add fees as cost rows in Costs if you want them included.
            </p>
          </>
        }
      >
        {showEmploymentIncome ? (
          <div className="flex flex-col gap-3">
            <TextField
              id="grossSalary"
              label="Annual gross salary (£)"
              inputMode="decimal"
              value={moneyString(scenario.income.grossAnnualSalary)}
              onChange={(event) =>
                update({
                  ...scenario,
                  income: {
                    ...scenario.income,
                    grossAnnualSalary: parseMoney(event.target.value),
                  },
                })
              }
            />
            <TextField
              id="actualTakeHome"
              label="Actual annual take-home from payslip (£, optional)"
              inputMode="decimal"
              value={moneyString(scenario.income.actualAnnualTakeHome)}
              onChange={(event) =>
                update({
                  ...scenario,
                  income: {
                    ...scenario.income,
                    actualAnnualTakeHome: parseMoney(event.target.value),
                  },
                })
              }
            />
            <TextField
              id="bonuses"
              label="Annual bonuses (£)"
              inputMode="decimal"
              value={moneyString(scenario.income.bonuses)}
              onChange={(event) =>
                update({
                  ...scenario,
                  income: { ...scenario.income, bonuses: parseMoney(event.target.value) },
                })
              }
            />
            <TextField
              id="employeePension"
              label="Employee pension contribution (£ per year)"
              inputMode="decimal"
              value={moneyString(scenario.income.employeePensionContribution)}
              onChange={(event) =>
                update({
                  ...scenario,
                  income: {
                    ...scenario.income,
                    employeePensionContribution: parseMoney(event.target.value),
                  },
                })
              }
            />
          </div>
        ) : null}

        {showSelfEmploymentIncome ? (
          <div className="flex flex-col gap-3">
            <TextField
              id="grossRevenue"
              label="Annual gross revenue (£)"
              inputMode="decimal"
              value={moneyString(scenario.income.grossRevenue)}
              onChange={(event) =>
                update({
                  ...scenario,
                  income: { ...scenario.income, grossRevenue: parseMoney(event.target.value) },
                })
              }
            />
            <TextField
              id="tips"
              label="Tips or other income (£)"
              inputMode="decimal"
              value={moneyString(scenario.income.tips ?? scenario.income.otherIncome)}
              onChange={(event) =>
                update({
                  ...scenario,
                  income: { ...scenario.income, tips: parseMoney(event.target.value) },
                })
              }
            />
            <CheckboxField
              id="platformFees"
              label="Platform fees already deducted from the revenue entered"
              checked={scenario.income.platformFeesAlreadyDeducted ?? false}
              onChange={(event) =>
                update({
                  ...scenario,
                  income: {
                    ...scenario.income,
                    platformFeesAlreadyDeducted: event.target.checked,
                  },
                })
              }
            />
          </div>
        ) : null}
      </PlanSection>

      <PlanSection
        id="costs"
        title="Costs"
        defaultOpen
        help={
          <>
            <p>
              Work costs for this scenario (vehicle, fuel, platform fees, kit, and so on). Deductible
              rows reduce taxable profit; all cash costs reduce take-home.
            </p>
            <p className="mt-2">
              Add every work cost separately. Tick “Only paid during working weeks” on costs you can
              pause when you take time off (for example vehicle rental), and leave it unticked for
              year-round costs such as insurance.
            </p>
          </>
        }
      >
        <CostEditor
          expenses={scenario.expenses}
          workPattern={scenario.work}
          onChange={(expenses) => update({ ...scenario, expenses })}
        />
      </PlanSection>

      <PlanSection id="tax" title="Tax">
        <SelectField
          id="region"
          label="Where do you pay Income Tax?"
          value={scenario.tax.region}
          onChange={(event) =>
            update({
              ...scenario,
              tax: {
                ...scenario.tax,
                region: event.target.value as 'rUK' | 'scotland',
              },
            })
          }
        >
          <option value="rUK">England, Wales or Northern Ireland</option>
          <option value="scotland">Scotland</option>
        </SelectField>
        <TextField
          id="otherTaxable"
          label="Other taxable income (£ per year)"
          inputMode="decimal"
          value={moneyString(scenario.tax.otherTaxableIncome)}
          onChange={(event) =>
            update({
              ...scenario,
              tax: {
                ...scenario.tax,
                otherTaxableIncome: parseMoney(event.target.value) ?? 0,
              },
            })
          }
        />
        <CheckboxField
          id="studentLoan"
          label="I have a student loan (not included in this estimate)"
          checked={scenario.tax.studentLoanEnabled}
          onChange={(event) =>
            update({
              ...scenario,
              tax: { ...scenario.tax, studentLoanEnabled: event.target.checked },
            })
          }
        />
      </PlanSection>

      <PlanSection
        id="pension"
        title="Pension and retirement"
        help={
          <p>
            Self-employed retirement saving is treated as a post-tax allocation with no tax relief
            modelled. Employee pension on the Income section uses the salary-sacrifice
            simplification.
          </p>
        }
      >
        {showEmploymentIncome ? (
          <>
            <TextField
              id="employerPension"
              label="Employer pension value (£ per year)"
              inputMode="decimal"
              value={moneyString(scenario.employmentBenefits.employerPensionValue)}
              onChange={(event) =>
                update({
                  ...scenario,
                  employmentBenefits: {
                    ...scenario.employmentBenefits,
                    employerPensionValue: parseMoney(event.target.value) ?? 0,
                  },
                })
              }
            />
            <TextField
              id="otherBenefits"
              label="Other employer benefits (£ per year)"
              inputMode="decimal"
              value={moneyString(scenario.employmentBenefits.otherBenefitsValue)}
              onChange={(event) =>
                update({
                  ...scenario,
                  employmentBenefits: {
                    ...scenario.employmentBenefits,
                    otherBenefitsValue: parseMoney(event.target.value) ?? 0,
                  },
                })
              }
            />
          </>
        ) : null}
        <TextField
          id="retirementSaving"
          label="Annual retirement saving from take-home (£)"
          inputMode="decimal"
          value={moneyString(scenario.personal.annualRetirementSaving)}
          onChange={(event) =>
            update({
              ...scenario,
              personal: {
                ...scenario.personal,
                annualRetirementSaving: parseMoney(event.target.value) ?? 0,
              },
            })
          }
        />
      </PlanSection>

      <PlanSection
        id="leave"
        title="Leave"
        help={
          <p>
            Unpaid leave is mainly reflected by lowering working weeks in Work pattern. Paid leave is
            one reason employed income differs from an equivalent self-employed weekly rate.
          </p>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DraftNumberField
            id="paidHoliday"
            label="Paid holiday days"
            value={scenario.work.paidHolidayDays}
            min={0}
            max={365}
            onCommit={(value) =>
              update({
                ...scenario,
                work: { ...scenario.work, paidHolidayDays: value },
              })
            }
          />
          <DraftNumberField
            id="paidSick"
            label="Paid sick days"
            value={scenario.work.paidSickDays}
            min={0}
            max={365}
            onCommit={(value) =>
              update({
                ...scenario,
                work: { ...scenario.work, paidSickDays: value },
              })
            }
          />
        </div>
      </PlanSection>

      <PlanSection id="savings" title="Savings goals">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            id="emergencyTarget"
            label="Emergency fund target (£)"
            inputMode="decimal"
            value={moneyString(scenario.personal.emergencyFundTarget)}
            onChange={(event) =>
              update({
                ...scenario,
                personal: {
                  ...scenario.personal,
                  emergencyFundTarget: parseMoney(event.target.value) ?? 0,
                },
              })
            }
          />
          <TextField
            id="emergencyCurrent"
            label="Current emergency savings (£)"
            inputMode="decimal"
            value={moneyString(scenario.personal.currentEmergencySavings)}
            onChange={(event) =>
              update({
                ...scenario,
                personal: {
                  ...scenario.personal,
                  currentEmergencySavings: parseMoney(event.target.value) ?? 0,
                },
              })
            }
          />
          <TextField
            id="travelTarget"
            label="Travel fund target (£)"
            inputMode="decimal"
            value={moneyString(scenario.personal.travelFundTarget)}
            onChange={(event) =>
              update({
                ...scenario,
                personal: {
                  ...scenario.personal,
                  travelFundTarget: parseMoney(event.target.value) ?? 0,
                },
              })
            }
          />
          <TextField
            id="travelCurrent"
            label="Current travel savings (£)"
            inputMode="decimal"
            value={moneyString(scenario.personal.currentTravelSavings)}
            onChange={(event) =>
              update({
                ...scenario,
                personal: {
                  ...scenario.personal,
                  currentTravelSavings: parseMoney(event.target.value) ?? 0,
                },
              })
            }
          />
        </div>
      </PlanSection>
    </main>
  );
}
