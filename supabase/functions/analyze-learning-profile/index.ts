import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // Check if a target userId was provided (teacher viewing student)
    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    
    let targetUserId = user.id;
    
    if (body.userId && body.userId !== user.id) {
      // Verify the caller is a teacher or admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const callerRoles = (roles || []).map((r: any) => r.role);
      if (!callerRoles.includes("teacher") && !callerRoles.includes("admin")) {
        throw new Error("Only teachers/admins can view other students' profiles");
      }
      targetUserId = body.userId;
    }

    // Fetch all data for the target user
    const [chatRes, progressRes, pathsRes, submissionsRes, documentsRes] = await Promise.all([
      supabase
        .from("ai_chat_messages")
        .select("role, content, created_at, metadata")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("learning_path_progress")
        .select("path_id, progress, completed_modules, bookmarked, started_at, last_accessed_at")
        .eq("user_id", targetUserId),
      supabase
        .from("learning_paths")
        .select("id, title, subject, difficulty, modules, tags")
        .eq("created_by", targetUserId),
      supabase
        .from("assignment_submissions")
        .select("assignment_id, content, grade, max_grade, feedback, status, submitted_at, graded_at")
        .eq("student_id", targetUserId),
      supabase
        .from("student_documents")
        .select("file_name, document_type, description, file_url, created_at")
        .eq("user_id", targetUserId),
    ]);

    const chatMessages = chatRes.data || [];
    const progressData = progressRes.data || [];
    const userPaths = pathsRes.data || [];
    const submissionsData = submissionsRes.data || [];
    const studentDocuments = documentsRes.data || [];

    // Fetch actual content of text-based documents from storage
    console.log(`Found ${studentDocuments.length} documents for user ${targetUserId}`);
    const documentContents: { fileName: string; type: string; description: string; content: string; extractedChars: number; status: string }[] = [];
    for (const doc of studentDocuments) {
      try {
        // Extract the storage path from the file_url
        console.log(`Processing doc: ${doc.file_name}, file_url: ${doc.file_url}`);
        const urlParts = doc.file_url?.split('/student-documents/');
        const rawStoragePath = urlParts && urlParts.length > 1 ? urlParts[1] : null;
        const storagePath = rawStoragePath ? decodeURIComponent(rawStoragePath) : null;
        console.log(`Storage path resolved: ${storagePath}`);
        
        if (storagePath) {
          const { data: fileData, error: fileError } = await supabase
            .storage
            .from('student-documents')
            .download(storagePath);
          
          if (!fileError && fileData) {
            const isPdf = doc.file_name?.toLowerCase().endsWith('.pdf') || doc.document_type?.toLowerCase() === 'pdf';
            let extractedText = '';

            if (isPdf) {
              // Lightweight PDF fallback: extract printable text chunks from bytes
              const bytes = new Uint8Array(await fileData.arrayBuffer());
              const decoded = new TextDecoder('latin1').decode(bytes);
              const printableChunks = decoded
                .split(/[^\x20-\x7E\n\r\t]+/)
                .map((chunk) => chunk.trim())
                .filter((chunk) => /[a-zA-Z]{3,}/.test(chunk) && chunk.length > 4)
                .slice(0, 500);
              extractedText = printableChunks.join(' ').replace(/\s+/g, ' ');
            } else {
              extractedText = await fileData.text();
            }

            const trimmedContent = extractedText.substring(0, 6000);
            const extractedChars = trimmedContent.length;
            documentContents.push({
              fileName: doc.file_name,
              type: doc.document_type,
              description: doc.description || '',
              content: trimmedContent || '[No extractable text found in file]',
              extractedChars,
              status: extractedChars > 0 ? 'extracted' : 'no_text',
            });
            console.log(`Extracted ${extractedChars} chars from ${doc.file_name}`);
          } else {
            console.error(`Download failed for ${doc.file_name}:`, fileError?.message);
            documentContents.push({
              fileName: doc.file_name,
              type: doc.document_type,
              description: doc.description || '',
              content: '[Could not read file content]',
              extractedChars: 0,
              status: 'download_failed',
            });
          }
        }
      } catch (docErr) {
        console.error(`Failed to read document ${doc.file_name}:`, docErr);
        documentContents.push({
          fileName: doc.file_name,
          type: doc.document_type,
          description: doc.description || '',
          content: '[Error reading file]',
          extractedChars: 0,
          status: 'error',
        });
      }
    }

    // Also check learning paths assigned to the student (not just created by)
    let assignedPaths: any[] = [];
    if (progressData.length > 0) {
      const pathIds = progressData.map((p: any) => p.path_id);
      const { data: paths } = await supabase
        .from("learning_paths")
        .select("id, title, subject, difficulty, modules, tags")
        .in("id", pathIds);
      assignedPaths = paths || [];
    }

    // Combine created and assigned paths
    const allPaths = [...userPaths];
    for (const ap of assignedPaths) {
      if (!allPaths.find((p: any) => p.id === ap.id)) {
        allPaths.push(ap);
      }
    }

    // Fetch assignment details
    const assignmentIds = submissionsData.map((s: any) => s.assignment_id);
    let assignmentsData: any[] = [];
    if (assignmentIds.length > 0) {
      const { data: assignments } = await supabase
        .from("class_assignments")
        .select("id, title, subject, description")
        .in("id", assignmentIds);
      assignmentsData = assignments || [];
    }

    // Build context
    const chatSummary = chatMessages
      .filter((m: any) => m.role === "user")
      .slice(0, 50)
      .map((m: any) => m.content)
      .join("\n---\n");

    const pathsSummary = allPaths.map((p: any) => {
      const prog = progressData.find((pr: any) => pr.path_id === p.id);
      return {
        title: p.title,
        subject: p.subject,
        difficulty: p.difficulty,
        totalModules: Array.isArray(p.modules) ? p.modules.length : 0,
        completedModules: prog ? prog.completed_modules?.length || 0 : 0,
        progress: prog ? prog.progress : 0,
      };
    });

    const assignmentsSummary = submissionsData.map((s: any) => {
      const assignment = assignmentsData.find((a: any) => a.id === s.assignment_id);
      return {
        title: assignment?.title || "Unknown",
        subject: assignment?.subject || "Unknown",
        grade: s.grade,
        maxGrade: s.max_grade,
        percentage: s.grade !== null ? Math.round((s.grade / s.max_grade) * 100) : null,
        feedback: s.feedback,
        status: s.status,
      };
    });

    const documentsSummary = documentContents.map((d) => ({
      fileName: d.fileName,
      type: d.type,
      description: d.description,
      status: d.status,
      extractedChars: d.extractedChars,
      content: d.content,
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert educational psychologist and adaptive learning specialist. Analyze a student's learning data and produce a comprehensive learning profile.

CRITICAL MATH FORMATTING: NEVER use LaTeX/dollar-sign notation ($x^2$, \\frac{}, etc). Use Unicode symbols: × ÷ ² ³ √ π ∑ ≤ ≥ ≠. Write fractions as a/b. Write exponents as x², x³. Use plain text for all math.

You MUST respond with a tool call using the "learning_profile" function. Analyze carefully:
1. LEARNING STYLE: Determine from their questions whether they are visual, auditory, reading/writing, or kinesthetic learners.
2. CONCEPTUAL GAPS: Identify fundamental misunderstandings or knowledge gaps from their questions, learning path progress, assignment grades/feedback, AND uploaded documents (syllabi, report cards).
3. STRENGTH AREAS: What subjects/topics they excel at (use assignment grades and documents as evidence).
4. PREVENTIVE RECOMMENDATIONS: Predict future mistakes based on current patterns and suggest preemptive lessons.
5. OPTIMIZED PLAN: Create a personalized micro-learning plan (5-7 focused activities) tailored to their learning style.

Be specific, actionable, and encouraging. Reference actual topics from their data. If student documents like syllabi or report cards are provided, use them to cross-reference performance and identify areas needing attention.`;

    const userPrompt = `## Student Chat History (recent questions asked to AI tutor):
${chatSummary || "No chat history available yet."}

## Learning Paths & Progress:
${JSON.stringify(pathsSummary, null, 2)}

## Assignment Grades & Submissions:
${JSON.stringify(assignmentsSummary, null, 2)}

## Uploaded Documents (Syllabi, Report Cards, etc.) — ACTUAL CONTENT:
${documentsSummary.length > 0 ? JSON.stringify(documentsSummary, null, 2) : "No documents uploaded yet."}

IMPORTANT: If documents are provided and any has status="extracted", you MUST explicitly reference them by fileName in strengths/conceptual_gaps evidence text and include at least 2 document-based findings.

Analyze this student's learning profile comprehensively.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "learning_profile",
              description: "Return the student's complete adaptive learning profile analysis.",
              parameters: {
                type: "object",
                properties: {
                  learning_style: {
                    type: "object",
                    properties: {
                      primary: { type: "string", description: "Primary learning style: visual, auditory, reading_writing, or kinesthetic" },
                      secondary: { type: "string", description: "Secondary learning style" },
                      description: { type: "string", description: "2-3 sentence explanation of how this student learns best" },
                      tips: { type: "array", items: { type: "string" }, description: "3-4 specific study tips for this style" },
                    },
                    required: ["primary", "description", "tips"],
                  },
                  conceptual_gaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        severity: { type: "string", enum: ["minor", "moderate", "critical"] },
                        description: { type: "string" },
                        remediation: { type: "string" },
                      },
                      required: ["topic", "severity", "description", "remediation"],
                    },
                  },
                  strengths: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        area: { type: "string" },
                        evidence: { type: "string" },
                      },
                      required: ["area", "evidence"],
                    },
                  },
                  preventive_insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        prediction: { type: "string" },
                        prevention: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["prediction", "prevention", "priority"],
                    },
                  },
                  optimized_plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        order: { type: "number" },
                        activity: { type: "string" },
                        why: { type: "string" },
                        duration_minutes: { type: "number" },
                        type: { type: "string", enum: ["lesson", "practice", "quiz", "reflection", "project"] },
                      },
                      required: ["order", "activity", "why", "duration_minutes", "type"],
                    },
                  },
                  overall_summary: { type: "string", description: "An encouraging 2-3 sentence summary" },
                },
                required: ["learning_style", "conceptual_gaps", "strengths", "preventive_insights", "optimized_plan", "overall_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "learning_profile" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");

    const profile = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-learning-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
