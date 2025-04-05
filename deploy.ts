import { config } from "dotenv";
import fetch from "node-fetch";

config();

// Dynamically import the Octokit library
const { Octokit } = await import("@octokit/rest");

const github = new Octokit({ auth: process.env.MY_GITHUB_TOKEN });
const PULUMI_ACCESS_TOKEN = process.env.PULUMI_ACCESS_TOKEN!;

// Define the expected response type from Hugging Face
interface HuggingFaceResponse {
  generated_text?: string;
}

async function analyzeLatestMeal() {
  const { data: issues } = await github.issues.listForRepo({
    owner: process.env.REPO_OWNER!,
    repo: process.env.REPO_NAME!,
    state: "open",
    sort: "created",
    direction: "desc",
    per_page: 1,
  });

  const latest = issues[0];
  if (!latest) {
    console.log("No meal found.");
    return;
  }

  const prompt = `You are a nutritionist. Analyze this meal and give Health suggestions on the Meal:\n${latest.body}`;

  const response = await fetch(
    "https://api-inference.huggingface.co/models/google/flan-t5-large",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PULUMI_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_length: 200 },
      }),
    }
  );

  const result = (await response.json()) as HuggingFaceResponse[] | { error: string };
  
  const feedback =
    Array.isArray(result) && result[0]?.generated_text
      ? result[0].generated_text
      : "Could not analyze meal.";

  await github.issues.createComment({
    owner: process.env.REPO_OWNER!,
    repo: process.env.REPO_NAME!,
    issue_number: latest.number,
    body: feedback,
  });

  console.log("✅ Feedback posted on GitHub issue.");
}

analyzeLatestMeal().catch(console.error);
