import { timingSafeEqual } from "node:crypto";

export type QuestionBankAuth =
  | { ok: true }
  | { ok: false; status: number; error: string };

function sameSecret(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requireQuestionBankAdmin(request: Request): QuestionBankAuth {
  const expected = process.env.QUESTION_BANK_ADMIN_KEY;
  if (!expected || expected.trim().length < 8) {
    return {
      ok: false,
      status: 503,
      error: "Question Bank admin key is not configured.",
    };
  }

  const actual = request.headers.get("x-question-bank-key") ?? "";
  if (!sameSecret(actual, expected)) {
    return { ok: false, status: 401, error: "Invalid Question Bank admin key." };
  }

  return { ok: true };
}
