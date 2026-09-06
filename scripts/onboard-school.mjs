// Interactive onboarding for a new EduKe customer school.
//
// Prompts for the school's details and its principal's info, then creates:
//   - the school record
//   - an academic year with 3 terms (you pick which one is current)
//   - the principal's login (auth user + profile + staff record)
//
// After this runs, log in as the principal and use Settings → Academic Setup to add
// classes, streams, and subjects — this script only creates the school shell, not its
// academic structure, since that's specific to each school and easiest to do from the UI.
//
// Run with: node scripts/onboard-school.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";

config({ path: ".env.local" });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ask(question, fallback) {
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = await rl.question(`${question}${suffix}: `);
  return answer.trim() || fallback || "";
}

async function askChoice(question, choices, fallback) {
  console.log(`${question} (${choices.join(" / ")})`);
  const answer = await ask("Choice", fallback);
  if (!choices.includes(answer)) {
    console.log(`"${answer}" isn't one of the options — using "${fallback}".`);
    return fallback;
  }
  return answer;
}

function generatePassword() {
  return randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

async function main() {
  console.log("=== EduKe — New School Onboarding ===\n");

  console.log("--- School details ---");
  const schoolName = await ask("School name");
  if (!schoolName) {
    console.log("School name is required. Aborting.");
    process.exit(1);
  }
  const county = await ask("County", "Nairobi");
  const subCounty = await ask("Sub-county");
  const phone = await ask("School phone (e.g. +254700000000)");
  const email = await ask("School email");
  const schoolType = await askChoice("School type", ["Public", "Private", "Mission", "International"], "Private");
  const schoolLevel = await askChoice("School level", ["Primary", "Secondary", "Both"], "Secondary");
  const curriculum = await askChoice("Primary curriculum", ["CBC", "8-4-4"], "CBC");
  const boardingAnswer = await ask("Is this a boarding school? (yes/no)", "no");
  const isBoarding = boardingAnswer.toLowerCase().startsWith("y");

  console.log("\n--- Principal's details ---");
  const principalFirstName = await ask("Principal first name");
  const principalLastName = await ask("Principal last name");
  const principalEmail = await ask("Principal login email");
  const principalPhone = await ask("Principal phone (e.g. +254711000000)");

  if (!principalFirstName || !principalLastName || !principalEmail) {
    console.log("Principal first name, last name, and email are all required. Aborting.");
    process.exit(1);
  }

  console.log("\n--- Academic calendar ---");
  const yearInput = await ask("Academic year", String(new Date().getFullYear()));
  const year = Number(yearInput) || new Date().getFullYear();
  const currentTerm = await askChoice("Which term is currently active?", ["Term 1", "Term 2", "Term 3"], "Term 1");

  console.log("\nCreating school...");
  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({
      name: schoolName,
      county,
      sub_county: subCounty || null,
      phone: phone || null,
      email: email || null,
      school_type: schoolType,
      school_level: schoolLevel,
      curriculum,
      is_boarding: isBoarding,
      sms_sender_id: "EduKe",
    })
    .select()
    .single();

  if (schoolError) {
    console.error("Failed to create school:", schoolError.message);
    process.exit(1);
  }
  console.log(`School created: ${school.name} (${school.id})`);

  console.log("Setting up academic year and terms...");
  const { data: academicYear, error: yearError } = await admin
    .from("academic_years")
    .insert({ school_id: school.id, year, is_current: true })
    .select()
    .single();
  if (yearError) {
    console.error("Failed to create academic year:", yearError.message);
    process.exit(1);
  }

  for (const termNumber of ["Term 1", "Term 2", "Term 3"]) {
    await admin.from("terms").insert({
      academic_year_id: academicYear.id,
      term_number: termNumber,
      is_current: termNumber === currentTerm,
    });
  }
  console.log(`Academic year ${year} created with ${currentTerm} set as current.`);

  console.log("Creating principal's login...");
  const password = generatePassword();
  const { data: principalAuth, error: authError } = await admin.auth.admin.createUser({
    email: principalEmail,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error("Failed to create principal login:", authError.message);
    console.log("The school and academic calendar were still created — you can add the principal manually or re-run for a different email.");
    process.exit(1);
  }

  // The profile MUST be created before the staff row — staff.profile_id has a foreign key
  // to profiles(id), so creating staff first (as an earlier version of this script did)
  // fails with a foreign key violation. staff_id gets backfilled onto the profile afterward.
  const { error: profileError } = await admin.from("profiles").insert({
    id: principalAuth.user.id,
    school_id: school.id,
    role: "principal",
    first_name: principalFirstName,
    last_name: principalLastName,
    phone: principalPhone || null,
  });

  if (profileError) {
    console.error("Failed to create principal's profile:", profileError.message);
    process.exit(1);
  }

  const { data: principalStaff, error: staffError } = await admin
    .from("staff")
    .insert({
      school_id: school.id,
      profile_id: principalAuth.user.id,
      first_name: principalFirstName,
      last_name: principalLastName,
      phone: principalPhone || "+254700000000",
      role: "principal",
      department: "Administration",
      date_joined: new Date().toISOString().slice(0, 10),
      status: "Active",
    })
    .select()
    .single();

  if (staffError) {
    console.error("Failed to create principal's staff record:", staffError.message);
    process.exit(1);
  }

  const { error: backfillError } = await admin.from("profiles").update({ staff_id: principalStaff.id }).eq("id", principalAuth.user.id);
  if (backfillError) {
    console.error("Failed to link staff record back to profile:", backfillError.message);
    process.exit(1);
  }

  console.log("\n=== Onboarding complete ===");
  console.log(`School:    ${school.name}`);
  console.log(`School ID: ${school.id}`);
  console.log(`\nPrincipal login:`);
  console.log(`  Email:    ${principalEmail}`);
  console.log(`  Password: ${password}`);
  console.log(`\n⚠️  Send these credentials to the principal securely and ask them to change the`);
  console.log(`    password on first login. This script will not show the password again.`);
  console.log(`\nNext steps for the principal:`);
  console.log(`  1. Log in and go to Settings → Academic Setup to add classes, streams, and subjects.`);
  console.log(`  2. Add staff via the Staff page, and students via the Students page.`);
  console.log(`  3. Set the fee structure per class under Fees → Fee Structure.`);

  rl.close();
}

main().catch((err) => {
  console.error("Onboarding script crashed:", err);
  rl.close();
  process.exit(1);
});