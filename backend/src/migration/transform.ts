import { DEFAULT_LEGACY_SYSTEM } from '../models/legacyProvenance.js';
import { STUDENT_CATEGORIES, STUDENT_GENDERS, STUDENT_SEMESTERS, STUDENT_YEARS } from '../data/studentMaster.js';
import type { IssueRow, LegacyRecord, TransformResult } from './types.js';
import { firstNumber, firstPresent, firstString, normalizeEmail, normalizeName, parseDateFlexible, unmappedFields } from './pick.js';
import { stripForbiddenPaymentFields, stripSensitiveFields } from './sensitive.js';
import { prepareMigratedPassword } from './password.js';
import { mapLegacyRole } from './roles.js';
import { mapInstituteStatus, mapInsuranceStatus, mapPaymentStatus, mapStudentStatus, mapUserStatus } from './status.js';

const ID_ALIASES = ['legacyId', 'id', 'Id', 'ID', 'pk'];

export function legacyIdOf(record: LegacyRecord, extra: string[] = []): string | null {
  return firstString(record, [...extra, ...ID_ALIASES]) ?? null;
}

function issue(
  entity: string,
  legacyId: string | null,
  classification: IssueRow['classification'],
  code: string,
  message: string
): IssueRow {
  return { entity, legacyId, classification, code, message };
}

function provenance(legacyId: string | null, usedKeys: string[], record: LegacyRecord, extraUsed: string[] = []) {
  return {
    legacyId,
    legacySource: 'authorized-export',
    legacySystem: DEFAULT_LEGACY_SYSTEM,
    migratedAt: new Date(),
    legacyUnmapped: unmappedFields(stripSensitiveFields(record), [...usedKeys, ...extraUsed, ...ID_ALIASES])
  };
}

export function transformUniversity(record: LegacyRecord): TransformResult {
  const used: string[] = [];
  const idField = firstPresent(record, ['legacyId', 'university_id', 'uni_id', 'universityId', 'id']);
  if (idField) used.push(idField.key);
  const nameField = firstPresent(record, ['name', 'university_name', 'universityName', 'University', 'uni_name']);
  if (nameField) used.push(nameField.key);
  const codeField = firstPresent(record, ['code', 'university_code', 'short_code']);
  if (codeField) used.push(codeField.key);
  const shortField = firstPresent(record, ['shortName', 'short_name']);
  if (shortField) used.push(shortField.key);
  const statusField = firstPresent(record, ['status']);
  if (statusField) used.push(statusField.key);

  const legacyId = idField?.value ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('university', null, 'FAILED', 'MISSING_LEGACY_ID', 'University has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  if (!nameField?.value) {
    issues.push(issue('university', legacyId, 'REVIEW_REQUIRED', 'MISSING_NAME', 'University name is missing'));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  const statusRaw = statusField?.value;
  const status = !statusRaw || ['active', '1'].includes(statusRaw.toLowerCase()) ? 'ACTIVE' : statusRaw.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : null;
  if (status === null) {
    issues.push(issue('university', legacyId, 'REVIEW_REQUIRED', 'UNKNOWN_STATUS', `Unknown university status "${statusRaw}"`));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  return {
    classification: 'VALID',
    legacyId,
    issues,
    usedKeys: used,
    document: {
      name: nameField.value,
      nameNormalized: normalizeName(nameField.value),
      code: codeField?.value?.toUpperCase() ?? null,
      shortName: shortField?.value ?? '',
      status,
      migrationClassification: 'VALID',
      ...provenance(legacyId, used, record)
    }
  };
}

export function transformInstitute(record: LegacyRecord, universityNewId: string | undefined): TransformResult {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'institute_id', 'inst_id', 'college_id', 'instituteId', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('institute', null, 'FAILED', 'MISSING_LEGACY_ID', 'Institute has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  const name = take(['name', 'institute_name', 'instituteName', 'college_name', 'Institute']);
  const email = normalizeEmail(take(['email', 'institute_email', 'college_email']));
  const address = take(['address', 'institute_address']);
  const district = take(['district']);
  const taluka = take(['taluka']);
  const jdRegion = take(['jdRegion', 'jd_region', 'JD Region']);
  const mobile = take(['mobile', 'mobile_no', 'phone']);
  const principalName = take(['principalName', 'principal_name', 'principal']);
  const collegeType = take(['collegeType', 'college_type']);
  const uniLegacy = take(['university_id', 'uni_id', 'universityId', 'legacyUniversityId']);
  take(['exclusiveType', 'exclusive_type', 'Institute Type']);
  take(['locationType', 'location_type', 'Location Type']);
  take(['minorityType', 'minority_type', 'Minority Type']);
  take(['linguisticType', 'linguistic_type', 'Linguistic Type']);
  take(['contactNumber1', 'contact_number1', 'Contact Number1']);
  take(['contactNumber2', 'contact_number2', 'Contact Number2']);
  const statusRaw = take(['status']);

  const missing: string[] = [];
  if (!name) missing.push('name');
  if (!email) missing.push('email');
  if (!address) missing.push('address');
  if (!district) missing.push('district');
  if (!taluka) missing.push('taluka');
  if (!jdRegion) missing.push('jdRegion');
  if (!mobile) missing.push('mobile');
  if (!principalName) missing.push('principalName');
  if (!collegeType) missing.push('collegeType');
  if (!universityNewId) {
    issues.push(
      issue('institute', legacyId, 'REVIEW_REQUIRED', 'MISSING_PARENT', `Institute university mapping missing (legacy university ${uniLegacy || 'unknown'})`)
    );
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  if (missing.length) {
    issues.push(issue('institute', legacyId, 'REVIEW_REQUIRED', 'MISSING_FIELDS', `Missing required fields: ${missing.join(', ')}`));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  const mappedStatus = mapInstituteStatus(statusRaw);
  if (!mappedStatus.status) {
    issues.push(issue('institute', legacyId, 'REVIEW_REQUIRED', 'UNKNOWN_STATUS', mappedStatus.reason));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  if (mappedStatus.warning) {
    issues.push(issue('institute', legacyId, 'WARNING', 'STATUS_DEFAULT', mappedStatus.warning));
  }
  const classification = mappedStatus.warning ? 'WARNING' : 'VALID';
  return {
    classification,
    legacyId,
    issues,
    usedKeys: used,
    document: {
      universityId: universityNewId,
      name,
      nameNormalized: normalizeName(name!),
      code: take(['code', 'institute_code'])?.toUpperCase() ?? null,
      exclusiveType: firstString(record, ['exclusiveType', 'exclusive_type']) ?? '',
      locationType: firstString(record, ['locationType', 'location_type']) ?? '',
      minorityType: firstString(record, ['minorityType', 'minority_type']) ?? '',
      linguisticType: firstString(record, ['linguisticType', 'linguistic_type']) ?? '',
      address,
      district,
      taluka,
      jdRegion,
      email,
      mobile,
      contactNumber1: firstString(record, ['contactNumber1', 'contact_number1']) ?? '',
      contactNumber2: firstString(record, ['contactNumber2', 'contact_number2']) ?? '',
      principalName,
      collegeType,
      status: mappedStatus.status,
      migrationClassification: classification,
      ...provenance(legacyId, used, record)
    }
  };
}

export async function transformUser(
  record: LegacyRecord,
  refs: { instituteId?: string; universityId?: string }
): Promise<TransformResult> {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'user_id', 'userId', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('user', null, 'FAILED', 'MISSING_LEGACY_ID', 'User has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  const email = normalizeEmail(take(['email', 'user_email']));
  const name = take(['name', 'full_name', 'principalName', 'username']);
  const phone = take(['phone', 'mobile', 'mobile_no']);
  const roleRaw = take(['role', 'user_role', 'userType']);
  const statusRaw = take(['status']);
  take(['institute_id', 'inst_id', 'instituteId']);
  take(['university_id', 'uni_id', 'universityId']);
  const passwordPresent = firstPresent(record, ['password', 'password_hash', 'passwordHash', 'passwd']);
  if (passwordPresent) used.push(passwordPresent.key);

  if (!email) {
    issues.push(issue('user', legacyId, 'REVIEW_REQUIRED', 'MISSING_EMAIL', 'User email is missing or invalid'));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  if (!name) {
    issues.push(issue('user', legacyId, 'REVIEW_REQUIRED', 'MISSING_NAME', 'User name is missing'));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  const role = mapLegacyRole(roleRaw);
  if (!role.ok) {
    issues.push(issue('user', legacyId, 'REVIEW_REQUIRED', 'ROLE_UNMAPPED', role.reason));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  if (role.role === 'COLLEGE' && !refs.instituteId) {
    issues.push(issue('user', legacyId, 'REVIEW_REQUIRED', 'MISSING_INSTITUTE', 'COLLEGE user has no mapped institute'));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  const status = mapUserStatus(statusRaw);
  if (!status.status) {
    issues.push(issue('user', legacyId, 'REVIEW_REQUIRED', 'UNKNOWN_STATUS', status.reason));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  const prepared = await prepareMigratedPassword(passwordPresent?.value);
  if (prepared.passwordResetRequired) {
    issues.push(
      issue(
        'user',
        legacyId,
        'WARNING',
        'PASSWORD_RESET_REQUIRED',
        `Legacy password algorithm ${prepared.algorithm} is not copied; password reset required`
      )
    );
  }
  if (role.warning) {
    issues.push(issue('user', legacyId, 'WARNING', 'ROLE_GENERIC', role.warning));
  }
  const classification = prepared.passwordResetRequired || role.warning || status.warning ? 'WARNING' : 'VALID';
  if (status.warning) {
    issues.push(issue('user', legacyId, 'WARNING', 'STATUS_DEFAULT', status.warning));
  }
  return {
    classification,
    legacyId,
    issues,
    usedKeys: used,
    document: {
      name,
      email,
      phone,
      role: role.role,
      status: status.status,
      instituteId: role.role === 'ADMIN' ? null : refs.instituteId ?? null,
      universityId: refs.universityId ?? null,
      passwordHash: prepared.passwordHash,
      passwordResetRequired: prepared.passwordResetRequired,
      legacyPasswordAlgorithm: prepared.algorithm,
      migrationClassification: classification,
      ...provenance(legacyId, used, record)
    }
  };
}

function mapGender(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (['m', 'male'].includes(value)) return 'Male';
  if (['f', 'female'].includes(value)) return 'Female';
  if (['o', 'other'].includes(value)) return 'Other';
  return (STUDENT_GENDERS as readonly string[]).includes(raw) ? raw : null;
}

function mapYear(raw: string | undefined): string | null {
  if (!raw) return null;
  const compact = raw.trim().toLowerCase();
  const mapped: Record<string, string> = {
    '1': 'First Year',
    fy: 'First Year',
    'first year': 'First Year',
    firstyear: 'First Year',
    '2': 'Second Year',
    sy: 'Second Year',
    'second year': 'Second Year',
    '3': 'Third Year',
    ty: 'Third Year',
    'third year': 'Third Year',
    '4': 'Fourth Year',
    'fourth year': 'Fourth Year'
  };
  if (mapped[compact]) return mapped[compact];
  return (STUDENT_YEARS as readonly string[]).includes(raw) ? raw : null;
}

export function transformStudent(
  record: LegacyRecord,
  refs: { instituteId?: string; universityId?: string }
): TransformResult {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'id', 'stud_id', 'student_pk', 'student_id']) ?? take(['studentId', 'student_code']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('student', null, 'FAILED', 'MISSING_LEGACY_ID', 'Student has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  if (!refs.instituteId || !refs.universityId) {
    issues.push(issue('student', legacyId, 'REVIEW_REQUIRED', 'MISSING_PARENT', 'Student institute/university mapping is missing'));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  const studentId = take(['studentId', 'student_code', 'college_student_id']) || legacyId;
  const enrollmentNumber = take(['enrollmentNumber', 'enrollment_no', 'enrollment', 'enrolment_no']);
  const rollNumber = take(['rollNumber', 'roll_no', 'roll']);
  const firstName = take(['firstName', 'first_name', 'fname']);
  const lastName = take(['lastName', 'last_name', 'lname']);
  const middleName = take(['middleName', 'middle_name']) ?? '';
  const gender = mapGender(take(['gender', 'sex']));
  const dobRaw = take(['dateOfBirth', 'dob', 'date_of_birth']);
  const mobile = take(['mobile', 'mobile_no', 'phone']);
  const email = normalizeEmail(take(['email'])) ?? '';
  const course = take(['course']);
  const stream = take(['stream']) ?? '';
  const year = mapYear(take(['year', 'class_year']));
  const semesterRaw = take(['semester']);
  const academicYear = take(['academicYear', 'academic_year', 'year_of_study']);
  const address = take(['address']) ?? '';
  const parentName = take(['parentName', 'parent_name']) ?? '';
  const parentMobile = take(['parentMobile', 'parent_mobile']) ?? '';
  const categoryRaw = take(['category']);
  const statusRaw = take(['status']);
  take(['institute_id', 'inst_id', 'instituteId']);
  take(['university_id', 'uni_id']);

  const missing: string[] = [];
  if (!studentId) missing.push('studentId');
  if (!enrollmentNumber) missing.push('enrollmentNumber');
  if (!rollNumber) missing.push('rollNumber');
  if (!firstName) missing.push('firstName');
  if (!lastName) missing.push('lastName');
  if (!gender) missing.push('gender');
  if (!mobile) missing.push('mobile');
  if (!course) missing.push('course');
  if (!year) missing.push('year');
  if (!academicYear) missing.push('academicYear');
  const dob = parseDateFlexible(dobRaw);
  if (!dob.date) missing.push('dateOfBirth');
  if (dob.ambiguous) {
    issues.push(issue('student', legacyId, 'WARNING', 'AMBIGUOUS_DATE', 'Date of birth parsed with an ambiguous format'));
  }
  if (missing.length) {
    issues.push(issue('student', legacyId, 'REVIEW_REQUIRED', 'MISSING_FIELDS', `Missing required fields: ${missing.join(', ')}`));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  if (semesterRaw && !(STUDENT_SEMESTERS as readonly string[]).includes(semesterRaw) && semesterRaw !== '') {
    issues.push(issue('student', legacyId, 'REVIEW_REQUIRED', 'UNKNOWN_SEMESTER', `Unknown semester "${semesterRaw}"`));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  if (categoryRaw && !(STUDENT_CATEGORIES as readonly string[]).includes(categoryRaw) && categoryRaw !== '') {
    issues.push(issue('student', legacyId, 'REVIEW_REQUIRED', 'UNKNOWN_CATEGORY', `Unknown category "${categoryRaw}"`));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  const status = mapStudentStatus(statusRaw);
  if (!status.status) {
    issues.push(issue('student', legacyId, 'REVIEW_REQUIRED', 'UNKNOWN_STATUS', status.reason));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  if (status.warning) issues.push(issue('student', legacyId, 'WARNING', 'STATUS_DEFAULT', status.warning));
  const classification = issues.some((row) => row.classification === 'WARNING') ? 'WARNING' : 'VALID';
  return {
    classification,
    legacyId,
    issues,
    usedKeys: used,
    document: {
      instituteId: refs.instituteId,
      universityId: refs.universityId,
      studentId,
      enrollmentNumber,
      rollNumber,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth: dob.date,
      mobile,
      email,
      course,
      stream,
      year,
      semester: semesterRaw && (STUDENT_SEMESTERS as readonly string[]).includes(semesterRaw) ? semesterRaw : '',
      academicYear,
      address,
      parentName,
      parentMobile,
      category: categoryRaw && (STUDENT_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : '',
      status: status.status,
      migrationClassification: classification,
      ...provenance(legacyId, used, record)
    }
  };
}

export function transformInsurance(record: LegacyRecord, refs: { studentId?: string; instituteId?: string; universityId?: string }): TransformResult {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'insurance_id', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('insurance', null, 'FAILED', 'MISSING_LEGACY_ID', 'Insurance record has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  if (!refs.studentId) {
    issues.push(issue('insurance', legacyId, 'REVIEW_REQUIRED', 'MISSING_STUDENT', 'Insurance student mapping is missing'));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  const mapped = mapInsuranceStatus(take(['status']));
  if (mapped.review) {
    issues.push(issue('insurance', legacyId, 'WARNING', 'STATUS_UNVERIFIED', 'Insurance status stored as-is or UNKNOWN; official mapping not verified'));
  }
  const policyNumber = take(['policyNumber', 'policy_no', 'policy_number']);
  const insurer = take(['insurer', 'insurance_company']);
  const premium = firstNumber(record, ['premium', 'premium_amount']);
  const coverage = take(['coverage']);
  const start = parseDateFlexible(take(['startDate', 'start_date', 'from_date']));
  const end = parseDateFlexible(take(['endDate', 'end_date', 'to_date']));
  take(['student_id', 'stud_id', 'institute_id']);
  const classification = issues.length ? 'WARNING' : 'VALID';
  return {
    classification,
    legacyId,
    issues,
    usedKeys: used,
    document: {
      studentId: refs.studentId,
      instituteId: refs.instituteId ?? null,
      universityId: refs.universityId ?? null,
      status: mapped.status,
      policyNumber: policyNumber || null,
      insurer: insurer || null,
      premium: premium ?? null,
      coverage: coverage || null,
      startDate: start.date,
      endDate: end.date,
      academicYear: take(['academicYear', 'academic_year']) ?? '',
      migrationClassification: classification,
      ...provenance(legacyId, used, record)
    }
  };
}

export function transformDocument(record: LegacyRecord, refs: { studentId?: string; instituteId?: string }): TransformResult {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'document_id', 'file_id', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('document', null, 'FAILED', 'MISSING_LEGACY_ID', 'Document has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  const legacyPath = take(['legacyPath', 'path', 'file_path', 'url', 'file']);
  if (!legacyPath) {
    issues.push(issue('document', legacyId, 'FAILED', 'FILE_MIGRATION_FAILED', 'Missing legacy path/reference'));
    return {
      classification: 'FAILED',
      legacyId,
      issues,
      usedKeys: used,
      document: {
        ownerType: 'UNKNOWN',
        studentId: refs.studentId ?? null,
        instituteId: refs.instituteId ?? null,
        documentType: take(['documentType', 'type', 'doc_type']) ?? '',
        originalFilename: take(['originalFilename', 'filename', 'name']) ?? '',
        mimeType: take(['mimeType', 'mime']) ?? '',
        sizeBytes: firstNumber(record, ['sizeBytes', 'size', 'file_size']) ?? null,
        sha256: null,
        storageKey: null,
        legacyPath: null,
        uploadedAt: parseDateFlexible(take(['uploadedAt', 'created_at', 'upload_date'])).date,
        fileStatus: 'FILE_MIGRATION_FAILED',
        failureReason: 'Missing legacy path/reference',
        migrationClassification: 'FAILED',
        ...provenance(legacyId, used, record)
      }
    };
  }
  return {
    classification: 'VALID',
    legacyId,
    issues,
    usedKeys: used,
    document: {
      ownerType: (take(['ownerType']) as 'STUDENT' | undefined) || (refs.studentId ? 'STUDENT' : refs.instituteId ? 'INSTITUTE' : 'UNKNOWN'),
      studentId: refs.studentId ?? null,
      instituteId: refs.instituteId ?? null,
      documentType: take(['documentType', 'type', 'doc_type']) ?? '',
      originalFilename: take(['originalFilename', 'filename', 'name']) ?? '',
      mimeType: take(['mimeType', 'mime']) ?? '',
      sizeBytes: firstNumber(record, ['sizeBytes', 'size', 'file_size']) ?? null,
      sha256: take(['sha256', 'checksum']) ?? null,
      storageKey: null,
      legacyPath,
      uploadedAt: parseDateFlexible(take(['uploadedAt', 'created_at'])).date,
      fileStatus: 'PENDING_COPY',
      failureReason: null,
      migrationClassification: 'VALID',
      ...provenance(legacyId, used, record)
    }
  };
}

export function transformPayment(record: LegacyRecord, refs: { studentId?: string; instituteId?: string; insuranceId?: string }): TransformResult {
  const cleaned = stripForbiddenPaymentFields(record);
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(cleaned, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'payment_id', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('payment', null, 'FAILED', 'MISSING_LEGACY_ID', 'Payment has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  const mapped = mapPaymentStatus(take(['status', 'payment_status']));
  if (mapped.review) {
    issues.push(issue('payment', legacyId, 'WARNING', 'STATUS_UNVERIFIED', 'Payment status mapping is unverified'));
  }
  const classification = issues.length ? 'WARNING' : 'VALID';
  return {
    classification,
    legacyId,
    issues,
    usedKeys: used,
    document: {
      studentId: refs.studentId ?? null,
      instituteId: refs.instituteId ?? null,
      insuranceId: refs.insuranceId ?? null,
      amount: firstNumber(cleaned, ['amount', 'paid_amount', 'txn_amount']) ?? null,
      currency: take(['currency']) ?? 'INR',
      status: mapped.status,
      paidAt: parseDateFlexible(take(['paidAt', 'payment_date', 'txn_date'])).date,
      gateway: take(['gateway', 'payment_gateway']) ?? null,
      gatewayReference: take(['gatewayReference', 'txn_id', 'transaction_id', 'reference']) ?? null,
      verificationInfo: take(['verificationInfo', 'verify_status']) ?? null,
      migrationClassification: classification,
      ...provenance(legacyId, used, cleaned)
    }
  };
}

export function transformReview(record: LegacyRecord, refs: { entityId?: string; instituteId?: string; studentId?: string; reviewerId?: string }): TransformResult {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'review_id', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('review', null, 'FAILED', 'MISSING_LEGACY_ID', 'Review has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  return {
    classification: 'VALID',
    legacyId,
    issues,
    usedKeys: used,
    document: {
      entityType: take(['entityType', 'entity_type', 'type']) ?? 'UNKNOWN',
      entityId: refs.entityId ?? null,
      instituteId: refs.instituteId ?? null,
      studentId: refs.studentId ?? null,
      reviewerId: refs.reviewerId ?? null,
      reviewerLegacyId: take(['reviewer_id', 'reviewerLegacyId']) ?? null,
      reviewedAt: parseDateFlexible(take(['reviewedAt', 'review_date', 'created_at'])).date,
      status: take(['status']) ?? 'UNKNOWN',
      comments: take(['comments', 'comment', 'remark']) ?? '',
      rejectionReason: take(['rejectionReason', 'reject_reason']) ?? '',
      correctionRequest: take(['correctionRequest', 'correction']) ?? '',
      migratedHistorical: true,
      migrationClassification: 'VALID',
      ...provenance(legacyId, used, record)
    }
  };
}

export function transformEcard(record: LegacyRecord, refs: { studentId?: string; instituteId?: string; documentId?: string }): TransformResult {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'ecard_id', 'e_card_id', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('ecard', null, 'FAILED', 'MISSING_LEGACY_ID', 'E-card has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  if (!refs.studentId) {
    issues.push(issue('ecard', legacyId, 'REVIEW_REQUIRED', 'MISSING_STUDENT', 'E-card student mapping is missing'));
    return { classification: 'REVIEW_REQUIRED', document: null, legacyId, issues, usedKeys: used };
  }
  return {
    classification: 'VALID',
    legacyId,
    issues,
    usedKeys: used,
    document: {
      studentId: refs.studentId,
      instituteId: refs.instituteId ?? null,
      documentId: refs.documentId ?? null,
      issuedAt: parseDateFlexible(take(['issuedAt', 'issue_date'])).date,
      status: take(['status']) ?? 'UNKNOWN',
      historicalFile: true,
      migrationClassification: 'VALID',
      ...provenance(legacyId, used, record)
    }
  };
}

export function transformEnrollment(record: LegacyRecord, refs: { studentId?: string; instituteId?: string; universityId?: string }): TransformResult {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'enrollment_id', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('enrollment', null, 'FAILED', 'MISSING_LEGACY_ID', 'Enrollment has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  return {
    classification: refs.studentId ? 'VALID' : 'REVIEW_REQUIRED',
    legacyId,
    issues: refs.studentId
      ? []
      : [issue('enrollment', legacyId, 'REVIEW_REQUIRED', 'MISSING_STUDENT', 'Enrollment student mapping is missing')],
    usedKeys: used,
    document: refs.studentId
      ? {
          studentId: refs.studentId,
          instituteId: refs.instituteId ?? null,
          universityId: refs.universityId ?? null,
          academicYear: take(['academicYear', 'academic_year']) ?? '',
          enrollmentType: take(['enrollmentType', 'type']) ?? '',
          status: take(['status']) ?? 'UNKNOWN',
          submittedAt: parseDateFlexible(take(['submittedAt', 'created_at'])).date,
          migrationClassification: 'VALID',
          ...provenance(legacyId, used, record)
        }
      : null
  };
}

export function transformNotification(record: LegacyRecord, refs: { userId?: string; instituteId?: string }): TransformResult {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'notification_id', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('notification', null, 'FAILED', 'MISSING_LEGACY_ID', 'Notification has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  return {
    classification: 'VALID',
    legacyId,
    issues,
    usedKeys: used,
    document: {
      userId: refs.userId ?? null,
      instituteId: refs.instituteId ?? null,
      title: take(['title']) ?? '',
      body: take(['body', 'message']) ?? '',
      readAt: parseDateFlexible(take(['readAt', 'read_at'])).date,
      sentAt: parseDateFlexible(take(['sentAt', 'created_at'])).date,
      migrationClassification: 'VALID',
      ...provenance(legacyId, used, record)
    }
  };
}

export function transformAudit(record: LegacyRecord, refs: { userId?: string }): TransformResult {
  const used: string[] = [];
  const take = (aliases: string[]) => {
    const found = firstPresent(record, aliases);
    if (found) used.push(found.key);
    return found?.value;
  };
  const legacyId = take(['legacyId', 'audit_id', 'id']) ?? null;
  const issues: IssueRow[] = [];
  if (!legacyId) {
    issues.push(issue('audit', null, 'FAILED', 'MISSING_LEGACY_ID', 'Audit record has no legacy identifier'));
    return { classification: 'FAILED', document: null, legacyId: null, issues, usedKeys: used };
  }
  return {
    classification: 'VALID',
    legacyId,
    issues,
    usedKeys: used,
    document: {
      userId: refs.userId ?? null,
      action: take(['action']) ?? 'MIGRATED_HISTORICAL',
      entity: take(['entity']) ?? 'Unknown',
      entityId: take(['entityId', 'entity_id']) ?? null,
      ipAddress: take(['ipAddress', 'ip']) ?? null,
      userAgent: take(['userAgent']) ?? null,
      metadata: { migratedHistorical: true },
      migratedHistorical: true,
      migrationClassification: 'VALID',
      ...provenance(legacyId, used, stripSensitiveFields(record))
    }
  };
}

export { firstString };
