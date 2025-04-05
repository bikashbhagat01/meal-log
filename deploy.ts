import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { config } from "dotenv";
import fetch from "node-fetch";

config();

const githubClient = new github.Github({
    auth: process.env.GITHUB_TOKEN
});

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY!;

interface HuggingFaceResponse {
    generated_text?: string;
}

async function analyzeLatestMeal() {
    const { data: issues } = await githubClient.issues.listForRepo({
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

    const prompt = `You are a nutritionist. Analyze this meal and give health suggestions on the meal:\n${latest.body}`;

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

    const result = (await response.json()) as HuggingFaceResponse[] | { error: string };
    const feedback =
        Array.isArray(result) && result[0]?.generated_text
            ? result[0].generated_text
            : "Could not analyze meal.";

    await githubClient.issues.createComment({
        owner: process.env.REPO_OWNER!,
        repo: process.env.REPO_NAME!,
        issue_number: latest.number,
        body: feedback
    });

    console.log("✅ Feedback posted on GitHub issue.");
}

analyzeLatestMeal().catch(console.error);
