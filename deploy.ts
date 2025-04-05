import * as pulumi from "@pulumi/pulumi";
import { config } from "dotenv";
import { Octokit } from "@octokit/rest";
import fetch from "node-fetch";

config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY!;

// Function to analyze the latest meal
async function analyzeLatestMeal() {
    // Fetch the most recent open issue
    const { data: issues } = await octokit.issues.listForRepo({
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

    // Prepare the prompt for HuggingFace API
    const prompt = `You are a nutritionist. Analyze this meal and give health suggestions on the meal:\n${latest.body}`;

    // Make a request to the HuggingFace API
    const response = await fetch("https://api-inference.huggingface.co/models/google/flan-t5-large", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: { max_length: 200 }
        })
    });

    const result = await response.json();
    const feedback = result?.[0]?.generated_text || "Could not analyze meal.";

    // Post the feedback as a comment on the latest issue
    await octokit.issues.createComment({
        owner: process.env.REPO_OWNER!,
        repo: process.env.REPO_NAME!,
        issue_number: latest.number,
        body: feedback
    });

    console.log("✅ Feedback posted on GitHub issue.");
}

// Run the function
analyzeLatestMeal().catch(console.error);
