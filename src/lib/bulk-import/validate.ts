import { isValid as isValidDate, parse as parseDateFns, isFuture } from "date-fns";
import {
  ACCEPTED_GENDERS,
  ACCEPTED_RELATIONSHIPS,
  type ClassOption,
  type NormalizedStudentRow,
  type RawImportRow,
  type StreamOption,
  type ValidatedImportRow,
} from "./types";

export type ValidationContext = {
  classes: ClassOption[];
  streams: StreamOption[];
  // Admission numbers already present in the DB (any school — the column has a global
  // unique constraint), lower-cased for case-insensitive comparison.
  existingAdmissionNumbers: Set<string>;
  // (first name + last name + dob) signatures already present in the DB for this school,
  // used only for a soft "possible duplicate" warning, never a hard error.
  existingNameDobSignatures: Set<string>;
};

const KENYAN_PHONE_RE = /^(?:\+?254|0)?[71]\d{8}$/;

function normalize(value: string | undefined | null): string {
  return String(value ?? "").trim();
}

function nameDobSignature(firstName: string, lastName: string, dob: string | null): string {
  return `${firstName.toLowerCase()}|${lastName.toLowerCase()}|${dob ?? ""}`;
}

function parseDob(raw: string): { iso: string | null; error: string | null } {
  const value = normalize(raw);
  if (!value) return { iso: null, error: null };

  // Already ISO (from a Date cell serialized by the parser, or the user typed YYYY-MM-DD)
  const isoCandidate = value.slice(0, 10);
  const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "MM/dd/yyyy", "dd-MM-yyyy"];
  for (const fmt of formats) {
    const parsed = parseDateFns(fmt === "yyyy-MM-dd" ? isoCandidate : value, fmt, new Date());
    if (isValidDate(parsed)) {
      if (isFuture(parsed)) return { iso: null, error: "Date of Birth cannot be in the future." };
      const age = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age > 30) return { iso: null, error: "Date of Birth looks implausible (over 30 years ago)." };
      return { iso: parsed.toISOString().slice(0, 10), error: null };
    }
  }
  return { iso: null, error: `Date of Birth "${value}" is not a recognizable date (use YYYY-MM-DD).` };
}

function findClassByName(classes: ClassOption[], name: string): ClassOption | undefined {
  const target = normalize(name).toLowerCase();
  return classes.find((c) => c.name.trim().toLowerCase() === target);
}

function findStreamByName(streams: StreamOption[], classId: string, name: string): StreamOption | undefined {
  const target = normalize(name).toLowerCase();
  return streams.find((s) => s.classId === classId && s.name.trim().toLowerCase() === target);
}

/**
 * Validates one spreadsheet row against required fields, accepted value lists, the school's
 * actual classes/streams, and duplicate rules. Mutates nothing — `seenAdmissionNumbers` /
 * `seenNameDobSignatures` are passed in so the caller can accumulate them across rows to
 * catch duplicates *within* the uploaded file, not just against the database.
 */
export function validateRow(
  rowNumber: number,
  raw: RawImportRow,
  context: ValidationContext,
  seenAdmissionNumbers: Map<string, number>,
  seenNameDobSignatures: Map<string, number>
): ValidatedImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const firstName = normalize(raw["First Name"]);
  const lastName = normalize(raw["Last Name"]);
  const admissionNumber = normalize(raw["Admission Number"]);
  const genderRaw = normalize(raw["Gender"]);
  const className = normalize(raw["Class"]);
  const streamName = normalize(raw["Stream"]);
  const kcpeIndex = normalize(raw["KCPE Index"]) || null;
  const nemisId = normalize(raw["NEMIS Number"]) || null;
  const previousSchool = normalize(raw["Previous School"]) || null;
  const guardianName = normalize(raw["Guardian Full Name"]) || null;
  const guardianPhoneRaw = normalize(raw["Guardian Phone"]);
  const guardianRelationshipRaw = normalize(raw["Guardian Relationship"]) || null;

  if (!firstName) errors.push("First Name is required.");
  if (!lastName) errors.push("Last Name is required.");
  if (!admissionNumber) errors.push("Admission Number is required.");
  if (!genderRaw) errors.push("Gender is required.");
  if (!className) errors.push("Class is required.");
  if (!streamName) errors.push("Stream is required.");

  // Gender
  const gender = ACCEPTED_GENDERS.find((g) => g.toLowerCase() === genderRaw.toLowerCase());
  if (genderRaw && !gender) {
    errors.push(`Gender "${genderRaw}" is not valid. Accepted values: ${ACCEPTED_GENDERS.join(", ")}.`);
  }

  // Class / Stream
  let matchedClass: ClassOption | undefined;
  let matchedStream: StreamOption | undefined;
  if (className) {
    matchedClass = findClassByName(context.classes, className);
    if (!matchedClass) {
      errors.push(`Class "${className}" does not exist for this school. See the Class & Stream Reference sheet.`);
    }
  }
  if (streamName && matchedClass) {
    matchedStream = findStreamByName(context.streams, matchedClass.id, streamName);
    if (!matchedStream) {
      errors.push(`Stream "${streamName}" does not belong to class "${matchedClass.name}" (or doesn't exist).`);
    }
  }

  // Admission number: format-free, but must be unique in-file and in the DB
  if (admissionNumber) {
    const key = admissionNumber.toLowerCase();
    const firstSeenAt = seenAdmissionNumbers.get(key);
    if (firstSeenAt !== undefined) {
      errors.push(`Admission Number "${admissionNumber}" is duplicated in this file (also row ${firstSeenAt}).`);
    } else {
      seenAdmissionNumbers.set(key, rowNumber);
    }
    if (context.existingAdmissionNumbers.has(key)) {
      errors.push(`Admission Number "${admissionNumber}" already exists in the system.`);
    }
  }

  // Date of birth
  const { iso: dateOfBirth, error: dobError } = parseDob(raw["Date of Birth"]);
  if (dobError) errors.push(dobError);

  // Possible duplicate person (soft warning, doesn't block import) — same name + DOB,
  // either elsewhere in this file or already in the database.
  if (firstName && lastName) {
    const sig = nameDobSignature(firstName, lastName, dateOfBirth);
    const firstSeenAt = seenNameDobSignatures.get(sig);
    if (firstSeenAt !== undefined) {
      warnings.push(`Possible duplicate: same name and date of birth as row ${firstSeenAt}.`);
    } else {
      seenNameDobSignatures.set(sig, rowNumber);
    }
    if (context.existingNameDobSignatures.has(sig)) {
      warnings.push("Possible duplicate: a student with this name and date of birth already exists.");
    }
  }

  // Guardian block: all-or-nothing-ish — phone is required if a name is given, and vice versa,
  // since student_guardians needs both to create a usable link.
  let guardianPhone: string | null = null;
  if (guardianName || guardianPhoneRaw) {
    if (!guardianName) errors.push("Guardian Full Name is required when Guardian Phone is provided.");
    if (!guardianPhoneRaw) errors.push("Guardian Phone is required when Guardian Full Name is provided.");
    if (guardianPhoneRaw) {
      const compact = guardianPhoneRaw.replace(/[\s-]/g, "");
      if (!KENYAN_PHONE_RE.test(compact)) {
        errors.push(`Guardian Phone "${guardianPhoneRaw}" doesn't look like a valid phone number (e.g. 0722000000).`);
      } else {
        guardianPhone = compact;
      }
    }
    if (guardianRelationshipRaw) {
      const matches = ACCEPTED_RELATIONSHIPS.some(
        (r) => r.toLowerCase() === guardianRelationshipRaw.toLowerCase()
      );
      if (!matches) {
        errors.push(
          `Guardian Relationship "${guardianRelationshipRaw}" is not valid. Accepted values: ${ACCEPTED_RELATIONSHIPS.join(", ")}.`
        );
      }
    }
  }

  const guardianRelationship = guardianRelationshipRaw
    ? ACCEPTED_RELATIONSHIPS.find((r) => r.toLowerCase() === guardianRelationshipRaw.toLowerCase()) ?? null
    : null;

  const data: NormalizedStudentRow | null =
    errors.length === 0 && gender && matchedClass && matchedStream
      ? {
          rowNumber,
          admissionNumber,
          firstName,
          lastName,
          gender,
          classId: matchedClass.id,
          className: matchedClass.name,
          streamId: matchedStream.id,
          streamName: matchedStream.name,
          dateOfBirth,
          kcpeIndex,
          nemisId,
          previousSchool,
          guardianName,
          guardianPhone,
          guardianRelationship,
        }
      : null;

  return { rowNumber, raw, data, errors, warnings };
}
