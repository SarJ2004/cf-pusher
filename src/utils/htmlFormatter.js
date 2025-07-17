// 🚀 IMPROVED HTML to Markdown converter for problem statements
// This addresses the MathJax/LaTeX parsing issues mentioned in the README

export const formatProblemStatement = (html) => {
  if (!html) return "Problem statement could not be retrieved.";

  let cleaned = html;

  try {
    // 🚀 IMPROVEMENT: Enhanced MathJax handling with better regex patterns

    // Step 1: Handle inline math expressions (script tags with math/tex)
    cleaned = cleaned.replace(
      /<script[^>]*type=["']math\/tex["'][^>]*>\s*(.*?)\s*<\/script>/gis,
      (match, mathContent) => {
        const cleanMath = mathContent
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/\\"/g, '"')
          .trim();
        return ` $${cleanMath}$ `;
      }
    );

    // Step 2: Handle display math expressions (script tags with mode=display)
    cleaned = cleaned.replace(
      /<script[^>]*type=["']math\/tex;\s*mode=display["'][^>]*>\s*(.*?)\s*<\/script>/gis,
      (match, mathContent) => {
        const cleanMath = mathContent
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/\\"/g, '"')
          .trim();
        return `\n\n$$${cleanMath}$$\n\n`;
      }
    );

    // Step 3: Handle MathJax span elements (fallback)
    cleaned = cleaned.replace(
      /<span[^>]*class=["'][^"']*MathJax[^"']*["'][^>]*>(.*?)<\/span>/gis,
      (match, content) => {
        // Extract text content and clean it
        const textContent = content
          .replace(/<[^>]*>/g, "")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .trim();

        if (textContent) {
          // If it looks like math (contains common math symbols), wrap it
          if (/[\\{}^_$=+\-*/]/.test(textContent)) {
            return ` $${textContent}$ `;
          }
          return textContent;
        }
        return "";
      }
    );

    // Step 4: Remove all other scripts and style elements
    cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gis, "");
    cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gis, "");
    cleaned = cleaned.replace(/<noscript[^>]*>.*?<\/noscript>/gis, "");

    // Step 5: Handle common HTML elements and convert to markdown

    // Headers
    cleaned = cleaned.replace(
      /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi,
      (match, level, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, "").trim();
        const prefix = "#".repeat(parseInt(level));
        return `\n\n${prefix} ${cleanContent}\n\n`;
      }
    );

    // Paragraphs
    cleaned = cleaned.replace(/<p[^>]*>(.*?)<\/p>/gis, (match, content) => {
      const cleanContent = content.replace(/<[^>]*>/g, "").trim();
      return cleanContent ? `\n\n${cleanContent}\n\n` : "";
    });

    // Line breaks
    cleaned = cleaned.replace(/<br[^>]*\/?>/gi, "\n");

    // Bold and strong
    cleaned = cleaned.replace(
      /<(b|strong)[^>]*>(.*?)<\/(b|strong)>/gi,
      "**$2**"
    );

    // Italic and emphasis
    cleaned = cleaned.replace(/<(i|em)[^>]*>(.*?)<\/(i|em)>/gi, "*$2*");

    // Code blocks
    cleaned = cleaned.replace(/<pre[^>]*>(.*?)<\/pre>/gis, (match, content) => {
      const cleanContent = content
        .replace(/<code[^>]*>(.*?)<\/code>/gis, "$1")
        .replace(/<[^>]*>/g, "")
        .trim();
      return `\n\n\`\`\`\n${cleanContent}\n\`\`\`\n\n`;
    });

    // Inline code
    cleaned = cleaned.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");

    // Lists
    cleaned = cleaned.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      const items = content.replace(/<li[^>]*>(.*?)<\/li>/gis, "- $1\n");
      return `\n${items}\n`;
    });

    cleaned = cleaned.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let counter = 1;
      const items = content.replace(/<li[^>]*>(.*?)<\/li>/gis, () => {
        return `${counter++}. $1\n`;
      });
      return `\n${items}\n`;
    });

    // Tables (basic support)
    cleaned = cleaned.replace(
      /<table[^>]*>(.*?)<\/table>/gis,
      (match, content) => {
        // This is a simplified table conversion
        let tableContent = content
          .replace(/<tr[^>]*>(.*?)<\/tr>/gis, "$1|\n")
          .replace(/<th[^>]*>(.*?)<\/th>/gis, "| $1 ")
          .replace(/<td[^>]*>(.*?)<\/td>/gis, "| $1 ");

        return `\n\n${tableContent}\n\n`;
      }
    );

    // Links
    cleaned = cleaned.replace(
      /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi,
      "[$2]($1)"
    );

    // Images
    cleaned = cleaned.replace(
      /<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
      "![$2]($1)"
    );
    cleaned = cleaned.replace(
      /<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi,
      "![]($1)"
    );

    // Step 6: Clean up HTML entities more thoroughly
    const entityMap = {
      "&lt;": "<",
      "&gt;": ">",
      "&amp;": "&",
      "&quot;": '"',
      "&apos;": "'",
      "&nbsp;": " ",
      "&ndash;": "–",
      "&mdash;": "—",
      "&hellip;": "…",
      "&copy;": "©",
      "&reg;": "®",
      "&trade;": "™",
      "&deg;": "°",
      "&plusmn;": "±",
      "&times;": "×",
      "&divide;": "÷",
      "&alpha;": "α",
      "&beta;": "β",
      "&gamma;": "γ",
      "&delta;": "δ",
      "&epsilon;": "ε",
      "&pi;": "π",
      "&sigma;": "σ",
      "&tau;": "τ",
      "&phi;": "φ",
      "&omega;": "ω",
    };

    cleaned = cleaned.replace(/&(#?\w+);/g, (match, entity) => {
      // Handle named entities
      if (entityMap[match]) {
        return entityMap[match];
      }

      // Handle numeric entities
      if (entity.startsWith("#")) {
        const code = entity.startsWith("#x")
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);

        if (!isNaN(code) && code > 0 && code < 1114112) {
          try {
            return String.fromCharCode(code);
          } catch {
            return match; // Return original if conversion fails
          }
        }
      }

      return match; // Return original if we can't decode it
    });

    // Step 7: Remove any remaining HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, "");

    // Step 8: Clean up whitespace and formatting

    // Fix multiple newlines
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

    // Fix spaces around math expressions
    cleaned = cleaned.replace(/\s+\$([^$]+)\$\s+/g, " $$$1$$ ");
    cleaned = cleaned.replace(/\$\$\s+/g, "$$");
    cleaned = cleaned.replace(/\s+\$\$/g, "$$");

    // Fix whitespace
    cleaned = cleaned.replace(/[ \t]+/g, " ");
    cleaned = cleaned.replace(/\n[ \t]+/g, "\n");
    cleaned = cleaned.replace(/[ \t]+\n/g, "\n");

    // Trim and ensure consistent formatting
    cleaned = cleaned.trim();

    // Ensure the content ends with proper spacing
    if (cleaned && !cleaned.endsWith("\n")) {
      cleaned += "\n";
    }

    return cleaned || "Problem statement could not be parsed properly.";
  } catch (error) {
    console.warn("❌ Error formatting HTML:", error);

    // Fallback: Basic cleaning if advanced parsing fails
    try {
      let fallback = html
        .replace(/<script[^>]*>.*?<\/script>/gis, "")
        .replace(/<style[^>]*>.*?<\/style>/gis, "")
        .replace(/<[^>]*>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return fallback || "Problem statement could not be retrieved.";
    } catch (fallbackError) {
      console.error("❌ Fallback formatting also failed:", fallbackError);
      return "Problem statement could not be retrieved due to formatting errors.";
    }
  }
};

// 🚀 IMPROVEMENT: Alternative simple formatter for when the main one fails
export const simpleFormatProblemStatement = (html) => {
  if (!html) return "Problem statement could not be retrieved.";

  try {
    let cleaned = html;

    // Handle math expressions with simpler approach
    cleaned = cleaned.replace(
      /<script[^>]*type=["']math\/tex[^"']*["'][^>]*>(.*?)<\/script>/gis,
      " $$$1$$ "
    );

    // Remove all scripts and styles
    cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gis, "");
    cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gis, "");

    // Basic HTML tag removal
    cleaned = cleaned.replace(/<[^>]*>/g, " ");

    // Basic entity decoding
    cleaned = cleaned
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ");

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    return cleaned || "Problem statement could not be retrieved.";
  } catch (error) {
    console.warn("❌ Simple formatting failed:", error);
    return "Problem statement could not be retrieved.";
  }
};
