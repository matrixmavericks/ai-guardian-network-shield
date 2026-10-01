import { auth, defineMcp } from "@lovable.dev/mcp-js";
import myClasses from "./tools/my-classes";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "refyn-dashboard-v1",
  title: "REFYN DASHBOARD v1",
  version: "0.1.0",
  instructions: "Access the signed-in person's Refyn classes. Follow their existing permissions.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated" }),
  tools: [myClasses],
});