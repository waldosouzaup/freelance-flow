export interface SendBudgetEmailParams {
  to: string;
  subject: string;
  message: string;
  senderName: string;
  pdfBase64?: string;
  filename?: string;
}

export interface SendEmailResponse {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendBudgetEmail(params: SendBudgetEmailParams): Promise<SendEmailResponse> {
  const { to, subject, message, senderName, pdfBase64, filename } = params;

  // 1. Try Netlify Serverless Function first
  try {
    const response = await fetch("/.netlify/functions/send-budget-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject,
        message,
        senderName,
        pdfBase64,
        filename,
      }),
    });

    // If endpoint exists and responded
    if (response.status !== 404) {
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Erro no envio do e-mail via servidor.",
        };
      }
      return { success: true, id: data.id };
    }
  } catch (err: any) {
    console.warn("Netlify function endpoint not reachable, checking client API key fallback...", err);
  }

  // 2. Direct Resend Client Fallback (useful during local Vite development)
  const clientApiKey = import.meta.env.VITE_RESEND_API_KEY;
  if (clientApiKey) {
    try {
      const formattedHtml = message
        ? message.replace(/\n/g, "<br/>")
        : "<p>Segue em anexo a proposta comercial.</p>";

      const fromAddress = import.meta.env.VITE_RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const from = senderName ? `${senderName} <${fromAddress}>` : fromAddress;

      const payload: any = {
        from,
        to: [to],
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
        payload.attachments = [
          {
            filename: filename || "Orcamento.pdf",
            content: pdfBase64,
          },
        ];
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.message || resData.error || "Erro retornado pela API do Resend.",
        };
      }

      return { success: true, id: resData.id };
    } catch (err: any) {
      return {
        success: false,
        error: `Falha na requisição para Resend: ${err.message}`,
      };
    }
  }

  return {
    success: false,
    error:
      "A função de envio da Netlify não foi encontrada no ambiente local e nenhuma chave VITE_RESEND_API_KEY foi definida no arquivo .env. Para enviar automaticamente pelo Resend, adicione RESEND_API_KEY ou VITE_RESEND_API_KEY no seu .env.",
  };
}
