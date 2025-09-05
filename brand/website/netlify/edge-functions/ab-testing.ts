import { Context } from "https://edge.netlify.com";

// A/B Testing Configuration
const experiments = {
  heroAnimation: {
    name: "hero-animation-variant",
    variants: ["control", "enhanced", "minimal"],
    weights: [0.34, 0.33, 0.33],
    cookie: "cf-hero-variant"
  },
  performance: {
    name: "performance-tier",
    variants: ["standard", "optimized", "adaptive"],
    weights: [0.25, 0.50, 0.25],
    cookie: "cf-perf-tier"
  },
  colorScheme: {
    name: "color-scheme",
    variants: ["light", "dark", "auto"],
    weights: [0.40, 0.40, 0.20],
    cookie: "cf-color-scheme"
  }
};

// Hash function for consistent user assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Get or assign variant for user
function getVariant(
  userId: string,
  experiment: typeof experiments[keyof typeof experiments]
): string {
  const hash = hashString(userId + experiment.name);
  const normalized = (hash % 100) / 100;
  
  let cumulative = 0;
  for (let i = 0; i < experiment.variants.length; i++) {
    cumulative += experiment.weights[i];
    if (normalized < cumulative) {
      return experiment.variants[i];
    }
  }
  return experiment.variants[0];
}

export default async function handler(
  request: Request,
  context: Context
) {
  // Get or create user ID
  const cookies = request.headers.get("cookie") || "";
  let userId = cookies
    .split(";")
    .find(c => c.trim().startsWith("cf-user-id="))
    ?.split("=")[1];

  if (!userId) {
    userId = crypto.randomUUID();
  }

  // Determine variants for each experiment
  const variants: Record<string, string> = {};
  const headers = new Headers();

  // Set user ID cookie
  headers.append(
    "Set-Cookie",
    `cf-user-id=${userId}; Path=/; Max-Age=31536000; SameSite=Lax`
  );

  // Assign variants for each experiment
  for (const [key, experiment] of Object.entries(experiments)) {
    // Check if user already has a variant assigned
    const existingVariant = cookies
      .split(";")
      .find(c => c.trim().startsWith(`${experiment.cookie}=`))
      ?.split("=")[1];

    const variant = existingVariant || getVariant(userId, experiment);
    variants[key] = variant;

    // Set variant cookie if new
    if (!existingVariant) {
      headers.append(
        "Set-Cookie",
        `${experiment.cookie}=${variant}; Path=/; Max-Age=2592000; SameSite=Lax`
      );
    }
  }

  // Log experiment participation (for analytics)
  context.log("A/B Test Assignment", {
    userId,
    variants,
    url: request.url,
    userAgent: request.headers.get("user-agent")
  });

  // Get the response from the origin
  const response = await context.next();

  // Add experiment data to response headers
  response.headers.set("X-CF-User-ID", userId);
  response.headers.set("X-CF-Variants", JSON.stringify(variants));

  // Add cookies to response
  headers.forEach((value, key) => {
    response.headers.append(key, value);
  });

  // Inject variant data into HTML response
  if (response.headers.get("content-type")?.includes("text/html")) {
    const html = await response.text();
    const modifiedHtml = html.replace(
      "</head>",
      `<script>
        window.__CF_EXPERIMENTS__ = ${JSON.stringify(variants)};
        window.__CF_USER_ID__ = "${userId}";
      </script>
      </head>`
    );

    return new Response(modifiedHtml, {
      status: response.status,
      headers: response.headers
    });
  }

  return response;
}

export const config = {
  path: "/*"
};