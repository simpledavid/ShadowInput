import Anthropic from "@anthropic-ai/sdk";
import type { ExplanationRequest, ExplanationResponse } from "@/types/ai";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const wordPrompt = (req: ExplanationRequest) => `
You are an English language tutor. A learner is watching a YouTube video and clicked on a word.

Word: "${req.word}"
Full sentence: "${req.sentence}"
${req.videoTitle ? `Video context: ${req.videoTitle}` : ""}

Provide a clear explanation for an intermediate English learner. Return ONLY valid JSON:
{
  "definition": "Clear definition in simple English",
  "pronunciation": "Phonetic pronunciation (e.g. /wɜːrd/)",
  "partOfSpeech": "noun | verb | adjective | adverb | preposition | etc.",
  "examples": ["Example sentence 1", "Example sentence 2"],
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "grammar": "Important grammatical note about how this word is used"
}
`.trim();

const sentencePrompt = (req: ExplanationRequest) => `
You are an English language tutor. A learner selected this sentence from a YouTube video.

Sentence: "${req.sentence}"
${req.videoTitle ? `Video context: ${req.videoTitle}` : ""}

Break down this sentence for an intermediate English learner. Return ONLY valid JSON:
{
  "definition": "Plain meaning of the full sentence in simple English",
  "examples": ["A rephrased version of the same idea"],
  "grammar": "Explain the grammar structure (tense, clause types, idioms, or notable patterns)",
  "synonyms": []
}
`.trim();

export async function getExplanation(
  req: ExplanationRequest
): Promise<ExplanationResponse> {
  const prompt = req.mode === "word" ? wordPrompt(req) : sentencePrompt(req);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text;
  const jsonText = text.replace(/```json\n?|```\n?/g, "").trim();
  return JSON.parse(jsonText) as ExplanationResponse;
}
