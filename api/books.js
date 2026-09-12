export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const githubToken = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!adminSecret || !githubToken || !owner || !repo) {
    return res.status(500).json({
      error: "Server environment variables are not configured.",
    });
  }

  const suppliedSecret = req.headers["x-admin-secret"];

  if (!suppliedSecret || suppliedSecret !== adminSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const books = req.body?.books;

  if (!Array.isArray(books)) {
    return res.status(400).json({ error: "books must be an array" });
  }

  const filePath = "src/data/books.js";
  const githubUrl =
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    const currentResponse = await fetch(githubUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!currentResponse.ok) {
      const errorText = await currentResponse.text();
      return res.status(502).json({
        error: "Could not read books.js from GitHub.",
        details: errorText,
      });
    }

    const currentFile = await currentResponse.json();

    const fileContent =
      `export const books = ${JSON.stringify(books, null, 2)};\n`;

    const encodedContent = Buffer.from(fileContent, "utf8").toString(
      "base64"
    );

    const updateResponse = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: "Update books from Admin Panel",
        content: encodedContent,
        sha: currentFile.sha,
        branch: "main",
      }),
    });

    const updateData = await updateResponse.json();

    if (!updateResponse.ok) {
      return res.status(502).json({
        error: "GitHub could not update books.js.",
        details: updateData,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Books saved to GitHub successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Unexpected server error.",
    });
  }
}
