import OpenAI from 'openai';

let client: OpenAI | null = null;

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'OPENAI_API_KEY is not set (required for Cortex embedding tools: store_experience, search_cortex_memory)'
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export function embeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small';
}

/** 1536 dimensions for text-embedding-3-small (default). */
export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('embedText: empty input');
  }
  const res = await getOpenAI().embeddings.create({
    model: embeddingModel(),
    input: trimmed,
  });
  const vec = res.data[0]?.embedding;
  if (!vec?.length) {
    throw new Error('OpenAI returned no embedding vector');
  }
  return vec;
}

/** Literal for PostgREST / Supabase `vector` columns and RPC args. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
