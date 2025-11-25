import fs from "fs";
import path from "path";

export async function loadImageAsBase64(
  imagePath: string
): Promise<string | null> {
  const isLocal = process.env.NODE_ENV !== "production";

  try {
    if (isLocal) {
      // 🧪 Load directly from local /public/ directory
      // Remove leading slash if present
      const cleanPath = imagePath.startsWith("/")
        ? imagePath.slice(1)
        : imagePath;
      const fullPath = path.join(process.cwd(), "public", cleanPath);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Image not found at: ${fullPath}`);
        return null;
      }

      const buffer = fs.readFileSync(fullPath);
      const base64 = `data:image/png;base64,${buffer.toString("base64")}`;

      return base64;
    } else {
      // ☁️ Use fetch from BASE_URL in Vercel
      const baseUrl =
        process.env.BASE_URL ||
        process.env.VERCEL_URL ||
        "http://localhost:3000";
      const url = `${baseUrl}${imagePath}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return `data:image/png;base64,${Buffer.from(arrayBuffer).toString(
        "base64"
      )}`;
    }
  } catch (error) {
    console.warn("⚠️ Failed to load avatar image:", error);
    return null;
  }
}
