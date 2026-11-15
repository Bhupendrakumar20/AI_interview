import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { latexCode, filename } = body;

    if (!latexCode || typeof latexCode !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid LaTeX source code." },
        { status: 400 }
      );
    }

    const safeFilename = filename
      ? filename.replace(/[^a-zA-Z0-9_\-\.]/g, "_")
      : "Resume.pdf";

    // Call the LaTeX cloud compiler service
    const compileUrl = `https://latexonline.cc/compile?text=${encodeURIComponent(latexCode)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    let compileRes;
    try {
      compileRes = await fetch(compileUrl, {
        method: "GET",
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "LaTeX compilation timed out. Please try again or open the code directly in Overleaf.",
          },
          { status: 504 }
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }

    if (!compileRes.ok) {
      const errorText = await compileRes.text().catch(() => "Compilation error");
      console.error("LaTeX compilation failed:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to compile LaTeX into PDF. There may be unsupported syntax in the template.",
          details: errorText.substring(0, 500),
        },
        { status: 422 }
      );
    }

    const pdfBuffer = await compileRes.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });

  } catch (error) {
    console.error("LaTeX compile route error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error during PDF compilation." },
      { status: 500 }
    );
  }
}

