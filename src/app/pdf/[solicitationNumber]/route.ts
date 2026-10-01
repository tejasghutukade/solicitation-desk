import { readStoredPdf } from "@/lib/desk/app";

export async function GET(
  _request: Request,
  context: { params: Promise<{ solicitationNumber: string }> },
): Promise<Response> {
  const { solicitationNumber } = await context.params;
  const pdf = readStoredPdf(solicitationNumber);
  if (!pdf) {
    return new Response("PDF is not stored", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const filename = `${solicitationNumber.replace(/["\r\n]/g, "")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
