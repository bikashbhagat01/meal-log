import { Octokit } from "@octokit/rest";
import { config } from "dotenv";
import OpenAI from "openai";

config();

const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function analyzeLatestMeal() {
    const { data: issues } = await github.issues.listForRepo({
        owner: process.env.REPO_OWNER!,
        repo: process.env.REPO_NAME!,
        state: "open",
        sort: "created",
        direction: "desc",
        per_page: 1
    });

    const latest = issues[0];
    if (!latest) {
        console.log("No meal found.");
        return;
    }

    const prompt = `You are a nutritionist. Analyze this meal and estimate:
    - Total calories
    - Macronutrient breakdown (Protein, Carbs, Fats)
    - Health suggestions

    Meal:\n${latest.body}`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
    });

    const feedback = completion.choices[0].message.content;

    // Comment the feedback back on GitHub issue
    await github.issues.createComment({
        owner: process.env.REPO_OWNER!,
        repo: process.env.REPO_NAME!,
        issue_number: latest.number,
        body: feedback!,
    });

    console.log("✅ Feedback posted on GitHub issue.");
}


analyzeLatestMeal().catch(console.error);
