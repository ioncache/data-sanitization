import { PatternEntry } from './types';

/**
 * Field-name patterns for credentials commonly present in any application
 * that performs authentication or calls external APIs.
 */
const credentialPatterns: PatternEntry[] = [
  'apikey',
  'api_key',
  'password',
  'secret',
  'token',
];

/**
 * Field-name patterns for HTTP headers that carry authentication or
 * API-key material. Substring matching covers common variants:
 * `authorization` matches `x-authorization` and `proxy-authorization`;
 * `api-key` matches `x-api-key`.
 */
const headerPatterns: PatternEntry[] = ['authorization', 'api-key'];

/**
 * Field-name patterns for Personally Identifiable Information (PII).
 * Opt-in — not included in `defaultPatterns`. Single-word terms that
 * would produce false positives as substrings use `strict: true`.
 */
const piiPatterns: PatternEntry[] = [
  // Names
  'first_name',
  'last_name',
  'middle_name',
  'full_name',
  'date_of_birth',
  'dob',
  'birth_date',
  // Contact
  'email',
  'phone',
  'mobile',
  // Address — single-word terms use strict to avoid false positives
  // (e.g. 'email_address', 'ip_address')
  { match: 'address', strict: true },
  'street_address',
  'address_line',
  'postal_code',
  { match: 'city', strict: true },
  { match: 'state', strict: true },
  { match: 'zip', strict: true },
  // Government IDs
  'ssn',
  'social_security',
  'social_insurance_number',
  'national_id',
  'passport',
  'drivers_license',
  'tax_id',
  // Digital identifiers (GDPR-relevant)
  'ip_address',
];

/**
 * Field-name patterns for Protected Health Information (PHI) under HIPAA.
 * Opt-in — not included in `defaultPatterns`.
 */
const phiPatterns: PatternEntry[] = [
  // Medical record identifiers
  'mrn',
  'medical_record_number',
  'patient_id',
  'chart_number',
  'member_id',
  'beneficiary_id',
  'subscriber_id',
  'insurance_id',
  'claim_number',
  'encounter_id',
  // Healthcare-specific dates
  'admission_date',
  'discharge_date',
  'service_date',
  'appointment_date',
  'death_date',
  // Clinical data
  'diagnosis_code',
  'diagnosis',
  'condition',
  'medication',
  'prescription',
  'procedure_code',
  // Provider / facility
  'provider_npi',
  'provider_id',
  // Biometrics
  'fingerprint',
  'biometric_id',
];

/**
 * The default set of field-name patterns applied when no options override
 * them. Covers credentials and common authentication headers. PII and PHI
 * patterns are opt-in via `piiPatterns` and `phiPatterns`.
 */
const defaultPatterns: PatternEntry[] = [
  ...credentialPatterns,
  ...headerPatterns,
];

/**
 * A default mask used when replacing string field values.
 */
const DEFAULT_PATTERN_MASK = '**********';

/**
 * A default mask used when replacing number field values.
 */
const DEFAULT_NUMERIC_MASK = 9999999999;

export {
  credentialPatterns,
  defaultPatterns,
  headerPatterns,
  phiPatterns,
  piiPatterns,
  DEFAULT_NUMERIC_MASK,
  DEFAULT_PATTERN_MASK,
};
