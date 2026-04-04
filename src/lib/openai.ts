import OpenAI from "openai";


export async function generateEmailEmbedding(subject: string, body: string) {
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 
  const textToEmbed = `Subject: ${subject} Content: ${body}`.replace(/\n/g, " ");

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: textToEmbed,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}