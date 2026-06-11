import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

export type CohereEmbeddingInputType = 'search_document' | 'search_query'

type CohereEmbeddingResponse = {
  embeddings?: number[][] | { float?: number[][] }
}

export function normalizeTerm(term: string) {
  return term.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

export function termSetKey(terms: readonly string[]) {
  return terms.map(normalizeTerm).sort().join('||')
}

export function vectorNorm(vector: readonly number[]) {
  let sum = 0
  for (const value of vector) {
    sum += value * value
  }
  return Math.sqrt(sum)
}

export function cosineSimilarity(
  left: readonly number[],
  right: readonly number[],
  rightNorm = vectorNorm(right),
) {
  if (left.length !== right.length) {
    throw new Error('Embedding vectors must have matching dimensions.')
  }

  const leftNorm = vectorNorm(left)
  if (leftNorm === 0 || rightNorm === 0) {
    return 0
  }

  let dot = 0
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index]
  }
  return dot / (leftNorm * rightNorm)
}

export function centroid(vectors: readonly (readonly number[])[]) {
  if (vectors.length === 0) {
    throw new Error('Cannot compute a centroid without vectors.')
  }

  const dimensions = vectors[0].length
  const result = new Array<number>(dimensions).fill(0)

  for (const vector of vectors) {
    if (vector.length !== dimensions) {
      throw new Error('Embedding vectors must have matching dimensions.')
    }
    for (let index = 0; index < dimensions; index += 1) {
      result[index] += vector[index]
    }
  }

  for (let index = 0; index < dimensions; index += 1) {
    result[index] /= vectors.length
  }

  return result
}

export async function embedTexts(
  client: BedrockRuntimeClient,
  modelId: string,
  texts: readonly string[],
  inputType: CohereEmbeddingInputType,
) {
  if (texts.length === 0) {
    return []
  }

  const response = await client.send(new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      texts,
      input_type: inputType,
      embedding_types: ['float'],
    }),
  }))

  const body = new TextDecoder().decode(response.body)
  const parsed = JSON.parse(body) as CohereEmbeddingResponse
  const embeddings = Array.isArray(parsed.embeddings) ? parsed.embeddings : parsed.embeddings?.float

  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error('Bedrock returned an unexpected embedding response.')
  }

  return embeddings
}
