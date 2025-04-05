import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";

// Create a new GitHub repository
const repo = new github.Repository("meal-log", {
    name: "meal-log",
    description: "A repository to log meals.",
    visibility: "public",
    autoInit: true,
    gitignoreTemplate: "Node"
});
