import { z } from 'zod';

export const companyEnrichmentAiSchema = z.object({
  name: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  annualRevenueAmount: z.number().nullable(),
  annualRevenueCurrencyCode: z.string().nullable(),
  addressStreet1: z.string().nullable(),
  addressCity: z.string().nullable(),
  addressState: z.string().nullable(),
  addressPostcode: z.string().nullable(),
  addressCountry: z.string().nullable(),
});

export type CompanyEnrichmentAiOutput = z.infer<
  typeof companyEnrichmentAiSchema
>;
