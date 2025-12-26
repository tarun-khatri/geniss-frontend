import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALPACA_API_KEY = 'CKIFRS6SGBIBNSSLIHKNOZAHWT';
const ALPACA_SECRET_KEY = '7TMceep5iWo2nx6rqiQSxoK41mvz48TsdbL5pV22xN24';
const ALPACA_BASE_URL = 'https://broker-api.sandbox.alpaca.markets';

interface TradeRequest {
  userAccountId: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface ClosePositionRequest {
  positionId: string;
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
    throw new Error('Failed to fetch current price from Alpaca');
  }

  const data = await response.json();
  const tradeData = data.trades[cryptoSymbol];

  if (!tradeData) {
    throw new Error('Price data not available');
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

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'open' && req.method === 'POST') {
      const body: TradeRequest = await req.json();
      const { userAccountId, symbol, side, quantity, leverage = 1, stopLoss, takeProfit } = body;

      const { data: account, error: accountError } = await supabase
        .from('user_accounts')
        .select('*, challenges(*)')
        .eq('id', userAccountId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (accountError || !account) {
        throw new Error('Account not found');
      }

      if (account.status !== 'active') {
        throw new Error('Account is not active');
      }

      const currentPrice = await getCurrentPrice(symbol);
      const positionValue = currentPrice * quantity;
      const marginRequired = positionValue / leverage;

      if (marginRequired > account.balance * 0.95) {
        throw new Error('Insufficient balance for this trade');
      }

      const { data: position, error: positionError } = await supabase
        .from('positions')
        .insert({
          user_account_id: userAccountId,
          symbol,
          side,
          entry_price: currentPrice,
          quantity,
          leverage,
          current_price: currentPrice,
          unrealized_pnl: 0,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          status: 'open',
        })
        .select()
        .single();

      if (positionError) {
        throw new Error('Failed to create position');
      }

      await supabase
        .from('trades')
        .insert({
          user_account_id: userAccountId,
          position_id: position.id,
          symbol,
          type: side,
          entry_price: currentPrice,
          quantity,
          profit_loss: 0,
          status: 'open',
          trade_type: 'open',
        });

      await supabase
        .from('user_accounts')
        .update({
          total_trades: (account.total_trades || 0) + 1,
        })
        .eq('id', userAccountId);

      return new Response(
        JSON.stringify({ success: true, position }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === 'close' && req.method === 'POST') {
      const body: ClosePositionRequest = await req.json();
      const { positionId, userAccountId } = body;

      const { data: position, error: positionError } = await supabase
        .from('positions')
        .select('*, user_accounts!inner(user_id, balance, initial_balance, winning_trades, losing_trades)')
        .eq('id', positionId)
        .eq('user_account_id', userAccountId)
        .eq('user_accounts.user_id', user.id)
        .maybeSingle();

      if (positionError || !position) {
        throw new Error('Position not found');
      }

      if (position.status !== 'open') {
        throw new Error('Position is not open');
      }

      const currentPrice = await getCurrentPrice(position.symbol);
      const leverage = position.leverage || 1;

      let realizedPnl: number;
      if (position.side === 'long') {
        realizedPnl = (currentPrice - position.entry_price) * position.quantity * leverage;
      } else {
        realizedPnl = (position.entry_price - currentPrice) * position.quantity * leverage;
      }

      const account = position.user_accounts;
      const newBalance = account.balance + realizedPnl;
      const isWinning = realizedPnl > 0;

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

      await supabase
        .from('user_accounts')
        .update({
          balance: newBalance,
          profit_loss: (account.balance - account.initial_balance) + realizedPnl,
          winning_trades: account.winning_trades + (isWinning ? 1 : 0),
          losing_trades: account.losing_trades + (isWinning ? 0 : 1),
        })
        .eq('id', userAccountId);

      return new Response(
        JSON.stringify({
          success: true,
          realizedPnl,
          newBalance,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        status: 400,
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
