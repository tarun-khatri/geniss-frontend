import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ATLOSPostback {
  OrderId: string;
  TransactionId: string;
  Status: number;
  BlockchainHash: string;
  UserWallet?: string;
  TimeSent: string;
  Amount: number;
  PaidAmount: number;
  Fee: number;
  OrderAmount: number;
  OrderCurrency: string;
  MerchantId: string;
  Blockchain: string;
  Asset: string;
  UserEmail?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const postbackData: ATLOSPostback = await req.json();

    console.log("Received ATLOS postback:", postbackData);

    if (postbackData.Status !== 100) {
      console.log("Payment not successful, status:", postbackData.Status);
      return new Response(
        JSON.stringify({ success: true, message: "Payment not completed" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: payment, error: paymentFetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", postbackData.OrderId)
      .maybeSingle();

    if (paymentFetchError) {
      console.error("Error fetching payment:", paymentFetchError);
      throw paymentFetchError;
    }

    if (!payment) {
      console.log("Payment not found for order ID:", postbackData.OrderId);
      return new Response(
        JSON.stringify({ success: false, error: "Payment not found" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (payment.status === "completed") {
      console.log("Payment already completed:", postbackData.OrderId);
      return new Response(
        JSON.stringify({ success: true, message: "Payment already processed" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        status: "completed",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (paymentUpdateError) {
      console.error("Error updating payment:", paymentUpdateError);
      throw paymentUpdateError;
    }

    if (payment.user_account_id) {
      const { error: accountUpdateError } = await supabase
        .from("user_accounts")
        .update({
          status: "active",
        })
        .eq("id", payment.user_account_id);

      if (accountUpdateError) {
        console.error("Error updating account:", accountUpdateError);
        throw accountUpdateError;
      }
    }

    console.log("Payment processed successfully:", postbackData.OrderId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment processed successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Postback error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process postback",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});