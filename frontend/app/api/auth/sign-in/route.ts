import { signIn } from "@/lib/action/auth.action";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, message: "Missing email or password." }), { status: 400, headers: { "content-type": "application/json" } });
    }

    const result = await signIn({ email, password });

    return new Response(JSON.stringify(result), { 
      status: result.success ? 200 : 400, 
      headers: { "content-type": "application/json" } 
    });
  } catch (e: any) {
    console.error("[api/auth/sign-in] error:", e);
    return new Response(JSON.stringify({ success: false, message: "Failed to sign in." }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
