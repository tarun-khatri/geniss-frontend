import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentRequest {
  challengeId: string;
  challengeName: string;
  amount: number;
  userEmail: string;
  orderId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { challengeId, challengeName, amount, userEmail, orderId }: PaymentRequest = await req.json();

    const merchantId = Deno.env.get("ATLOS_MERCHANT_ID");
    const apiSecret = Deno.env.get("ATLOS_API_SECRET");

    if (!merchantId || !apiSecret) {
      throw new Error("ATLOS credentials not configured");
    }

    const invoiceData = {
      MerchantId: merchantId,
      OrderId: orderId,
      OrderAmount: amount,
      OrderCurrency: "USD",
      UserEmail: userEmail,
      Memo: `${challengeName} - Trading Challenge`,
      SendEmail: false,
      ExpireAfter: 3600,
    };

    const response = await fetch("https://api.atlos.io/gateway/rest/Invoice/Create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ApiSecret": apiSecret,
      },
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ATLOS API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: data.Id,
        paymentLink: data.PaymentLink,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to create payment",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});