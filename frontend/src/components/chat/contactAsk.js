/**
 * Recognising the one turn where the assistant asks for contact details, and formatting the
 * answer it expects.
 *
 * Two turns into a conversation the orchestrator stops and asks, in prose:
 *
 *   Before we start, let me take your details so a counsellor can follow up properly - and
 *   so nothing is lost if we get disconnected.
 *   Your name, the best mobile number, and your email?
 *   By sharing these, you agree that InsureNation may contact you about this enquiry. We
 *   never make marketing calls.
 *
 * Every other turn in the funnel offers `- ` option lines, which become chips. This one does
 * not, so without help the visitor faces a bare keyboard and types three kinds of data into
 * one box — at the exact moment the conversation is capturing the thing it exists for. The
 * observed reply was "utsav jain / 9667012345": no email, no country code, lowercase name.
 *
 * This is pure so it can be checked without a browser: `node scripts/check-contact-ask.mjs`.
 *
 * ponytail: a heuristic over generated text, and the prompt belongs to imagine.bo. It fails
 * *soft* — a miss means the composer, which is what the visitor would have had anyway — and
 * the check script pins the current wording, so a reword shows up as a failing check rather
 * than a form that quietly stopped appearing. The exact fix is a machine-readable marker on
 * their response (`needs: "contact"`); ask for it, then delete all of this.
 */

/** The consent sentence, which is the strongest single signal and unlikely to move. */
const CONSENT = /you agree that .{0,40}may contact you/i;

const WANTS_NAME = /\byour name\b|\bname\b/i;
const WANTS_PHONE = /\bmobile\b|\bphone\b|\bnumber\b/i;
const WANTS_EMAIL = /\be-?mail\b/i;

export function isContactAsk(text) {
  const s = String(text ?? '');
  if (!s.trim()) return false;

  // A turn offering choices is a funnel question, never the contact ask.
  if (/^\s*-\s+\S/m.test(s)) return false;

  if (CONSENT.test(s)) return true;

  // Otherwise all three have to be asked for together, and it has to be a question — "Thanks,
  // Utsav!" mentions a name but asks for nothing.
  return s.includes('?') && WANTS_NAME.test(s) && WANTS_PHONE.test(s) && WANTS_EMAIL.test(s);
}

/**
 * The message to send, shaped like the free text their parser already accepts: one field per
 * line, email omitted when blank. Their side normalises it — the point of the form is that the
 * visitor is not the one having to get it right.
 */
export function formatContact({ name, dial, phone, email }) {
  const lines = [String(name ?? '').trim(), `${dial} ${String(phone ?? '').trim()}`.trim()];
  const mail = String(email ?? '').trim();
  if (mail) lines.push(mail);
  return lines.filter(Boolean).join('\n');
}

/**
 * Why a submission is not allowed yet, or null when it is.
 *
 * Deliberately thin. A form that argues with people loses leads, and their assistant accepts
 * free text anyway — this only has to stop the obvious slips.
 *
 * ponytail: digits-and-length, tightened for +91 where the rule is well known and worth
 * catching. Per-country rules mean a phone-number library, which is a large dependency for a
 * field the other end parses loosely. Add one only if real submissions show it is needed.
 */
export function contactError({ name, dial, phone, email }) {
  if (!String(name ?? '').trim()) return 'Please enter your name.';

  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return 'Please enter your mobile number.';
  if (dial === '+91') {
    if (digits.length !== 10) return 'An Indian mobile number is 10 digits.';
    if (!/^[6-9]/.test(digits)) return 'An Indian mobile number starts with 6, 7, 8 or 9.';
  } else if (digits.length < 6 || digits.length > 15) {
    return 'Please check the mobile number.';
  }

  const mail = String(email ?? '').trim();
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return 'Please check the email address.';

  return null;
}
