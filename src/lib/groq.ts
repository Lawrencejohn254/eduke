// EduKe AI Teaching Assistant — Groq wrapper.
// If GROQ_API_KEY is not set (or is the placeholder), falls back to a realistic mock
// so the app is fully demoable before real keys are wired in.

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

type ChatMessage = { role: "system" | "user"; content: string };

interface GroqCallOptions {
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
}

export class GroqRateLimitError extends Error {}
export class GroqError extends Error {}

function hasRealKey() {
  const key = process.env.GROQ_API_KEY;
  return Boolean(key && key !== "your_groq_api_key_from_console.groq.com");
}

async function callGroq({ messages, temperature, max_tokens }: GroqCallOptions): Promise<string> {
  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens,
    }),
  });

  if (res.status === 429) {
    throw new GroqRateLimitError("Too many requests. Please wait a moment and try again.");
  }
  if (!res.ok) {
    throw new GroqError("Generation failed. You can still write it manually.");
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

const LESSON_PLAN_SYSTEM = `
You are an expert Kenyan curriculum specialist and experienced teacher trainer.

You prepare professional lesson plans suitable for Kenyan schools and appropriate to the requested curriculum.

You understand CBC curriculum terminology and Kenyan classroom realities.

CONTENT RULES:
- Use realistic classroom activities.
- Use locally available teaching and learning resources.
- Make learning outcomes measurable.
- Ensure teacher activities and learner activities are practical.
- Use appropriate assessment methods.
- Keep the lesson plan professional and ready for teacher or HOD review.
- Do not invent official curriculum codes, strand codes, or learning outcome codes when uncertain.

STRICT FORMATTING RULES:

Return clean plain text only.

DO NOT use Markdown.
DO NOT use **bold** formatting.
DO NOT use *italic* formatting.
DO NOT use # headings.
DO NOT use Markdown tables.
DO NOT use pipe characters |.
DO NOT use HTML.
DO NOT use <br>.
DO NOT use HTML entities.
DO NOT use code blocks.
DO NOT use backticks.

Use clear numbered sections.

Follow EXACTLY this structure:

LESSON PLAN

1. GENERAL INFORMATION

Subject:
Class/Grade:
Stream:
Term:
Week:
Date:
Duration:
Curriculum:

2. TOPIC

3. SUB-TOPIC

4. SPECIFIC LEARNING OUTCOMES

By the end of the lesson, the learner should be able to:

1.
2.
3.

5. KEY COMPETENCIES

6. CORE VALUES

7. LEARNING RESOURCES AND MATERIALS

8. INTRODUCTION AND LESSON PREPARATION

Time: 5 minutes

Teacher Activities:
- 

Learner Activities:
- 

9. LESSON DEVELOPMENT

Time: 25 minutes

Step 1:
Teacher Activities:
- 

Learner Activities:
- 

Step 2:
Teacher Activities:
- 

Learner Activities:
- 

Step 3:
Teacher Activities:
- 

Learner Activities:
- 

10. CONCLUSION

Time: 5 minutes

Teacher Activities:
- 

Learner Activities:
- 

11. ASSESSMENT

12. REFLECTION AND SELF-EVALUATION

13. REFERENCES

Return only the completed lesson plan.
`;

export async function generateLessonPlan(input: {
  subject: string;
  klass: string;
  stream: string;
  term: string;
  weekNumber: number;
  topic: string;
  subtopic?: string;
  curriculumType: string;
  additionalContext?: string;
}): Promise<string> {
  if (!hasRealKey()) return mockLessonPlan(input);

  const userMsg = `
Generate a complete detailed lesson plan using the exact format specified in the system instructions.

Subject: ${input.subject}
Class/Grade: ${input.klass}
Stream: ${input.stream}
Term: ${input.term}
Week: ${input.weekNumber}
Topic: ${input.topic}
Sub-topic: ${input.subtopic ?? "Not specified"}
Curriculum: ${input.curriculumType}
Additional Context: ${input.additionalContext?.trim() || "None"}

Requirements:
- Make the lesson appropriate for the specified class level.
- Use measurable learning outcomes.
- Include realistic teacher and learner activities.
- Use Kenyan school context where relevant.
- Use locally available resources.
- Include practical formative assessment.
- Keep the format clean and professional.
- Do not use Markdown, HTML, or pipe-based tables.

Return only the completed lesson plan.
`;

  return callGroq({
    messages: [
      { role: "system", content: LESSON_PLAN_SYSTEM },
      { role: "user", content: userMsg },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });
}

const SCHEME_SYSTEM = `
You are an expert Kenyan curriculum specialist experienced in preparing professional schemes of work for Kenyan schools.

Generate a complete and academically appropriate 13-week scheme of work based on the subject, class, term, year, curriculum, and notes provided.

CURRICULUM RULES:
- Follow the requested curriculum framework.
- Do not invent official KICD codes, learning outcome codes, strands, or sub-strands if you are uncertain.
- Use curriculum terminology appropriate to the requested subject and level.
- Progress content logically from simple concepts to more complex concepts.
- Week 13 should normally be reserved for revision and assessment unless otherwise instructed.
- Use realistic Kenyan school resources and classroom activities.
- Keep learning objectives measurable and practical.

STRICT FORMATTING RULES:

Return clean plain text only.

DO NOT use Markdown.
DO NOT use bold formatting such as **text**.
DO NOT use italic formatting such as *text*.
DO NOT use Markdown tables.
DO NOT use pipe characters |.
DO NOT use HTML tags such as <br>.
DO NOT use HTML entities.
DO NOT use code blocks.
DO NOT use backticks.
DO NOT add introductory text.
DO NOT add concluding explanations.

IMPORTANT:
Since Markdown tables are not allowed, format each week as a clearly structured block.

Use EXACTLY this format:

SCHEME OF WORK

SUBJECT: [Subject]
CLASS/GRADE: [Class]
TERM: [Term]
YEAR: [Year]
CURRICULUM: [Curriculum]

WEEK 1

TOPIC:
[Topic]

SUB-TOPIC:
[Sub-topic]

LEARNING OBJECTIVES:
1. [Objective]
2. [Objective]

LEARNING ACTIVITIES:
- [Activity]
- [Activity]

RESOURCES:
- [Resource]
- [Resource]

ASSESSMENT:
- [Assessment method]

REMARKS:
[Relevant curriculum information]

---

WEEK 2

TOPIC:
[Topic]

SUB-TOPIC:
[Sub-topic]

LEARNING OBJECTIVES:
1. [Objective]
2. [Objective]

LEARNING ACTIVITIES:
- [Activity]
- [Activity]

RESOURCES:
- [Resource]

ASSESSMENT:
- [Assessment method]

REMARKS:
[Relevant curriculum information]

---

Continue this exact structure until WEEK 13.

Use --- only to separate weeks.

Return only the scheme of work.
`;

export async function generateSchemeOfWork(input: {
  subject: string;
  klass: string;
  term: string;
  year: string;
  curriculumType: string;
  notes?: string;
}): Promise<string> {
  if (!hasRealKey()) return mockSchemeOfWork(input);

  const userMsg = `
Generate a complete 13-week Scheme of Work.

Subject: ${input.subject}
Class/Grade: ${input.klass}
Term: ${input.term}
Year: ${input.year}
Curriculum: ${input.curriculumType}
Additional Notes: ${input.notes?.trim() || "None"}

Follow the exact plain-text structure specified in the system instructions.

Requirements:
- Generate exactly 13 weeks.
- Ensure logical progression of learning.
- Make objectives measurable.
- Use realistic Kenyan classroom activities.
- Use locally available resources where possible.
- Include practical assessment methods.
- Keep each week's content concise and professional.
- Do not use Markdown or HTML.
- Do not use tables made with pipe characters.
- Do not invent official curriculum codes if uncertain.

Return only the completed Scheme of Work.
`;

  return callGroq({
    messages: [
      { role: "system", content: SCHEME_SYSTEM },
      { role: "user", content: userMsg },
    ],
    temperature: 0.4,
    max_tokens: 3000,
  });
}

const EXAM_SYSTEM = `
You are an experienced Kenyan examiner with expertise in setting high-quality examination questions for primary and secondary school students.

You understand Kenyan school examinations, CBC Summative Assessments, KCSE-style assessments, and school-based CATs.

Generate academically correct, age-appropriate questions using clear language suitable for the specified class level.

Use Kenyan context only where it naturally improves the question. Do not force Kenyan towns, names, crops, or currency into every question.

QUESTION QUALITY RULES:
- Questions must test understanding, application, analysis, and problem-solving where appropriate.
- Ensure all calculations and answers are mathematically correct.
- Marks allocated must match the amount of work required.
- Structured questions may contain parts (a), (b), (c).
- MCQs must have exactly four options: A, B, C, D.
- Only one MCQ answer must be correct.
- True/False questions must be clear and unambiguous.
- Provide a complete answer and marking scheme for every question.

STRICT OUTPUT RULES:

Return CLEAN PLAIN TEXT ONLY.

DO NOT use Markdown.
DO NOT use bold formatting such as **text**.
DO NOT use italic formatting.
DO NOT use headings with # symbols.
DO NOT use Markdown tables.
DO NOT use pipe characters | to create tables.
DO NOT use HTML tags such as <br>.
DO NOT use HTML entities such as &#x20;.
DO NOT use code blocks or triple backticks.
DO NOT use LaTeX commands such as \\frac, \\times, \\sqrt, \\left, or \\right.
DO NOT wrap the response in quotation marks.
DO NOT add introductory text such as "Here are the questions".
DO NOT add concluding comments.

Use normal plain-text mathematical notation:
- Fractions: 1/2, 3/4, 5/8
- Multiplication: ×
- Division: ÷
- Square: x²
- Square root: √
- Degrees: °
- Percentages: 25%

IMPORTANT:
Do not create tables in the response. If data would normally be presented in a table, write it as a simple list instead.

Every question MUST follow EXACTLY this format:

QUESTION 1
TYPE: Structured
DIFFICULTY: Medium
MARKS: 5

[Question text]

(a) Question part
(b) Question part
(c) Question part

ANSWER:
[Clear model answer]

MARKING SCHEME:
(a) Description of marking point - X marks
(b) Description of marking point - X marks
(c) Description of marking point - X marks

---

QUESTION 2
TYPE: Short Answer
DIFFICULTY: Easy
MARKS: 5

[Question text]

ANSWER:
[Clear model answer]

MARKING SCHEME:
1. Marking point - X marks
2. Marking point - X marks

---

Use exactly three dashes (---) to separate questions.

The separator --- must appear only between complete questions.

Return only the questions in the specified format.
`;

const INSIGHT_SYSTEM = `You are an analytics assistant embedded in EduKe, a Kenyan school management system. You are given real, pre-computed data from the school's database (never invent numbers not present in the data) and a question from a staff member. Answer the question directly and concisely using ONLY the data provided, in plain conversational language suitable for a busy school administrator. Reference specific names, percentages, and amounts from the data. If the data provided doesn't contain enough information to answer the question, say so honestly rather than guessing. Keep answers to 3-6 sentences unless the question asks for a list, in which case use a short bulleted list. Do not repeat the raw data verbatim — synthesize an answer from it.`;

export async function generateInsight(input: {
  question: string;
  dataContext: string;
  roleLabel: string;
}): Promise<string> {
  if (!hasRealKey()) return mockInsight(input);

  const userMsg = `Role asking: ${input.roleLabel}\n\nData available:\n${input.dataContext}\n\nQuestion: ${input.question}`;

  return callGroq({
    messages: [
      { role: "system", content: INSIGHT_SYSTEM },
      { role: "user", content: userMsg },
    ],
    temperature: 0.4,
    max_tokens: 700,
  });
}

const COMMUNICATION_SYSTEM = `You are a communications assistant for a Kenyan school administrator using EduKe. Draft a short, warm, professional SMS/announcement message given the target audience and a brief description of what it's about. Keep it under 300 characters where possible (SMS-friendly), in clear plain English, with a respectful tone appropriate for parents/guardians in Kenya. Do not include placeholder brackets like [Name] — write it generically enough to apply to the whole audience. Output ONLY the message text, nothing else — no preamble, no quotation marks around it.`;

export async function generateCommunicationDraft(input: {
  targetLabel: string;
  hint: string;
}): Promise<string> {
  if (!hasRealKey()) return mockCommunicationDraft(input);

  const userMsg = `Audience: ${input.targetLabel}\nWhat this message is about: ${input.hint}`;

  return callGroq({
    messages: [
      { role: "system", content: COMMUNICATION_SYSTEM },
      { role: "user", content: userMsg },
    ],
    temperature: 0.6,
    max_tokens: 300,
  });
}

export async function generateExamQuestions(input: {
  numberOfQuestions: number;
  subject: string;
  klass: string;
  topic: string;
  types: string[];
  difficulty: string;
  marksPerQuestion?: number;
  instructions?: string;
}): Promise<string> {
  if (!hasRealKey()) return mockExamQuestions(input);

  const userMsg = `
Generate exactly ${input.numberOfQuestions} examination question(s).

Subject: ${input.subject}
Class: ${input.klass}
Topic: ${input.topic}
Question Types: ${input.types.join(", ")}
Difficulty: ${input.difficulty}
Marks per Question: ${input.marksPerQuestion ?? 5}
Special Instructions: ${input.instructions?.trim() || "None"}

IMPORTANT:

Follow the exact output format provided in the system instructions.

Each question must:
- Be complete and academically correct.
- Match the requested class level.
- Match the requested topic.
- Match the requested marks.
- Include a complete answer.
- Include a marking scheme.

If difficulty is "Mixed", assign each individual question one of:
Easy
Medium
Hard

Do not use "Mixed" as the difficulty label for an individual question.

Do not use Markdown, HTML, tables, code blocks, or LaTeX.

Return exactly ${input.numberOfQuestions} questions and nothing else.
`;

  return callGroq({
    messages: [
      { role: "system", content: EXAM_SYSTEM },
      { role: "user", content: userMsg },
    ],
    temperature: 0.5,
    max_tokens: 3000,
  });
}

// ---------- Mocks (used when GROQ_API_KEY is not configured) ----------

function mockLessonPlan(input: {
  subject: string; klass: string; stream: string; term: string; weekNumber: number;
  topic: string; subtopic?: string; curriculumType: string;
}): string {
  return `[DEMO CONTENT — connect GROQ_API_KEY to generate real AI lesson plans]

1. SUBJECT, CLASS, TERM, WEEK, DATE, DURATION
Subject: ${input.subject} | Class: ${input.klass} Stream ${input.stream} | ${input.term} | Week ${input.weekNumber} | Duration: 40 minutes

2. TOPIC AND SUBTOPIC
Topic: ${input.topic}
Subtopic: ${input.subtopic || "N/A"}

3. SPECIFIC LEARNING OUTCOMES
By the end of the lesson, the learner should be able to:
a) Define key terms related to ${input.topic}.
b) Explain the main concepts of ${input.topic} using local examples.
c) Apply the concept of ${input.topic} to solve a simple, real-life problem.

4. KEY COMPETENCIES (CBC)
Communication and collaboration, critical thinking and problem solving.

5. CORE VALUES (CBC)
Responsibility, respect, unity.

6. LEARNING RESOURCES AND MATERIALS
Locally available materials: manila paper, chalkboard, textbook, realia from the local environment.

7. INTRODUCTION (5 minutes)
Review previous knowledge through a short question-and-answer session linked to ${input.topic}.

8. LESSON DEVELOPMENT (25 minutes)
Step 1: Teacher introduces ${input.topic} using a relatable Kenyan example.
Step 2: Learners work in groups to discuss guiding questions.
Step 3: Groups present findings; teacher clarifies misconceptions.

9. CONCLUSION (5 minutes)
Summarise the key points and link them to the next lesson.

10. ASSESSMENT
Oral questions and a short written exercise on ${input.topic}.

11. REFLECTION
Space for the teacher to note what worked and what to improve next time.

12. REFERENCES
KICD curriculum design / approved course textbook for ${input.subject}, ${input.curriculumType}.`;
}

function mockSchemeOfWork(input: { subject: string; klass: string; term: string; year: string }): string {
  const rows = Array.from({ length: 13 }, (_, i) => {
    const week = i + 1;
    if (week === 13) {
      return `| ${week} | Revision & Examination | - | Consolidate term's work | Timed practice papers | Past papers | Written exam | - |`;
    }
    return `| ${week} | ${input.subject} Topic ${week} | Sub-topic ${week} | Learners explain and apply key concepts | Group discussion, guided practice | Textbook, locally available materials | Oral questions, written work | - |`;
  }).join("\n");

  return `[DEMO CONTENT — connect GROQ_API_KEY to generate real AI schemes of work]

SCHEME OF WORK — ${input.subject} | ${input.klass} | ${input.term} ${input.year}

| Week | Topic | Subtopic | Learning Objectives | Learning Activities | Resources | Assessment | Remarks |
|---|---|---|---|---|---|---|---|
${rows}`;
}

function mockExamQuestions(input: { numberOfQuestions: number; subject: string; klass: string; topic: string; types: string[]; difficulty: string; marksPerQuestion?: number }): string {
  const marks = input.marksPerQuestion ?? 5;
  const type = input.types[0] ?? "Structured";
  return Array.from({ length: input.numberOfQuestions }, (_, i) => {
    const n = i + 1;
    if (type === "MCQ") {
      return `QUESTION ${n} (${marks} marks) - MCQ - ${input.difficulty}
Which of the following best relates to ${input.topic} in ${input.subject}?
A) Option relevant to a Kenyan town example
B) A distractor option
C) A distractor option
D) A distractor option
ANSWER/MARKING SCHEME: A — [DEMO CONTENT — connect GROQ_API_KEY for real generated questions]
---`;
    }
    return `QUESTION ${n} (${marks} marks) - ${type} - ${input.difficulty}
Explain how ${input.topic} applies in a real-life Kenyan context relevant to ${input.klass} ${input.subject}.
(a) Define the key term. (2 marks)
(b) Give one local example. (2 marks)
(c) State one implication of this concept. (1 mark)
ANSWER/MARKING SCHEME: [DEMO CONTENT — connect GROQ_API_KEY for real marking scheme]
---`;
  }).join("\n\n");
}

function mockInsight(input: { question: string; dataContext: string; roleLabel: string }): string {
  return `[DEMO CONTENT — connect GROQ_API_KEY for real AI-generated insights]\n\nBased on the data available for your ${input.roleLabel} view, here's a summary relevant to "${input.question}":\n\n${input.dataContext.split("\n").slice(0, 6).join("\n")}\n\n(This is a demo summary — with a real Groq key, this would be a natural-language answer synthesized specifically from the numbers above.)`;
}

function mockCommunicationDraft(input: { targetLabel: string; hint: string }): string {
  return `[DEMO CONTENT — connect GROQ_API_KEY for a real AI-drafted message]\n\nDear parent/guardian, this is a message regarding: ${input.hint}. Please contact the school office for more details. Thank you. — ${input.targetLabel}`;
}
