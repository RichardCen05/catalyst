/**
 * Which model id the call sites ask for, in one place.
 *
 * Every panel used to read `GEMINI_MODEL` itself and carry its own default, so
 * pointing the app at another provider meant editing eight files and hoping
 * none was missed — and a missed one sends a Gemini id to a provider that has
 * never heard of it. The names resolve here instead.
 *
 * `LLM_MODEL` / `LLM_MODEL_CHEAP` are the provider-neutral names. The Gemini
 * ones still answer, so an existing deployment keeps working untouched.
 *
 * The built-in defaults are Gemini ids and therefore apply only while the
 * provider is Gemini. Any other provider must name its models, because there
 * is no id that is right for all of them and a wrong id fails at request time
 * with a vendor error instead of at startup with a readable one.
 */
import { DEFAULT_PROVIDER_ID } from "@/lib/agent/llm/providers";

const GEMINI_DEFAULT_STRONG = "gemini-3.8-flash";
const GEMINI_DEFAULT_CHEAP = "gemini-3.5-flash-lite";

function providerId(): string {
  return process.env.LLM_PROVIDER?.trim() || DEFAULT_PROVIDER_ID;
}

/**
 * The GEMINI_ names are read only while the provider is Gemini.
 *
 * A deployment that has run on Gemini still has GEMINI_MODEL and
 * GEMINI_MODEL_CHEAP set. Reading them under another provider sends a Gemini
 * id to a vendor that answers 404, and the operator sees it as the new
 * provider being broken rather than as a leftover variable — so switching
 * provider would mean remembering to unset two variables that have nothing to
 * do with the new one.
 */
function geminiNames(names: (string | undefined)[]): (string | undefined)[] {
  return providerId() === DEFAULT_PROVIDER_ID ? names : [];
}

function resolve(neutral: string | undefined, gemini: string | undefined, geminiDefault: string, envHint: string): string {
  const named = [neutral, ...geminiNames([gemini])].find((value) => value && value.trim());
  if (named) return named.trim();
  if (providerId() === DEFAULT_PROVIDER_ID) return geminiDefault;
  throw new Error(`LLM_PROVIDER="${providerId()}" requires ${envHint} to name a model`);
}

/** The model that writes the answer, and retries one that failed verification. */
export function strongModel(): string {
  return resolve(process.env.LLM_MODEL, process.env.GEMINI_MODEL, GEMINI_DEFAULT_STRONG, "LLM_MODEL");
}

/** The cheaper model that composes a first draft. Falls back to the strong one. */
export function cheapModel(): string {
  const named = [process.env.LLM_MODEL_CHEAP, ...geminiNames([process.env.GEMINI_MODEL_CHEAP])].find(
    (value) => value && value.trim(),
  );
  if (named) return named.trim();
  if (providerId() === DEFAULT_PROVIDER_ID) return GEMINI_DEFAULT_CHEAP;
  // No cheap tier named: one model does both jobs rather than refusing.
  return strongModel();
}
