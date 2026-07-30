import type { GigGaugeScenario } from '../calculations/types';
import { createDefaultScenario } from './defaultScenario';
import { createDefaultQuickFormValues, type QuickEstimateFormValues } from './quickEstimateMapping';

export type QuickExampleId = 'employedJob' | 'privateHire';

export interface QuickExample {
  id: QuickExampleId;
  title: string;
  description: string;
  formValues: QuickEstimateFormValues;
  /** Base scenario carrying fields the quick form does not ask about. */
  baseScenario: GigGaugeScenario;
}

/**
 * Optional example datasets from the product brief. These are illustrative
 * starting points only — every value is editable and labelled as an example.
 */
export function getQuickExample(id: QuickExampleId): QuickExample {
  if (id === 'employedJob') {
    const base = createDefaultScenario();
    base.work.paidHolidayDays = 28;
    return {
      id,
      title: 'Current employed job',
      description:
        'An employed role with £35,722.44 annual take-home, 44 paid hours a week and 28 days of paid holiday.',
      baseScenario: base,
      formValues: {
        ...createDefaultQuickFormValues(),
        scenarioName: 'Example: Current employed job',
        arrangementType: 'employed',
        targetAmount: '35722.44',
        targetPeriod: 'annual',
        workingWeeks: '52',
        workingDays: '5',
        workingHours: '44',
        includeExampleCosts: false,
        expectedIncomeAmount: '35722.44',
        expectedIncomePeriod: 'annual',
      },
    };
  }

  return {
    id,
    title: 'Private-hire driving plan',
    description:
      'A gig-platform plan targeting £40,000 take-home over 39 working weeks, with example vehicle and running costs.',
    baseScenario: createDefaultScenario(),
    formValues: {
      ...createDefaultQuickFormValues(),
      scenarioName: 'Example: Private-hire driving plan',
      arrangementType: 'gigPlatform',
      targetAmount: '40000',
      targetPeriod: 'annual',
      workingWeeks: '39',
      workingDays: '6',
      workingHours: '50',
      mainCostName: 'Vehicle rental',
      mainCostAmount: '280',
      mainCostFrequency: 'weekly',
      mainCostActiveOnly: true,
      includeExampleCosts: true,
      exampleSet: 'privateHire',
    },
  };
}

export function parseQuickExampleId(value: string | null): QuickExampleId | null {
  return value === 'employedJob' || value === 'privateHire' ? value : null;
}
