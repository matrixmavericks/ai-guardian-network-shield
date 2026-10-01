import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_classes",
  title: "My classes",
  description: "List the signed-in person's classes, with their subject and curriculum.",
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Sign in required." }], isError: true };
    const db = supabaseForUser(ctx);
    const { data: membership, error: membershipError } = await db.from("class_members").select("class_id").eq("student_id", ctx.getUserId()).limit(100);
    if (membershipError) throw new Error(membershipError.message);
    const ids = (membership ?? []).map((row) => row.class_id);
    const { data: taught, error: taughtError } = await db.from("classes").select("id, name, subject, curriculum_type").eq("teacher_id", ctx.getUserId()).limit(100);
    if (taughtError) throw new Error(taughtError.message);
    const { data: enrolled, error: enrolledError } = ids.length
      ? await db.from("classes").select("id, name, subject, curriculum_type").in("id", ids).limit(100)
      : { data: [], error: null };
    if (enrolledError) throw new Error(enrolledError.message);
    const classes = [...(taught ?? []).map((row) => ({ ...row, relationship: "teacher" })), ...(enrolled ?? []).filter((row) => !(taught ?? []).some((item) => item.id === row.id)).map((row) => ({ ...row, relationship: "student" }))];
    return { content: [{ type: "text", text: JSON.stringify(classes) }], structuredContent: { classes } };
  },
});