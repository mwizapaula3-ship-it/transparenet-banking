import { createFileRoute } from "@tanstack/react-router";
import { LiveFeed } from "@/components/fraud/LiveFeed";
import { Simulator } from "@/components/fraud/Simulator";

const title = "AI Fraud Detection for Banking Transactions";
const description =
  "A working demo of how AI scores banking transactions in real time: anomaly detection, velocity checks, impossible travel, and explainable risk decisions.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TECHNIQUES = [
  {
    name: "Anomaly detection",
    body: "Learns each customer's baseline — amounts, merchants, hours, devices — and flags statistical outliers.",
    example: "A $4,800 electronics order at 3 a.m. on an account that averages $80.",
  },
  {
    name: "Supervised classification",
    body: "Gradient-boosted trees or neural nets trained on millions of labelled transactions predict a fraud probability.",
    example: "Card-not-present + new device + gift-card merchant scores 0.91 fraud probability.",
  },
  {
    name: "Velocity & card testing",
    body: "Counts events per card, device, or IP in short windows to catch automated probing.",
    example: "Seven small authorisations in ten minutes across unrelated merchants.",
  },
  {
    name: "Graph / network analysis",
    body: "Links accounts, devices, and beneficiaries to expose mule networks that look innocent individually.",
    example: "Twelve accounts funnelling funds into one beneficiary within an hour.",
  },
  {
    name: "Behavioural biometrics",
    body: "Typing cadence, swipe pressure, and navigation patterns confirm the human behind a valid password.",
    example: "Correct credentials, but the session pastes data no genuine user ever pastes.",
  },
  {
    name: "Explainability & governance",
    body: "Regulators require reasons, not just scores, so every decision ships with ranked contributing signals.",
    example: "Blocked: impossible travel (+22), amount anomaly (+18), new device (+12).",
  },
];

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#fcfbf8" }}
    >
      <img
        data-lovable-blank-page-placeholder="REMOVE_THIS"
        src="https://cdn.gpteng.co/blank-app-v1.svg"
        alt="Your app will live here!"
      />
    </div>
  );
}
