import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALPACA_API_KEY = 'CKIFRS6SGBIBNSSLIHKNOZAHWT';
const ALPACA_SECRET_KEY = '7TMceep5iWo2nx6rqiQSxoK41mvz48TsdbL5pV22xN24';

interface MonitorRequest {
  userAccountId: string;
}

async function getCurrentPrice(symbol: string): Promise<number> {
  const cryptoSymbol = symbol.replace('BINANCE:', '').replace('USDT', '/USD');

  const response = await fetch(
    `https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols=${cryptoSymbol}`,
    {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch price for ${symbol}`);
  }

  const data = await response.json();
  const tradeData = data.trades[cryptoSymbol];

  if (!tradeData) {
    throw new Error(`Price data not available for ${symbol}`);
  }

  return tradeData.p;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: MonitorRequest = await req.json();
    const { userAccountId } = body;

    const { data: account, error: accountError } = await supabase
      .from('user_accounts')
      .select('*, challenges(*)')
      .eq('id', userAccountId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error('Account not found');
    }

    const { data: openPositions, error: positionsError } = await supabase
      .from('positions')
      .select('*')
      .eq('user_account_id', userAccountId)
      .eq('status', 'open');

    if (positionsError) {
      throw new Error('Failed to fetch positions');
    }

    let totalUnrealizedPnl = 0;
    const positionsToLiquidate: string[] = [];
    const updatedPositions = [];

    for (const position of openPositions || []) {
      const currentPrice = await getCurrentPrice(position.symbol);
      const leverage = position.leverage || 1;

      let unrealizedPnl: number;
      if (position.side === 'long') {
        unrealizedPnl = (currentPrice - position.entry_price) * position.quantity * leverage;
      } else {
        unrealizedPnl = (position.entry_price - currentPrice) * position.quantity * leverage;
      }

      totalUnrealizedPnl += unrealizedPnl;

      await supabase
        .from('positions')
        .update({
          current_price: currentPrice,
          unrealized_pnl: unrealizedPnl,
        })
        .eq('id', position.id);

      updatedPositions.push({
        id: position.id,
        symbol: position.symbol,
        currentPrice,
        unrealizedPnl,
      });

      if (position.stop_loss &&
          ((position.side === 'long' && currentPrice <= position.stop_loss) ||
           (position.side === 'short' && currentPrice >= position.stop_loss))) {
        positionsToLiquidate.push(position.id);
      }

      if (position.take_profit &&
          ((position.side === 'long' && currentPrice >= position.take_profit) ||
           (position.side === 'short' && currentPrice <= position.take_profit))) {
        positionsToLiquidate.push(position.id);
      }
    }

    const currentEquity = account.balance + totalUnrealizedPnl;
    const dailyPnl = currentEquity - account.initial_balance;
    const dailyPnlPercent = (dailyPnl / account.initial_balance) * 100;
    const drawdown = ((account.initial_balance - currentEquity) / account.initial_balance) * 100;

    const challenge = account.challenges;
    const dailyLossLimit = challenge.daily_loss_limit;
    const maxDrawdown = challenge.max_drawdown;

    let shouldLiquidateAll = false;
    let liquidationReason = '';

    if (dailyPnlPercent <= -dailyLossLimit) {
      shouldLiquidateAll = true;
      liquidationReason = `Daily loss limit of ${dailyLossLimit}% breached`;
    }

    if (drawdown >= maxDrawdown) {
      shouldLiquidateAll = true;
      liquidationReason = `Maximum drawdown of ${maxDrawdown}% breached`;
    }

    if (shouldLiquidateAll) {
      for (const position of openPositions || []) {
        const currentPrice = await getCurrentPrice(position.symbol);
        const leverage = position.leverage || 1;

        let realizedPnl: number;
        if (position.side === 'long') {
          realizedPnl = (currentPrice - position.entry_price) * position.quantity * leverage;
        } else {
          realizedPnl = (position.entry_price - currentPrice) * position.quantity * leverage;
        }

        await supabase
          .from('positions')
          .update({
            current_price: currentPrice,
            unrealized_pnl: realizedPnl,
            closed_at: new Date().toISOString(),
            status: 'liquidated',
          })
          .eq('id', position.id);

        await supabase
          .from('trades')
          .update({
            exit_price: currentPrice,
            profit_loss: realizedPnl,
            closed_at: new Date().toISOString(),
            status: 'closed',
          })
          .eq('position_id', position.id)
          .eq('trade_type', 'open');
      }

      await supabase
        .from('user_accounts')
        .update({
          status: 'failed',
          balance: currentEquity,
          profit_loss: dailyPnl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', userAccountId);

      return new Response(
        JSON.stringify({
          liquidated: true,
          reason: liquidationReason,
          finalBalance: currentEquity,
          dailyPnl,
          dailyPnlPercent,
          drawdown,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    for (const positionId of positionsToLiquidate) {
      const position = openPositions?.find(p => p.id === positionId);
      if (!position) continue;

      const currentPrice = await getCurrentPrice(position.symbol);
      const leverage = position.leverage || 1;

      let realizedPnl: number;
      if (position.side === 'long') {
        realizedPnl = (currentPrice - position.entry_price) * position.quantity * leverage;
      } else {
        realizedPnl = (position.entry_price - currentPrice) * position.quantity * leverage;
      }

      await supabase
        .from('positions')
        .update({
          current_price: currentPrice,
          unrealized_pnl: realizedPnl,
          closed_at: new Date().toISOString(),
          status: 'closed',
        })
        .eq('id', positionId);

      await supabase
        .from('trades')
        .update({
          exit_price: currentPrice,
          profit_loss: realizedPnl,
          closed_at: new Date().toISOString(),
          status: 'closed',
        })
        .eq('position_id', positionId)
        .eq('trade_type', 'open');
    }

    await supabase
      .from('account_snapshots')
      .insert({
        user_account_id: userAccountId,
        balance: account.balance,
        equity: currentEquity,
        unrealized_pnl: totalUnrealizedPnl,
        daily_pnl: dailyPnl,
        daily_pnl_percent: dailyPnlPercent,
        max_drawdown: drawdown,
      });

    return new Response(
      JSON.stringify({
        liquidated: false,
        equity: currentEquity,
        balance: account.balance,
        unrealizedPnl: totalUnrealizedPnl,
        dailyPnl,
        dailyPnlPercent,
        drawdown,
        positions: updatedPositions,
        positionsLiquidated: positionsToLiquidate.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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
