import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { Endpoints } from "@octokit/types";
import * as openai from "openai";

type ListCommentsResponse = Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"]["response"];

const github = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
    installationId: process.env.GITHUB_INSTALLATION_ID,
  },
});

const openaiClient = new openai.OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getPRComments(owner: string, repo: string, issue_number: number): Promise<ListCommentsResponse["data"]> {
  const { data: comments } = await github.issues.listComments({
    owner,
    repo,
    issue_number,
  });
  return comments;
}

async function createComment(owner: string, repo: string, issue_number: number, body: string) {
  await github.issues.createComment({
    owner,
    repo,
    issue_number,
    body,
  });
}

async function generateComment(text: string): Promise<string> {
  const response = await openaiClient.completions.create({
    model: "text-davinci-003",
    prompt: text,
    max_tokens: 150,
  });
  return response.choices[0].text.trim();
}

async function main() {
  const owner = "MaxLeiter";
  const repo = "dr-action";
  const issue_number = parseInt(process.env.PR_NUMBER || "0", 10);

  if (!issue_number) {
    console.error("No pull request number provided.");
    return;
  }

  const comments = await getPRComments(owner, repo, issue_number);

  // Assuming the last comment contains the ESLint output
  const eslintOutput = comments[comments.length - 1]?.body || "";

  // Generate a comment using OpenAI
  const aiComment = await generateComment(`Please fix the following ESLint issues:\n${eslintOutput}`);

  // Post the comment back to the GitHub pull request
  await createComment(owner, repo, issue_number, aiComment);
}

main().catch(console.error);
