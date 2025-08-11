export const formatProblemStatement = (html) => {
  if (!html) return "Problem statement could not be retrieved.";

  let cleaned = html;

  try {
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

    cleaned = cleaned.replace(
      /<span[^>]*class=["'][^"']*MathJax[^"']*["'][^>]*>(.*?)<\/span>/gis,
      (match, content) => {
        const textContent = content
          .replace(/<[^>]*>/g, "")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .trim();

        if (textContent) {
          if (/[\\{}^_$=+\-*/]/.test(textContent)) {
            return ` $${textContent}$ `;
          }
          return textContent;
        }
        return "";
      }
    );

    cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gis, "");
    cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gis, "");
    cleaned = cleaned.replace(/<noscript[^>]*>.*?<\/noscript>/gis, "");

    cleaned = cleaned.replace(
      /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi,
      (match, level, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, "").trim();
        const prefix = "#".repeat(parseInt(level));
        return `\n\n${prefix} ${cleanContent}\n\n`;
      }
    );

    cleaned = cleaned.replace(/<p[^>]*>(.*?)<\/p>/gis, (match, content) => {
      const cleanContent = content.replace(/<[^>]*>/g, "").trim();
      return cleanContent ? `\n\n${cleanContent}\n\n` : "";
    });

    cleaned = cleaned.replace(/<br[^>]*\/?>/gi, "\n");

    cleaned = cleaned.replace(
      /<(b|strong)[^>]*>(.*?)<\/(b|strong)>/gi,
      "**$2**"
    );

    cleaned = cleaned.replace(/<(i|em)[^>]*>(.*?)<\/(i|em)>/gi, "*$2*");

    cleaned = cleaned.replace(/<pre[^>]*>(.*?)<\/pre>/gis, (match, content) => {
      const cleanContent = content
        .replace(/<code[^>]*>(.*?)<\/code>/gis, "$1")
        .replace(/<[^>]*>/g, "")
        .trim();
      return `\n\n\`\`\`\n${cleanContent}\n\`\`\`\n\n`;
    });

    cleaned = cleaned.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");

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

    cleaned = cleaned.replace(
      /<table[^>]*>(.*?)<\/table>/gis,
      (match, content) => {
        let tableContent = content
          .replace(/<tr[^>]*>(.*?)<\/tr>/gis, "$1|\n")
          .replace(/<th[^>]*>(.*?)<\/th>/gis, "| $1 ")
          .replace(/<td[^>]*>(.*?)<\/td>/gis, "| $1 ");

        return `\n\n${tableContent}\n\n`;
      }
    );

    cleaned = cleaned.replace(
      /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi,
      "[$2]($1)"
    );

    cleaned = cleaned.replace(
      /<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
      "![$2]($1)"
    );
    cleaned = cleaned.replace(
      /<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi,
      "![]($1)"
    );

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
      if (entityMap[match]) {
        return entityMap[match];
      }

      if (entity.startsWith("#")) {
        const code = entity.startsWith("#x")
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);

        if (!isNaN(code) && code > 0 && code < 1114112) {
          try {
            return String.fromCharCode(code);
          } catch {
            return match;
          }
        }
      }

      return match;
    });

    cleaned = cleaned.replace(/<[^>]*>/g, "");

    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

    cleaned = cleaned.replace(/\s+\$([^$]+)\$\s+/g, " $$$1$$ ");
    cleaned = cleaned.replace(/\$\$\s+/g, "$$");
    cleaned = cleaned.replace(/\s+\$\$/g, "$$");

    cleaned = cleaned.replace(/[ \t]+/g, " ");
    cleaned = cleaned.replace(/\n[ \t]+/g, "\n");
    cleaned = cleaned.replace(/[ \t]+\n/g, "\n");

    cleaned = cleaned.trim();

    if (cleaned && !cleaned.endsWith("\n")) {
      cleaned += "\n";
    }

    return cleaned || "Problem statement could not be parsed properly.";
  } catch (error) {
    console.warn("❌ Error formatting HTML:", error);

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

export const simpleFormatProblemStatement = (html) => {
  if (!html) return "Problem statement could not be retrieved.";

  try {
    let cleaned = html;

    cleaned = cleaned.replace(
      /<script[^>]*type=["']math\/tex[^"']*["'][^>]*>(.*?)<\/script>/gis,
      " $$$1$$ "
    );

    cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gis, "");
    cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gis, "");

    cleaned = cleaned.replace(/<[^>]*>/g, " ");

    cleaned = cleaned
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ");

    cleaned = cleaned.replace(/\s+/g, " ").trim();

    return cleaned || "Problem statement could not be retrieved.";
  } catch (error) {
    console.warn("❌ Simple formatting failed:", error);
    return "Problem statement could not be retrieved.";
  }
};
