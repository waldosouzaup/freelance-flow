import { Handler } from "@netlify/functions";
import { Resend } from "resend";

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método não permitido. Use POST." }),
    };
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error:
          "Chave RESEND_API_KEY não encontrada nas variáveis de ambiente. Configure RESEND_API_KEY no painel da Netlify ou no arquivo .env.",
      }),
    };
  }

  try {
    const { to, subject, message, senderName, pdfBase64, filename } = JSON.parse(
      event.body || "{}"
    );

    if (!to || !subject) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Destinatário ('to') e Assunto ('subject') são obrigatórios." }),
      };
    }

    const resend = new Resend(apiKey);

    // Resend sandbox uses 'onboarding@resend.dev' until user verifies their custom domain
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const from = senderName ? `${senderName} <${fromAddress}>` : fromAddress;

    const formattedHtml = message
      ? message.replace(/\n/g, "<br/>")
      : "<p>Segue em anexo a proposta comercial.</p>";

    const emailPayload: any = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text: message,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 18px; border-bottom: 2px solid #10b981; padding-bottom: 8px;">
            ${subject}
          </h2>
          <div style="font-size: 14px; line-height: 1.6; margin: 16px 0; color: #334155;">
            ${formattedHtml}
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            Este e-mail contém um orçamento em formato PDF anexado emitido através do Freelance Flow.
          </p>
        </div>
      `,
    };

    if (pdfBase64) {
      emailPayload.attachments = [
        {
          filename: filename || "Orcamento.pdf",
          content: pdfBase64,
        },
      ];
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error("[Resend Error]:", error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: error.message || "Erro retornado pela API do Resend.",
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: data?.id }),
    };
  } catch (err: any) {
    console.error("[send-budget-email] Unexpected error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Erro interno ao processar envio de e-mail." }),
    };
  }
};
