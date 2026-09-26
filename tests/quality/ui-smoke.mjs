import { gitFiles, blocked, fail, pass, requireFiles, text } from "./lib.mjs";

const required = ["apps/web/app/citizen/page.tsx", "apps/web/app/ops/page.tsx", "apps/web/app/manifest.ts"];
if (!requireFiles(required, "FR/EN and viewport smoke awaits frontend integration")) process.exit();

const webFiles = gitFiles().filter((path) => path.startsWith("apps/web/") && /\.(?:tsx?|css)$/.test(path));
const source = webFiles.map(text).join("\n");
const errors = [];
if (!/(?:['"]fr['"]|\bFR\b)/.test(source)) errors.push("French locale is not present");
if (!/(?:['"]en['"]|\bEN\b)/.test(source)) errors.push("English locale is not present");
if (!/localStorage|cookie/i.test(source)) errors.push("locale persistence is not visible in frontend source");
if (!/@media[^\{]*(?:max-width|min-width)/i.test(source)) errors.push("no responsive viewport rule found");
if (!/prefers-reduced-motion/i.test(source)) errors.push("reduced-motion behavior is absent");
if (!/display-mode|standalone|manifest/i.test(source)) errors.push("installable PWA behavior is absent");

if (errors.length) fail("static FR/EN, PWA, or viewport smoke failed", errors);
else pass("FR/EN persistence, citizen/ops surfaces, PWA, and responsive safeguards are present");

