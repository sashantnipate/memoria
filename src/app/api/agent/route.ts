import { NextResponse } from "next/server";
import { runAgent } from "@/lib/actions/agent.actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, userId } = body;

    if (!prompt || !userId) {
      return NextResponse.json(
        { error: "Missing 'prompt' or 'userId' in request body." },
        { status: 400 }
      );
    }

    const result = await runAgent(prompt, userId);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}