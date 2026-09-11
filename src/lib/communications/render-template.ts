type RecipientContext = {
  guardian_name?: string | null;
  student_name?: string | null;
  class_name?: string | null;
  stream_name?: string | null;
};

// Only these keys are ever pulled from client-supplied JSON. Anything else
// in templateVariables is ignored — this is the whitelist enforcing §14
// ("do not allow arbitrary database fields to be exposed through template variables").
export function renderTemplate(
  template: string,
  ctx: RecipientContext,
  schoolName: string,
  templateVariables: Record<string, unknown> = {}
): string {
  const meetingDate = typeof templateVariables.meeting_date === "string" ? templateVariables.meeting_date : "";
  const meetingTime = typeof templateVariables.meeting_time === "string" ? templateVariables.meeting_time : "";
  const venue = typeof templateVariables.venue === "string" ? templateVariables.venue : "";

  return template
    .replaceAll("{{guardian_name}}", ctx.guardian_name || "Guardian")
    .replaceAll("{{student_name}}", ctx.student_name || "the student")
    .replaceAll("{{school_name}}", schoolName || "")
    .replaceAll("{{class_name}}", ctx.class_name || "")
    .replaceAll("{{stream_name}}", ctx.stream_name || "")
    .replaceAll("{{meeting_date}}", meetingDate)
    .replaceAll("{{meeting_time}}", meetingTime)
    .replaceAll("{{venue}}", venue);
}