"""
================================================================================
  📈 Stock Sensei AI — Universal Prediction Engine v3
  Pre-trained Base + Fine-Tune | Full Visual Suite | Any Stock Worldwide
================================================================================

Three-Phase Architecture:
  Phase 1 — Base Training  (run ONCE, ~15-25 min)
    20 global stocks → TGT Base Model → base_model.pt

  Phase 2 — Fine-Tune  (per new ticker, ~3-5 min)
    fine_tune_stock("RELIANCE.NS")
    → Auto-detects peers → Downloads data → Trains → Prints ALL graphs

  Phase 3 — Daily Cron  (backend server, auto every market close)
    daily_update() → re-fine-tunes all registered stocks

Components:
  GCN              : Auto-detected sector peers graph convolution
  GRU              : Sequential short-term patterns
  Transformer      : Multi-head self-attention long-range
  Fusion Head      : Learnable weighted combination

Usage:
  fine_tune_stock("RELIANCE.NS")   # fine-tune & get all 8 charts
  predict_stock("RELIANCE.NS")     # quick prediction for trained stock
  daily_update()                   # re-train all registered stocks
================================================================================
"""

# ══════════════════════════════════════════════════════════════════════════════
#  1. Install Dependencies
# ══════════════════════════════════════════════════════════════════════════════

import subprocess, sys

pkgs = ["yfinance", "torch", "pandas", "numpy", "matplotlib",
        "seaborn", "scikit-learn", "ta", "scipy", "tqdm", "joblib"]
for p in pkgs:
    subprocess.check_call([sys.executable, "-m", "pip", "install", p, "-q"])
print("All packages ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  2. Imports & Plot Theme
# ══════════════════════════════════════════════════════════════════════════════

import os, json, math, time, warnings, re
from datetime import datetime, timedelta
from pathlib import Path
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from scipy.stats import pearsonr

import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns

plt.rcParams.update({
    "figure.facecolor": "#0F172A", "axes.facecolor":   "#1E293B",
    "axes.edgecolor":   "#334155", "axes.labelcolor":  "#CBD5E1",
    "xtick.color":      "#CBD5E1", "ytick.color":      "#CBD5E1",
    "text.color":       "#F1F5F9", "grid.color":       "#1E293B",
    "legend.facecolor": "#1E293B", "legend.edgecolor": "#334155",
    "axes.grid": True,             "grid.alpha":       0.3,
})
ACCENT, GREEN, RED, PURPLE, ORANGE = "#38BDF8", "#4ADE80", "#F87171", "#A78BFA", "#FB923C"

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import yfinance as yf
import ta, joblib

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device : {DEVICE}")
print(f"PyTorch: {torch.__version__}")
print(f"Date   : {datetime.now().strftime('%Y-%m-%d %H:%M')}")


# ══════════════════════════════════════════════════════════════════════════════
#  3. Configuration & Sector Peer Maps
# ══════════════════════════════════════════════════════════════════════════════

MODEL_DIR       = Path("models"); MODEL_DIR.mkdir(exist_ok=True)
BASE_MODEL_PATH = MODEL_DIR / "base_model.pt"
REGISTRY_PATH   = MODEL_DIR / "stock_registry.json"

FEATURE_COLS = [
    "Close", "log_return", "ema_9", "ema_21", "ema_50", "sma_20",
    "macd", "macd_sig", "macd_diff", "adx",
    "rsi_14", "stoch_k", "stoch_d", "cci", "williams_r", "roc",
    "bb_high", "bb_low", "bb_mid", "bb_width", "atr",
    "obv", "vwap", "mfi", "cmf", "volatility_5", "price_range"
]
N_FEATURES = len(FEATURE_COLS)
CLOSE_IDX  = FEATURE_COLS.index("Close")

BASE_CONFIG = dict(
    seq_len=60, pred_horizon=5,
    hidden_dim=128, num_gru_layers=2, num_heads=4, num_tf_layers=3,
    dropout=0.2, gcn_out_dim=64,
    epochs=120, batch_size=32, lr=3e-4, weight_decay=1e-5,
    patience=18, val_split=0.15, test_split=0.10,
)
FINETUNE_CONFIG = dict(
    seq_len=60, pred_horizon=5,
    hidden_dim=128, num_gru_layers=2, num_heads=4, num_tf_layers=3,
    dropout=0.2, gcn_out_dim=64,
    epochs=60, batch_size=16, lr=8e-5, weight_decay=1e-5,
    patience=12, val_split=0.15, test_split=0.10,
)

SECTOR_PEERS = {
    "Technology":             ["TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"],
    "Energy":                 ["RELIANCE.NS", "ONGC.NS", "IOC.NS", "BPCL.NS", "GAIL.NS"],
    "Financial Services":     ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "AXISBANK.NS", "KOTAKBANK.NS"],
    "Consumer Defensive":     ["HINDUNILVR.NS", "NESTLEIND.NS", "BRITANNIA.NS", "DABUR.NS"],
    "Healthcare":             ["SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS"],
    "Industrials":            ["LT.NS", "SIEMENS.NS", "ABB.NS", "BEL.NS", "HAL.NS"],
    "Basic Materials":        ["TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "COALINDIA.NS"],
    "Consumer Cyclical":      ["MARUTI.NS", "TATAMOTORS.NS", "M&M.NS", "BAJAJ-AUTO.NS"],
    "Communication Services": ["BHARTIARTL.NS", "IDEA.NS", "TATACOMM.NS"],
    "US_Technology":          ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "AMD"],
    "US_Financial":           ["JPM", "BAC", "GS", "MS", "WFC"],
    "US_Healthcare":          ["JNJ", "PFE", "UNH", "MRK", "ABBV"],
    "US_Energy":              ["XOM", "CVX", "COP", "SLB", "EOG"],
    "US_Consumer":            ["AMZN", "TSLA", "HD", "MCD", "NKE"],
    "UK_Energy":              ["BP.L", "SHEL.L", "SSE.L"],
    "UK_Financial":           ["HSBA.L", "LLOY.L", "BARC.L", "NWG.L"],
}
EXCHANGE_REGION = {".NS": "IN", ".BO": "IN", ".L": "UK", ".T": "JP", "": "US"}


def get_suffix(ticker):
    m = re.search(r"(\.[A-Z]+)$", ticker)
    return m.group(1) if m else ""


def auto_peers(ticker, n=4):
    suffix = get_suffix(ticker)
    region = EXCHANGE_REGION.get(suffix, "US")
    try:
        sector = yf.Ticker(ticker).info.get("sector", "")
        print(f"  Sector: '{sector}' | Region: {region}")
    except Exception:
        sector = ""
    peers = []
    for key, plist in SECTOR_PEERS.items():
        if sector and (key.lower() in sector.lower() or sector.lower() in key.lower()):
            peers = [p for p in plist if p != ticker][:n]
            break
    if not peers:
        if region == "IN":   peers = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"]
        elif region == "UK": peers = ["BP.L", "HSBA.L", "BARC.L", "LLOY.L"]
        else:                peers = ["SPY", "QQQ", "MSFT", "GOOGL"]
    peers = [p for p in peers if p != ticker][:n]
    print(f"  Peers: {peers}")
    return peers


print(f"Feature cols   : {N_FEATURES}")
print(f"Sector maps    : {len(SECTOR_PEERS)}")
print(f"Model directory: {MODEL_DIR.resolve()}")


# ══════════════════════════════════════════════════════════════════════════════
#  4. Data Pipeline & Feature Engineering
# ══════════════════════════════════════════════════════════════════════════════

def download_data(tickers, start, end, verbose=True):
    result = {}
    for t in tickers:
        try:
            df = yf.download(t, start=start, end=end, auto_adjust=True, progress=False)
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            df.dropna(inplace=True)
            if len(df) < 120:
                continue
            df = add_features(df)
            result[t] = df
            if verbose:
                print(f"  {t}: {len(df)} rows [{df.index[0].date()} -> {df.index[-1].date()}]")
        except Exception as e:
            if verbose:
                print(f"  {t}: SKIP ({e})")
    return result


def add_features(df):
    c = df["Close"].squeeze(); h = df["High"].squeeze()
    l = df["Low"].squeeze();   v = df["Volume"].squeeze()

    df["ema_9"]     = ta.trend.EMAIndicator(c, 9).ema_indicator()
    df["ema_21"]    = ta.trend.EMAIndicator(c, 21).ema_indicator()
    df["ema_50"]    = ta.trend.EMAIndicator(c, 50).ema_indicator()
    df["sma_20"]    = ta.trend.SMAIndicator(c, 20).sma_indicator()
    macd            = ta.trend.MACD(c)
    df["macd"]      = macd.macd()
    df["macd_sig"]  = macd.macd_signal()
    df["macd_diff"] = macd.macd_diff()
    df["adx"]       = ta.trend.ADXIndicator(h, l, c).adx()
    df["rsi_14"]    = ta.momentum.RSIIndicator(c, 14).rsi()
    st              = ta.momentum.StochasticOscillator(h, l, c)
    df["stoch_k"]   = st.stoch()
    df["stoch_d"]   = st.stoch_signal()
    df["cci"]       = ta.trend.CCIIndicator(h, l, c).cci()
    df["williams_r"]= ta.momentum.WilliamsRIndicator(h, l, c).williams_r()
    df["roc"]       = ta.momentum.ROCIndicator(c).roc()
    bb              = ta.volatility.BollingerBands(c)
    df["bb_high"]   = bb.bollinger_hband()
    df["bb_low"]    = bb.bollinger_lband()
    df["bb_mid"]    = bb.bollinger_mavg()
    df["bb_width"]  = bb.bollinger_wband()
    df["atr"]       = ta.volatility.AverageTrueRange(h, l, c).average_true_range()
    df["obv"]       = ta.volume.OnBalanceVolumeIndicator(c, v).on_balance_volume()
    df["vwap"]      = ta.volume.VolumeWeightedAveragePrice(h, l, c, v).volume_weighted_average_price()
    df["mfi"]       = ta.volume.MFIIndicator(h, l, c, v).money_flow_index()
    df["cmf"]       = ta.volume.ChaikinMoneyFlowIndicator(h, l, c, v).chaikin_money_flow()
    df["log_return"]    = np.log(c / c.shift(1))
    df["volatility_5"]  = df["log_return"].rolling(5).std()
    df["price_range"]   = (h - l) / c

    df.dropna(inplace=True)
    keep  = [f for f in FEATURE_COLS if f in df.columns]
    extra = [x for x in ["Open", "High", "Low", "Volume"]
             if x in df.columns and x not in keep]
    return df[keep + extra]


def build_graph(processed, threshold=0.25):
    tickers = list(processed.keys()); n = len(tickers)
    rets    = {t: processed[t]["log_return"].dropna()
               for t in tickers if "log_return" in processed[t]}
    common  = None
    for s in rets.values():
        common = s.index if common is None else common.intersection(s.index)
    corr = np.eye(n)
    for i in range(n):
        for j in range(i + 1, n):
            try:
                r, _ = pearsonr(rets[tickers[i]].loc[common],
                                rets[tickers[j]].loc[common])
                corr[i, j] = corr[j, i] = r
            except Exception:
                pass
    adj = (np.abs(corr) > threshold).astype(float)
    np.fill_diagonal(adj, 1.0)
    return adj, tickers, corr


def scale_data(processed, target, fit=True, existing=None):
    common = None
    for df in processed.values():
        idx    = df[[f for f in FEATURE_COLS if f in df.columns]].dropna().index
        common = idx if common is None else common.intersection(idx)
    scalers, scaled = {}, {}
    for t, df in processed.items():
        fc  = [f for f in FEATURE_COLS if f in df.columns]
        arr = df.loc[common, fc].values
        if fit or existing is None:
            sc  = MinMaxScaler((0, 1)); arr = sc.fit_transform(arr)
        else:
            sc  = existing.get(t, MinMaxScaler((0, 1)).fit(arr))
            arr = sc.transform(arr)
        scalers[t] = sc; scaled[t] = arr
    csc = MinMaxScaler()
    cv  = processed[target].loc[common, ["Close"]].values
    if fit or existing is None:
        csc.fit(cv)
    else:
        csc = existing.get("__close__", MinMaxScaler().fit(cv))
    scalers["__close__"] = csc
    return scaled, scalers, common


print("Data pipeline ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  5. EDA Visualisation
# ══════════════════════════════════════════════════════════════════════════════

def plot_eda(df, ticker):
    fig = plt.figure(figsize=(20, 16), facecolor="#0F172A")
    fig.suptitle(f"Exploratory Data Analysis  |  {ticker}",
                 color="#F1F5F9", fontsize=16, y=0.99)
    gs    = gridspec.GridSpec(3, 3, figure=fig, hspace=0.45, wspace=0.35)
    close = df["Close"].squeeze(); vol = df["Volume"].squeeze()

    ax1 = fig.add_subplot(gs[0, :2])
    ax1.plot(df.index, close, color=ACCENT, lw=1.8, label="Close")
    if "ema_21" in df:
        ax1.plot(df.index, df["ema_21"].squeeze(), color=GREEN,  lw=1, label="EMA-21", alpha=0.85)
    if "ema_50" in df:
        ax1.plot(df.index, df["ema_50"].squeeze(), color=ORANGE, lw=1, label="EMA-50", alpha=0.85)
    if "bb_low" in df:
        ax1.fill_between(df.index, df["bb_low"].squeeze(), df["bb_high"].squeeze(),
                         alpha=0.12, color=PURPLE, label="BB Band")
    ax1.set_title("Price History + Bollinger Bands", color="#CBD5E1")
    ax1.legend(fontsize=8); ax1.set_ylabel("Price")

    ax2 = fig.add_subplot(gs[0, 2])
    ax2.bar(df.index, vol.values, color=ACCENT, alpha=0.65, width=1)
    ax2.set_title("Volume", color="#CBD5E1"); ax2.set_ylabel("Shares")

    ax3 = fig.add_subplot(gs[1, 0])
    if "rsi_14" in df:
        ax3.plot(df.index, df["rsi_14"].squeeze(), color=PURPLE, lw=1.2)
        ax3.axhline(70, color=RED,   lw=0.9, ls="--", label="Overbought")
        ax3.axhline(30, color=GREEN, lw=0.9, ls="--", label="Oversold")
        ax3.legend(fontsize=7)
    ax3.set_title("RSI (14)", color="#CBD5E1")

    ax4 = fig.add_subplot(gs[1, 1])
    if "macd" in df:
        ax4.plot(df.index, df["macd"].squeeze(),     color=ACCENT, lw=1.2, label="MACD")
        ax4.plot(df.index, df["macd_sig"].squeeze(), color=RED,    lw=1.2, label="Signal")
        ax4.bar(df.index, df["macd_diff"].squeeze(), color=GREEN,  alpha=0.4, width=1)
        ax4.legend(fontsize=7)
    ax4.set_title("MACD", color="#CBD5E1")

    ax5 = fig.add_subplot(gs[1, 2])
    if "log_return" in df:
        lr = df["log_return"].dropna().squeeze()
        ax5.hist(lr, bins=80, color=ACCENT, alpha=0.75, edgecolor="none")
        ax5.axvline(0, color=RED,   lw=1.2, ls="--")
        ax5.axvline(float(lr.mean()), color=GREEN, lw=1, ls="--",
                    label=f"mean={float(lr.mean()):.4f}")
        ax5.legend(fontsize=7)
    ax5.set_title("Log Return Distribution", color="#CBD5E1"); ax5.set_xlabel("Log Return")

    ax6 = fig.add_subplot(gs[2, :])
    hm_cols = ["Close", "rsi_14", "macd", "adx", "atr", "obv", "mfi",
               "bb_width", "log_return", "volatility_5", "cmf", "cci"]
    hm_cols = [col for col in hm_cols if col in df.columns]
    cm   = df[hm_cols].corr()
    mask = np.triu(np.ones_like(cm, dtype=bool))
    sns.heatmap(cm, mask=mask, cmap=sns.diverging_palette(220, 20, as_cmap=True),
                center=0, ax=ax6, annot=True, fmt=".2f", annot_kws={"size": 7},
                linewidths=0.5, linecolor="#0F172A", cbar_kws={"shrink": 0.5})
    ax6.set_title("Feature Correlation Heatmap", color="#CBD5E1", pad=8)

    fname = f"eda_{ticker.replace('.', '_')}.png"
    plt.savefig(fname, dpi=150, bbox_inches="tight", facecolor="#0F172A")
    plt.show(); print(f"Saved: {fname}")


print("plot_eda() ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  6. GCN Graph Visualisation
# ══════════════════════════════════════════════════════════════════════════════

def plot_graph(corr_mat, adj_mat, tickers, ticker):
    fig, axes = plt.subplots(1, 2, figsize=(14, 5), facecolor="#0F172A")
    fig.suptitle(f"GCN Peer Graph  |  {ticker}", color="#F1F5F9", fontsize=13)

    sns.heatmap(corr_mat, xticklabels=tickers, yticklabels=tickers,
                annot=True, fmt=".2f", cmap="RdYlGn", center=0,
                linewidths=1, linecolor="#0F172A", ax=axes[0], cbar_kws={"shrink": 0.8})
    axes[0].set_title("Pearson Correlation", color="#CBD5E1")

    sns.heatmap(adj_mat, xticklabels=tickers, yticklabels=tickers,
                annot=True, fmt=".0f", cmap="Blues",
                linewidths=1, linecolor="#0F172A", ax=axes[1], cbar_kws={"shrink": 0.8})
    axes[1].set_title("Adjacency Matrix (threshold 0.25)", color="#CBD5E1")

    plt.tight_layout()
    fname = f"graph_{ticker.replace('.', '_')}.png"
    plt.savefig(fname, dpi=150, bbox_inches="tight", facecolor="#0F172A")
    plt.show(); print(f"Saved: {fname}")


print("plot_graph() ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  7. Dataset & DataLoaders
# ══════════════════════════════════════════════════════════════════════════════

class StockDataset(Dataset):
    def __init__(self, scaled, tickers, target, seq_len, horizon):
        self.seq_len    = seq_len
        self.horizon    = horizon
        self.target_idx = tickers.index(target)
        T               = scaled[tickers[0]].shape[0]
        self.data       = np.stack([scaled[t] for t in tickers], axis=1)
        self.idx        = list(range(seq_len, T - horizon + 1))

    def __len__(self):
        return len(self.idx)

    def __getitem__(self, i):
        t  = self.idx[i]
        xg = torch.tensor(self.data[t - self.seq_len:t], dtype=torch.float32)
        xs = xg[:, self.target_idx, :]
        y  = torch.tensor(
            self.data[t:t + self.horizon, self.target_idx, CLOSE_IDX],
            dtype=torch.float32
        )
        return xg, xs, y


def make_loaders(scaled, tickers, target, cfg):
    ds  = StockDataset(scaled, tickers, target, cfg["seq_len"], cfg["pred_horizon"])
    N   = len(ds)
    nte = max(1, int(N * cfg.get("test_split", 0.10)))
    nva = max(1, int(N * cfg.get("val_split", 0.15)))
    ntr = N - nva - nte
    tr, va, te = torch.utils.data.random_split(
        ds, [ntr, nva, nte],
        generator=torch.Generator().manual_seed(SEED)
    )
    bs = cfg["batch_size"]
    return (
        DataLoader(tr, batch_size=bs, shuffle=True,  drop_last=True),
        DataLoader(va, batch_size=bs, shuffle=False),
        DataLoader(te, batch_size=bs, shuffle=False),
        ntr, nva, nte
    )


print("Dataset ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  8. Temporal Graph Transformer (TGT) Architecture
# ══════════════════════════════════════════════════════════════════════════════

class GCNLayer(nn.Module):
    def __init__(self, in_f, out_f, adj, drop=0.1):
        super().__init__()
        self.fc   = nn.Linear(in_f, out_f)
        self.drop = nn.Dropout(drop)
        self.act  = nn.GELU()
        A  = torch.tensor(adj, dtype=torch.float32)
        D  = A.sum(1); Di = torch.diag(D.pow(-0.5))
        self.register_buffer("AN", Di @ A @ Di)

    def forward(self, x):
        return self.drop(self.act(self.fc(self.AN @ x)))


class GCNEncoder(nn.Module):
    def __init__(self, in_d, hid, out_d, adj, drop=0.1):
        super().__init__()
        self.g1   = GCNLayer(in_d, hid,   adj, drop)
        self.g2   = GCNLayer(hid,  out_d, adj, drop)
        self.proj = nn.Linear(in_d, out_d)
        self.norm = nn.LayerNorm(out_d)

    def forward(self, x):
        return self.norm(self.g2(self.g1(x)) + self.proj(x))


class PosEnc(nn.Module):
    def __init__(self, d, maxlen=512, drop=0.1):
        super().__init__()
        self.drop = nn.Dropout(drop)
        pe  = torch.zeros(maxlen, d)
        pos = torch.arange(maxlen).unsqueeze(1).float()
        div = torch.exp(torch.arange(0, d, 2).float() * (-math.log(10000) / d))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x):
        return self.drop(x + self.pe[:, :x.size(1)])


class TGT(nn.Module):
    def __init__(self, n_feat, n_stocks, adj, gcn_out=64, hidden=128,
                 n_gru=2, n_heads=4, n_tf=3, horizon=5, drop=0.2, seq_len=60):
        super().__init__()
        self.gcn_out = gcn_out; self.hidden = hidden
        self.gcn     = GCNEncoder(n_feat, gcn_out * 2, gcn_out, adj, drop)

        self.gru_proj = nn.Linear(n_feat + gcn_out, hidden)
        self.gru      = nn.GRU(hidden, hidden, n_gru, batch_first=True,
                               dropout=drop if n_gru > 1 else 0)
        self.gru_norm = nn.LayerNorm(hidden)

        self.tf_proj = nn.Linear(n_feat, hidden)
        self.pe      = PosEnc(hidden, seq_len + 10, drop)
        enc          = nn.TransformerEncoderLayer(hidden, n_heads, hidden * 4, drop,
                                                  batch_first=True, activation="gelu")
        self.tf      = nn.TransformerEncoder(enc, n_tf, nn.LayerNorm(hidden))

        self.alpha = nn.Parameter(torch.ones(3) / 3)
        self.head  = nn.Sequential(
            nn.Linear(hidden, hidden // 2), nn.GELU(),
            nn.Dropout(drop), nn.Linear(hidden // 2, horizon)
        )
        self._init()

    def _init(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def replace_adj(self, adj):
        A  = torch.tensor(adj, dtype=torch.float32).to(next(self.parameters()).device)
        D  = A.sum(1); Di = torch.diag(D.pow(-0.5)); AN = Di @ A @ Di
        for g in [self.gcn.g1, self.gcn.g2]:
            g.AN = AN

    def forward(self, xg, xs):
        B, T, N, F_ = xg.shape
        gcn_out     = self.gcn(xg.view(B * T, N, F_))[:, 0, :].view(B, T, -1)
        gi          = self.gru_proj(torch.cat([xs, gcn_out], -1))
        go, _       = self.gru(gi)
        gl          = self.gru_norm(go)[:, -1, :]
        tl          = self.tf(self.pe(self.tf_proj(xs)))[:, -1, :]
        pad         = self.hidden - self.gcn_out
        gs_         = F.pad(gcn_out.mean(1), (0, pad)) if pad > 0 else gcn_out.mean(1)
        a           = torch.softmax(self.alpha, 0)
        return self.head(a[0] * gl + a[1] * tl + a[2] * gs_)


def build_model(n_stocks, adj, cfg=None):
    cfg = cfg or BASE_CONFIG
    return TGT(
        N_FEATURES, n_stocks, adj,
        gcn_out  = cfg["gcn_out_dim"],
        hidden   = cfg["hidden_dim"],
        n_gru    = cfg["num_gru_layers"],
        n_heads  = cfg["num_heads"],
        n_tf     = cfg["num_tf_layers"],
        horizon  = cfg["pred_horizon"],
        drop     = cfg["dropout"],
        seq_len  = cfg["seq_len"],
    ).to(DEVICE)


params = sum(p.numel() for p in build_model(5, np.eye(5)).parameters())
print(f"TGT architecture ready | params (5-node graph): {params:,}")


# ══════════════════════════════════════════════════════════════════════════════
#  9. Training Engine
# ══════════════════════════════════════════════════════════════════════════════

class HybridLoss(nn.Module):
    def __init__(self, a=0.7):
        super().__init__()
        self.a   = a
        self.mse = nn.MSELoss()
        self.mae = nn.L1Loss()

    def forward(self, p, t):
        return self.a * self.mse(p, t) + (1 - self.a) * self.mae(p, t)


def train_model(model, tr_l, va_l, cfg, label="", freeze_backbone=False):
    if freeze_backbone:
        for n, p in model.named_parameters():
            p.requires_grad = any(k in n for k in ["head", "alpha", "gru_norm"])
        tp = sum(p.numel() for p in model.parameters() if p.requires_grad)
        print(f"  Frozen backbone | trainable: {tp:,}")
    else:
        for p in model.parameters():
            p.requires_grad = True

    crit  = HybridLoss()
    opt   = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=cfg["lr"], weight_decay=cfg.get("weight_decay", 1e-5)
    )
    sched = torch.optim.lr_scheduler.OneCycleLR(
        opt, max_lr=cfg["lr"] * 8, epochs=cfg["epochs"],
        steps_per_epoch=len(tr_l), pct_start=0.3, anneal_strategy="cos"
    )

    best_val, best_state, pat = float("inf"), None, 0
    hist = {"train": [], "val": [], "lr": []}

    for ep in range(1, cfg["epochs"] + 1):
        model.train(); tl = 0
        for xg, xs, yb in tr_l:
            xg, xs, yb = xg.to(DEVICE), xs.to(DEVICE), yb.to(DEVICE)
            loss = crit(model(xg, xs), yb)
            opt.zero_grad(); loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step(); sched.step()
            tl += loss.item() * xg.size(0)

        model.eval(); vl = 0
        with torch.no_grad():
            for xg, xs, yb in va_l:
                vl += crit(model(xg.to(DEVICE), xs.to(DEVICE)),
                           yb.to(DEVICE)).item() * xg.size(0)

        tl /= len(tr_l.dataset); vl /= len(va_l.dataset)
        cur_lr = sched.get_last_lr()[0]
        hist["train"].append(tl); hist["val"].append(vl); hist["lr"].append(cur_lr)

        if vl < best_val:
            best_val   = vl
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            pat        = 0
        else:
            pat += 1

        interval = max(1, cfg["epochs"] // 8)
        if ep % interval == 0 or ep == 1:
            status = "BEST" if pat == 0 else f"pat {pat}/{cfg['patience']}"
            print(f"  [{label}] Ep {ep:>3}/{cfg['epochs']}  "
                  f"train={tl:.5f}  val={vl:.5f}  lr={cur_lr:.2e}  {status}")

        if pat >= cfg["patience"]:
            print(f"  Early stop @ epoch {ep}"); break

    model.load_state_dict(best_state); model.eval()
    for p in model.parameters():
        p.requires_grad = True
    return hist, best_val


print("Training engine ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  10. Training Curve Plot
# ══════════════════════════════════════════════════════════════════════════════

def plot_training(hist, ticker):
    ep      = len(hist["train"])
    best_ep = int(np.argmin(hist["val"])) + 1
    fig, axes = plt.subplots(1, 2, figsize=(14, 5), facecolor="#0F172A")
    fig.suptitle(f"Training History  |  {ticker}", color="#F1F5F9", fontsize=13)

    ax = axes[0]
    ax.plot(range(1, ep + 1), hist["train"], color=ACCENT, lw=2, label="Train Loss")
    ax.plot(range(1, ep + 1), hist["val"],   color=GREEN,  lw=2, ls="--", label="Val Loss")
    ax.axvline(best_ep, color=RED, ls=":", lw=1.5, label=f"Best @ ep {best_ep}")
    ax.fill_between(range(1, ep + 1), hist["train"], hist["val"], alpha=0.08, color=PURPLE)
    ax.set_xlabel("Epoch"); ax.set_ylabel("Hybrid Loss (0.7×MSE + 0.3×MAE)")
    ax.set_title("Loss Curves", color="#CBD5E1"); ax.legend(fontsize=9)

    ax2 = axes[1]
    ax2.plot(range(1, ep + 1), hist["lr"], color=ORANGE, lw=2)
    ax2.set_xlabel("Epoch"); ax2.set_ylabel("Learning Rate")
    ax2.set_title("OneCycleLR Schedule", color="#CBD5E1"); ax2.set_yscale("log")

    plt.tight_layout()
    fname = f"training_{ticker.replace('.', '_')}.png"
    plt.savefig(fname, dpi=150, bbox_inches="tight", facecolor="#0F172A")
    plt.show()
    print(f"Best val={min(hist['val']):.6f} at epoch {best_ep} | Saved: {fname}")


print("plot_training() ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  11. Metrics & Prediction Plot Functions
# ══════════════════════════════════════════════════════════════════════════════

def compute_metrics(t, p):
    mae  = mean_absolute_error(t, p)
    rmse = np.sqrt(mean_squared_error(t, p))
    mape = np.mean(np.abs((t - p) / (np.abs(t) + 1e-8))) * 100
    r2   = r2_score(t, p)
    corr = np.corrcoef(t.ravel(), p.ravel())[0, 1]
    da   = (np.sign(np.diff(t)) == np.sign(np.diff(p))).mean() * 100
    return dict(MAE=mae, RMSE=rmse, MAPE=mape, R2=r2, Correlation=corr, DirectionalAccuracy=da)


def get_predictions(model, loader, close_scaler):
    model.eval(); ps, ts = [], []
    with torch.no_grad():
        for xg, xs, yb in loader:
            ps.append(model(xg.to(DEVICE), xs.to(DEVICE)).cpu().numpy())
            ts.append(yb.numpy())
    ps    = np.concatenate(ps); ts = np.concatenate(ts)
    p_inv = close_scaler.inverse_transform(ps[:, 0:1]).ravel()
    t_inv = close_scaler.inverse_transform(ts[:, 0:1]).ravel()
    return ps, ts, p_inv, t_inv


def plot_predictions(splits, ticker):
    fig, axes = plt.subplots(3, 1, figsize=(18, 15), facecolor="#0F172A")
    fig.suptitle(f"Predicted vs Actual  |  {ticker}", color="#F1F5F9", fontsize=15)
    colors = [ACCENT, GREEN, ORANGE]

    for ax, (pi, ti, lbl, m), col in zip(axes, splits, colors):
        n = len(ti)
        ax.plot(range(n), ti, color="#94A3B8", lw=1.3, label="Actual",    alpha=0.9)
        ax.plot(range(n), pi, color=col,       lw=1.8, label="Predicted", alpha=0.9)
        ax.fill_between(range(n), ti, pi, alpha=0.12, color=RED, label="Error")
        info = (f"RMSE={m['RMSE']:.3f}  MAPE={m['MAPE']:.2f}%  "
                f"R2={m['R2']:.4f}  DirAcc={m['DirectionalAccuracy']:.1f}%")
        ax.set_title(f"{lbl}  |  {info}", color="#CBD5E1", fontsize=10)
        ax.set_ylabel("Price"); ax.legend(fontsize=9, loc="upper left")

    axes[-1].set_xlabel("Sample Index")
    plt.tight_layout()
    fname = f"predictions_{ticker.replace('.', '_')}.png"
    plt.savefig(fname, dpi=150, bbox_inches="tight", facecolor="#0F172A")
    plt.show(); print(f"Saved: {fname}")


def plot_residuals(te_pi, te_ti, ticker):
    residuals = te_pi - te_ti
    fig, axes = plt.subplots(2, 2, figsize=(14, 10), facecolor="#0F172A")
    fig.suptitle(f"Residual & Error Analysis  |  {ticker}", color="#F1F5F9", fontsize=13)

    ax = axes[0, 0]
    ax.plot(residuals, color=ACCENT, lw=0.9)
    ax.axhline(0, color=RED, lw=1, ls="--")
    ax.set_title("Residuals Over Time", color="#CBD5E1"); ax.set_ylabel("Pred - Actual")

    ax = axes[0, 1]
    ax.hist(residuals, bins=50, color=PURPLE, alpha=0.8, edgecolor="none")
    ax.axvline(residuals.mean(), color=RED, lw=1.5, ls="--",
               label=f"Mean={residuals.mean():.3f}")
    ax.set_title("Residual Distribution", color="#CBD5E1"); ax.legend(fontsize=8)

    ax = axes[1, 0]
    ax.scatter(te_ti, te_pi, alpha=0.3, s=8, color=ACCENT)
    mn, mx = min(te_ti.min(), te_pi.min()), max(te_ti.max(), te_pi.max())
    ax.plot([mn, mx], [mn, mx], color=RED, lw=1.5, ls="--", label="Perfect")
    ax.set_xlabel("Actual"); ax.set_ylabel("Predicted")
    ax.set_title("Actual vs Predicted Scatter", color="#CBD5E1"); ax.legend(fontsize=8)

    ax = axes[1, 1]
    ae = np.abs(residuals); se = np.sort(ae); cdf = np.arange(1, len(se) + 1) / len(se)
    ax.plot(se, cdf, color=GREEN, lw=2)
    for pct, col, lbl in [(50, ORANGE, "P50"), (90, RED, "P90")]:
        v = np.percentile(ae, pct)
        ax.axvline(v, color=col, ls="--", lw=1.2, label=f"{lbl}={v:.2f}")
    ax.set_xlabel("Abs Error"); ax.set_ylabel("CDF")
    ax.set_title("Absolute Error CDF", color="#CBD5E1"); ax.legend(fontsize=8)

    plt.tight_layout()
    fname = f"residuals_{ticker.replace('.', '_')}.png"
    plt.savefig(fname, dpi=150, bbox_inches="tight", facecolor="#0F172A")
    plt.show(); print(f"Saved: {fname}")


def plot_metrics_dashboard(tr_m, va_m, te_m, ticker):
    fig, axes = plt.subplots(1, 2, figsize=(16, 6), facecolor="#0F172A")
    fig.suptitle(f"Performance Metrics Dashboard  |  {ticker}", color="#F1F5F9", fontsize=14)
    keys        = ["MAE", "RMSE", "MAPE", "R2", "Correlation", "DirectionalAccuracy"]
    splits_data = {"Train": tr_m, "Val": va_m, "Test": te_m}
    x = np.arange(len(keys)); w = 0.25

    ax = axes[0]; ax.set_facecolor("#1E293B")
    for i, (sp, col) in enumerate(zip(splits_data, [ACCENT, GREEN, ORANGE])):
        vals = [splits_data[sp][k] for k in keys]
        bars = ax.bar(x + i * w, vals, w, label=sp, color=col, alpha=0.85)
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.001,
                    f"{v:.2f}", ha="center", va="bottom", color="#CBD5E1", fontsize=7)
    ax.set_xticks(x + w); ax.set_xticklabels(keys, fontsize=8)
    ax.set_title("All Splits Comparison", color="#CBD5E1"); ax.legend(fontsize=9)

    ax2 = axes[1]; ax2.axis("off")
    rows = [[k] + [f"{splits_data[s][k]:.3f}" for s in splits_data] for k in keys]
    tbl  = ax2.table(cellText=rows, colLabels=["Metric", "Train", "Val", "Test"],
                     cellLoc="center", loc="center", bbox=[0, 0, 1, 1])
    tbl.auto_set_font_size(False); tbl.set_fontsize(10)
    for (r, c), cell in tbl.get_celld().items():
        if r == 0:
            cell.set_facecolor("#1E3A5F"); cell.set_text_props(color="#F1F5F9", weight="bold")
        elif r % 2 == 0:
            cell.set_facecolor("#1A2537"); cell.set_text_props(color="#CBD5E1")
        else:
            cell.set_facecolor("#1E293B"); cell.set_text_props(color="#CBD5E1")
        cell.set_edgecolor("#334155")

    plt.tight_layout()
    fname = f"metrics_{ticker.replace('.', '_')}.png"
    plt.savefig(fname, dpi=150, bbox_inches="tight", facecolor="#0F172A")
    plt.show(); print(f"Saved: {fname}")


print("All metric & prediction plot functions ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  12. Interpretability Plots
# ══════════════════════════════════════════════════════════════════════════════

def plot_interpretability(model, test_loader, ticker):
    alpha    = torch.softmax(model.alpha, 0).detach().cpu().numpy()
    branches = ["GRU", "Transformer", "GCN"]

    fig, axes = plt.subplots(1, 2, figsize=(13, 5), facecolor="#0F172A")
    fig.suptitle(f"Model Interpretability  |  {ticker}", color="#F1F5F9", fontsize=13)

    ax = axes[0]
    wedges, texts, at = ax.pie(
        alpha, labels=branches, colors=[ACCENT, GREEN, PURPLE],
        autopct="%1.1f%%", startangle=140,
        textprops={"color": "#F1F5F9"},
        wedgeprops={"edgecolor": "#0F172A", "linewidth": 2}
    )
    for a in at:
        a.set_fontsize(11); a.set_weight("bold")
    ax.set_title("Branch Fusion Weights (Learnable alpha)", color="#CBD5E1")

    xg_s, xs_s, _ = next(iter(test_loader))
    xg_s = xg_s[:4].to(DEVICE)
    xs_s = xs_s[:4].to(DEVICE).requires_grad_(True)

    model.train()
    for m in model.modules():
        if isinstance(m, nn.Dropout):
            m.eval()
    pred_s = model(xg_s, xs_s); pred_s.sum().backward()
    model.eval()

    grad      = xs_s.grad.abs().mean(dim=(0, 1)).detach().cpu().numpy()
    grad_norm = grad / (grad.sum() + 1e-8)
    top_idx   = np.argsort(grad_norm)[::-1][:15]

    ax2   = axes[1]
    cols  = [ACCENT if i < 5 else GREEN if i < 10 else PURPLE for i in range(15)]
    ax2.barh(range(15), grad_norm[top_idx][::-1], color=cols, alpha=0.85)
    ax2.set_yticks(range(15))
    ax2.set_yticklabels([FEATURE_COLS[i] for i in top_idx[::-1]], fontsize=8)
    ax2.set_xlabel("Normalised Gradient Importance")
    ax2.set_title("Top-15 Feature Importance (Input Gradient)", color="#CBD5E1")

    plt.tight_layout()
    fname = f"interpretability_{ticker.replace('.', '_')}.png"
    plt.savefig(fname, dpi=150, bbox_inches="tight", facecolor="#0F172A")
    plt.show()
    print("Fusion weights:", {b: f"{a * 100:.1f}%" for b, a in zip(branches, alpha)})
    print(f"Saved: {fname}")


print("plot_interpretability() ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  13. Forecast Chart
# ══════════════════════════════════════════════════════════════════════════════

def plot_forecast(raw_df, pred_result, ticker):
    hist_close = raw_df["Close"].squeeze().tail(90).values.astype(float)
    pred_vals  = pred_result["predicted_prices"]
    n_pred     = len(pred_vals)

    fig, ax = plt.subplots(figsize=(14, 6), facecolor="#0F172A")
    ax.set_facecolor("#1E293B")
    ax.plot(range(len(hist_close)), hist_close, color=ACCENT, lw=2, label="Historical")
    ax.plot([len(hist_close) - 1, len(hist_close)],
            [float(hist_close[-1]), pred_vals[0]],
            color=GREEN, lw=1.5, ls="--")
    pred_x = range(len(hist_close), len(hist_close) + n_pred)
    ax.plot(pred_x, pred_vals, color=GREEN, lw=2.5, marker="o", ms=6, label="Forecast", zorder=5)
    ax.fill_between([len(hist_close) - 1] + list(pred_x),
                    [float(hist_close[-1])] + pred_vals, alpha=0.18, color=GREEN)
    for x, p in zip(pred_x, pred_vals):
        ax.annotate(f"{p:.1f}", (x, p), textcoords="offset points",
                    xytext=(0, 10), ha="center", color="#F1F5F9", fontsize=8, fontweight="bold")
    ax.axvline(len(hist_close) - 1, color="#475569", ls=":", lw=1.5, label="Today")
    ax.set_title(
        f"{ticker}  |  {n_pred}-Day Forecast  |  "
        f"{pred_result['signal']} ({pred_result['change_pct_day1']:+.2f}%)  |  "
        f"Trend: {pred_result['trend']}",
        color="#F1F5F9", fontsize=12
    )
    ax.set_xlabel("Trading Days"); ax.set_ylabel("Price")
    ax.legend(fontsize=10)
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f"{x:.0f}"))
    plt.tight_layout()
    fname = f"forecast_{ticker.replace('.', '_')}.png"
    plt.savefig(fname, dpi=150, bbox_inches="tight", facecolor="#0F172A")
    plt.show(); print(f"Saved: {fname}")


print("plot_forecast() ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  14. Stock Registry
# ══════════════════════════════════════════════════════════════════════════════

def load_registry():
    if REGISTRY_PATH.exists():
        with open(REGISTRY_PATH) as f:
            return json.load(f)
    return {}


def save_registry(reg):
    with open(REGISTRY_PATH, "w") as f:
        json.dump(reg, f, indent=2)


def register_stock(ticker, metrics, peers, model_path):
    reg = load_registry()
    reg[ticker] = {
        "ticker":       ticker,
        "model_path":   str(model_path),
        "peers":        peers,
        "last_trained": datetime.now().isoformat(),
        "metrics":      {k: round(float(v), 4) for k, v in metrics.items()},
        "status":       "ready"
    }
    save_registry(reg)
    print(f"  Registered {ticker}")


def show_registry():
    reg = load_registry()
    if not reg:
        print("Registry empty."); return
    print(f"{'Ticker':<15} {'Last Trained':<22} {'RMSE':>8} {'MAPE':>8} {'DirAcc':>9}")
    print("-" * 65)
    for t, info in reg.items():
        m = info.get("metrics", {})
        print(f"{t:<15} {info.get('last_trained', '')[:19]:<22} "
              f"{m.get('RMSE', 0):>8.3f} {m.get('MAPE', 0):>7.2f}% "
              f"{m.get('DirectionalAccuracy', 0):>8.1f}%")


show_registry()


# ══════════════════════════════════════════════════════════════════════════════
#  15. Phase 1 — Base Model Training (Run Once)
# ══════════════════════════════════════════════════════════════════════════════
# Trains on 20 diverse global stocks (10 Indian NSE + 10 US).
# Gives the TGT universal market pattern knowledge before fine-tuning.
# Takes ~15-25 min — run once only.

BASE_UNIVERSE = [
    # Indian NSE — diverse sectors
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
    "SUNPHARMA.NS", "TATASTEEL.NS", "MARUTI.NS", "ONGC.NS", "BHARTIARTL.NS",
    # US — diverse sectors
    "AAPL", "MSFT", "GOOGL", "JPM", "XOM",
    "JNJ", "AMZN", "META", "NVDA", "TSLA",
]
BASE_ANCHOR = "TCS.NS"
DATA_START  = "2017-01-01"
DATA_END    = datetime.today().strftime("%Y-%m-%d")

if BASE_MODEL_PATH.exists():
    print(f"Base model already exists: {BASE_MODEL_PATH}")
    print("Delete it and re-run to retrain from scratch.")
    SKIP_BASE = True
else:
    print(f"No base model found. Will train on {len(BASE_UNIVERSE)} stocks.")
    SKIP_BASE = False

if not SKIP_BASE:
    print("=" * 65)
    print("  PHASE 1: BASE MODEL TRAINING")
    print("=" * 65)

    print("\nStep 1/8  Downloading data...")
    base_raw  = download_data(BASE_UNIVERSE, DATA_START, DATA_END)
    available = list(base_raw.keys())
    print(f"  Available: {len(available)}/{len(BASE_UNIVERSE)} tickers")

    print("\nStep 2/8  EDA plots...")
    plot_eda(base_raw[BASE_ANCHOR], BASE_ANCHOR)

    print("\nStep 3/8  Building correlation graph...")
    graph_tickers = [BASE_ANCHOR] + [t for t in available if t != BASE_ANCHOR]
    base_adj, base_tickers, base_corr = build_graph(
        {t: base_raw[t] for t in graph_tickers})
    plot_graph(base_corr, base_adj, base_tickers, BASE_ANCHOR)

    print("\nStep 4/8  Scaling features...")
    scaled_base, base_scalers, base_common = scale_data(
        {t: base_raw[t] for t in base_tickers}, BASE_ANCHOR, fit=True)

    tr_l, va_l, te_l, ntr, nva, nte = make_loaders(
        scaled_base, base_tickers, BASE_ANCHOR, BASE_CONFIG)
    print(f"  Samples  train:{ntr}  val:{nva}  test:{nte}")

    print(f"\nStep 5/8  Training base model ({BASE_CONFIG['epochs']} epochs)...")
    base_model = build_model(len(base_tickers), base_adj, BASE_CONFIG)
    print(f"  Params: {sum(p.numel() for p in base_model.parameters()):,}")
    t0 = time.time()
    base_hist, bv = train_model(base_model, tr_l, va_l, BASE_CONFIG, label="BASE")
    print(f"  Done in {time.time() - t0:.0f}s | best val={bv:.5f}")

    print("\nStep 6/8  Plotting training curves...")
    plot_training(base_hist, BASE_ANCHOR)

    print("\nStep 7/8  Evaluating all splits...")
    tr_ps, tr_ts, tr_pi, tr_ti = get_predictions(base_model, tr_l, base_scalers["__close__"])
    va_ps, va_ts, va_pi, va_ti = get_predictions(base_model, va_l, base_scalers["__close__"])
    te_ps, te_ts, te_pi, te_ti = get_predictions(base_model, te_l, base_scalers["__close__"])
    tr_m = compute_metrics(tr_ti, tr_pi)
    va_m = compute_metrics(va_ti, va_pi)
    te_m = compute_metrics(te_ti, te_pi)

    plot_predictions(
        [(tr_pi, tr_ti, "Train",      tr_m),
         (va_pi, va_ti, "Validation", va_m),
         (te_pi, te_ti, "Test",       te_m)],
        BASE_ANCHOR)
    plot_residuals(te_pi, te_ti, BASE_ANCHOR)
    plot_metrics_dashboard(tr_m, va_m, te_m, BASE_ANCHOR)
    plot_interpretability(base_model, te_l, BASE_ANCHOR)

    print("\nStep 8/8  Saving base model...")
    torch.save({
        "model_state":  base_model.state_dict(),
        "base_config":  BASE_CONFIG,
        "base_tickers": base_tickers,
        "adj_matrix":   base_adj.tolist(),
        "feature_cols": FEATURE_COLS,
        "base_metrics": te_m,
        "trained_on":   datetime.now().isoformat(),
    }, BASE_MODEL_PATH)
    joblib.dump({"scalers": base_scalers}, MODEL_DIR / "base_scalers.pkl")
    print(f"  Saved: {BASE_MODEL_PATH}")

    print("\n" + "=" * 65)
    print("BASE MODEL TEST METRICS:")
    for k, v in te_m.items():
        print(f"  {k:<22}: {v:.4f}")
    print("=" * 65)

else:
    print("Loading existing base model...")
    ckpt        = torch.load(BASE_MODEL_PATH, map_location=DEVICE)
    base_tickers = ckpt["base_tickers"]
    base_adj    = np.array(ckpt["adj_matrix"])
    base_model  = build_model(len(base_tickers), base_adj, BASE_CONFIG)
    base_model.load_state_dict(ckpt["model_state"]); base_model.eval()
    print(f"  Loaded | trained: {ckpt.get('trained_on', '?')[:10]}")
    print(f"  Tickers: {base_tickers}")
    if "base_metrics" in ckpt:
        print("  Saved test metrics:")
        for k, v in ckpt["base_metrics"].items():
            print(f"    {k}: {v:.4f}")


# ══════════════════════════════════════════════════════════════════════════════
#  16. Phase 2 — Fine-Tune Any Stock
# ══════════════════════════════════════════════════════════════════════════════

def _run_prediction(ticker, model, scalers, graph_t, raw_override=None):
    end   = datetime.today().strftime("%Y-%m-%d")
    start = (datetime.today() - timedelta(days=400)).strftime("%Y-%m-%d")
    fresh = (
        {t: raw_override[t] for t in graph_t if t in raw_override}
        if raw_override
        else download_data(graph_t, start, end, verbose=False)
    )
    common = None
    for t in fresh:
        idx    = fresh[t][[f for f in FEATURE_COLS if f in fresh[t].columns]].dropna().index
        common = idx if common is None else common.intersection(idx)

    seq_len = 60
    if len(common) < seq_len:
        raise ValueError(f"Not enough data ({len(common)} rows).")

    def _sc(t):
        fc  = [f for f in FEATURE_COLS if f in fresh[t].columns]
        arr = fresh[t].loc[common, fc].values
        return (scalers[t].transform(arr) if t in scalers
                else MinMaxScaler((0, 1)).fit_transform(arr))

    sf  = {t: _sc(t) for t in graph_t if t in fresh}
    x_g = np.stack([sf[t][-seq_len:] for t in graph_t if t in sf], axis=1)
    x_g = torch.tensor(x_g, dtype=torch.float32).unsqueeze(0).to(DEVICE)
    x_s = torch.tensor(sf[graph_t[0]][-seq_len:], dtype=torch.float32).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        ps = model(x_g, x_s).cpu().numpy()
    preds = scalers["__close__"].inverse_transform(ps).ravel()

    lc  = float(np.array(fresh[graph_t[0]]["Close"].squeeze().values).ravel()[-1])
    ld  = common[-1]
    fut = pd.bdate_range(start=ld, periods=len(preds) + 1)[1:]

    def _f(x): return round(float(x), 4)

    prices = [_f(p) for p in preds]
    return {
        "ticker":           ticker,
        "last_close":       _f(lc),
        "last_date":        str(ld.date()),
        "predicted_prices": prices,
        "predictions":      {d.strftime("%Y-%m-%d"): p for d, p in zip(fut, prices)},
        "change_pct_day1":  _f((prices[0] - lc) / (lc + 1e-8) * 100),
        "trend":            "UPTREND" if prices[-1] > prices[0] else "DOWNTREND",
        "signal":           "BUY" if prices[0] > lc else "SELL",
        "peers_used":       graph_t[1:],
        "generated_at":     datetime.now().isoformat()
    }


def fine_tune_stock(ticker, data_start="2019-01-01", data_end=None,
                    force_retrain=False, freeze_backbone=False):
    """
    Fine-tunes the base model on any ticker and prints all 8 charts automatically.
    All steps are automated: peer detection → download → EDA → graph → train → evaluate → forecast.
    """
    ticker     = ticker.upper()
    data_end   = data_end or datetime.today().strftime("%Y-%m-%d")
    model_path = MODEL_DIR / f"{ticker.replace('.', '_')}_model.pt"
    scaler_path= MODEL_DIR / f"{ticker.replace('.', '_')}_scalers.pkl"

    reg = load_registry()
    if ticker in reg and not force_retrain:
        print(f"{ticker} already trained ({reg[ticker]['last_trained'][:10]}). "
              "Pass force_retrain=True to retrain.")
        return predict_stock(ticker)

    print("=" * 65)
    print(f"  FINE-TUNING: {ticker}")
    print("=" * 65)

    # 1. Peers
    print("\nStep 1/9  Detecting sector peers...")
    peers  = auto_peers(ticker, n=4); all_t = [ticker] + peers

    # 2. Download
    print("\nStep 2/9  Downloading data...")
    raw   = download_data(all_t, data_start, data_end)
    avail = [t for t in all_t if t in raw]
    if ticker not in raw:
        raise ValueError(f"Cannot download {ticker}. Check ticker.")
    print(f"  Graph tickers: {avail}")

    # 3. EDA
    print("\nStep 3/9  EDA...")
    plot_eda(raw[ticker], ticker)

    # 4. Graph
    print("\nStep 4/9  Building correlation graph...")
    adj, graph_t, corr_mat = build_graph({t: raw[t] for t in avail})
    plot_graph(corr_mat, adj, graph_t, ticker)

    # 5. Scale + loaders
    print("\nStep 5/9  Scaling & building dataset...")
    scaled, scalers, common = scale_data({t: raw[t] for t in graph_t}, ticker, fit=True)
    tr_l, va_l, te_l, ntr, nva, nte = make_loaders(scaled, graph_t, ticker, FINETUNE_CONFIG)
    print(f"  Samples  train:{ntr}  val:{nva}  test:{nte}")

    # 6. Load base + build fine-tune model
    print("\nStep 6/9  Loading base model + fine-tuning...")
    if not BASE_MODEL_PATH.exists():
        raise FileNotFoundError("Run Phase 1 (base training) first.")
    ckpt     = torch.load(BASE_MODEL_PATH, map_location=DEVICE)
    base_cfg = ckpt["base_config"]; base_n = len(ckpt["base_tickers"])
    ft_model = build_model(base_n, np.array(ckpt["adj_matrix"]), base_cfg)
    ft_model.load_state_dict(ckpt["model_state"])

    if len(graph_t) != base_n:
        print(f"  Graph size {base_n}->{len(graph_t)}: rebuilding GCN layers...")
        ft_model.gcn   = GCNEncoder(N_FEATURES, base_cfg["gcn_out_dim"] * 2,
                                    base_cfg["gcn_out_dim"], adj, base_cfg["dropout"]).to(DEVICE)
        ft_model.alpha = nn.Parameter(torch.ones(3) / 3).to(DEVICE)
    else:
        ft_model.replace_adj(adj)

    t0 = time.time()
    ft_hist, bv = train_model(ft_model, tr_l, va_l, FINETUNE_CONFIG,
                              label=ticker, freeze_backbone=freeze_backbone)
    print(f"  Done in {time.time() - t0:.0f}s | best val={bv:.5f}")

    # 7. All charts
    print("\nStep 7/9  Generating charts...")
    plot_training(ft_hist, ticker)
    tr_ps, tr_ts, tr_pi, tr_ti = get_predictions(ft_model, tr_l, scalers["__close__"])
    va_ps, va_ts, va_pi, va_ti = get_predictions(ft_model, va_l, scalers["__close__"])
    te_ps, te_ts, te_pi, te_ti = get_predictions(ft_model, te_l, scalers["__close__"])
    tr_m = compute_metrics(tr_ti, tr_pi)
    va_m = compute_metrics(va_ti, va_pi)
    te_m = compute_metrics(te_ti, te_pi)

    plot_predictions(
        [(tr_pi, tr_ti, "Train",      tr_m),
         (va_pi, va_ti, "Validation", va_m),
         (te_pi, te_ti, "Test",       te_m)],
        ticker)
    plot_residuals(te_pi, te_ti, ticker)
    plot_metrics_dashboard(tr_m, va_m, te_m, ticker)
    plot_interpretability(ft_model, te_l, ticker)

    # 8. Save
    print("\nStep 8/9  Saving model & scalers...")
    torch.save({
        "model_state":   ft_model.state_dict(),
        "base_config":   base_cfg,
        "graph_tickers": graph_t,
        "adj_matrix":    adj.tolist(),
        "ticker":        ticker,
        "peers":         peers,
        "metrics":       te_m,
        "fine_tuned_on": datetime.now().isoformat(),
    }, model_path)
    joblib.dump({"scalers": scalers, "feature_cols": FEATURE_COLS,
                 "graph_tickers": graph_t}, scaler_path)
    register_stock(ticker, te_m, peers, model_path)

    # 9. Forecast chart
    print("\nStep 9/9  Generating forecast chart...")
    pred_result = _run_prediction(ticker, ft_model, scalers, graph_t, raw)
    plot_forecast(raw[ticker], pred_result, ticker)

    print("\n" + "=" * 65)
    print(f"  COMPLETE: {ticker}")
    for k, v in te_m.items():
        print(f"  {k:<22}: {v:.4f}")
    print("=" * 65)
    return pred_result


print("fine_tune_stock() ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  17. Quick Predict (Already Trained Stocks)
# ══════════════════════════════════════════════════════════════════════════════

def predict_stock(ticker, n_days=5, show_chart=True):
    """Quick prediction for an already-trained stock. Auto-triggers fine-tuning if needed."""
    ticker = ticker.upper()
    mp     = MODEL_DIR / f"{ticker.replace('.', '_')}_model.pt"
    sp     = MODEL_DIR / f"{ticker.replace('.', '_')}_scalers.pkl"

    if not mp.exists():
        print(f"No model for {ticker}. Running fine_tune_stock()...")
        return fine_tune_stock(ticker)

    ckpt    = torch.load(mp, map_location=DEVICE)
    art     = joblib.load(sp); sc = art["scalers"]; gt = art["graph_tickers"]
    m       = build_model(len(gt), np.array(ckpt["adj_matrix"]), ckpt["base_config"])
    m.load_state_dict(ckpt["model_state"]); m.eval()
    result  = _run_prediction(ticker, m, sc, gt)

    if show_chart:
        end   = datetime.today().strftime("%Y-%m-%d")
        start = (datetime.today() - timedelta(days=200)).strftime("%Y-%m-%d")
        raw_  = download_data(gt[:1], start, end, verbose=False)
        if ticker in raw_:
            plot_forecast(raw_[ticker], result, ticker)

    print(json.dumps({k: v for k, v in result.items() if k != "predictions"}, indent=2))
    return result


print("predict_stock() ready.")


# ══════════════════════════════════════════════════════════════════════════════
#  18. DEMO — Change Ticker & Run
# ══════════════════════════════════════════════════════════════════════════════

# ════════════════════════════════════════════════════════════════
#  CHANGE THIS TO ANY STOCK YOU WANT
# ════════════════════════════════════════════════════════════════
TARGET = "RELIANCE.NS"

# Other examples:
# Indian  : "TCS.NS"  "INFY.NS"  "HDFCBANK.NS"  "WIPRO.NS"  "MARUTI.NS"
# US      : "AAPL"    "TSLA"     "NVDA"          "JPM"
# UK      : "BP.L"    "HSBA.L"
# ════════════════════════════════════════════════════════════════

result = fine_tune_stock(TARGET)


# ══════════════════════════════════════════════════════════════════════════════
#  19. Multi-Stock Portfolio View
# ══════════════════════════════════════════════════════════════════════════════

PORTFOLIO = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "AAPL", "MSFT"]
reg     = load_registry()
trained = [t for t in PORTFOLIO if t in reg]

if not trained:
    print("No stocks trained yet. Run fine_tune_stock() on some stocks first.")
else:
    fig, axes = plt.subplots(2, 1, figsize=(16, 12), facecolor="#0F172A")
    fig.suptitle("Portfolio Overview  |  Stock Sensei AI", color="#F1F5F9", fontsize=14)
    pal = [ACCENT, GREEN, ORANGE, PURPLE, RED]

    ax  = axes[0]; ax.set_facecolor("#1E293B")
    ax.set_title("Normalised Price (Base=100, last 1 year)", color="#CBD5E1")
    end   = datetime.today().strftime("%Y-%m-%d")
    start = (datetime.today() - timedelta(days=365)).strftime("%Y-%m-%d")
    raw_all = download_data(trained, start, end, verbose=False)
    for t, col in zip(trained, pal):
        if t in raw_all:
            cl = raw_all[t]["Close"].squeeze().values.astype(float)
            ax.plot(cl / cl[0] * 100, color=col, lw=1.8, label=t, alpha=0.9)
    ax.axhline(100, color="#475569", lw=0.8, ls="--")
    ax.set_ylabel("Indexed Price"); ax.set_xlabel("Trading Days"); ax.legend(fontsize=10)

    ax2 = axes[1]; ax2.set_facecolor("#1E293B")
    ax2.set_title("Directional Accuracy by Stock (test set)", color="#CBD5E1")
    das  = [reg[t]["metrics"].get("DirectionalAccuracy", 0) for t in trained]
    bars = ax2.bar(trained, das, color=pal[:len(trained)], alpha=0.85, edgecolor="none")
    for bar, v in zip(bars, das):
        ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3,
                 f"{v:.1f}%", ha="center", va="bottom",
                 color="#F1F5F9", fontsize=10, fontweight="bold")
    ax2.axhline(50, color=RED, lw=1, ls="--", label="Random baseline (50%)")
    ax2.set_ylabel("Directional Accuracy (%)"); ax2.legend(fontsize=9)

    plt.tight_layout()
    plt.savefig("portfolio_comparison.png", dpi=150, bbox_inches="tight", facecolor="#0F172A")
    plt.show()
    print("\nRegistry:")
    show_registry()


# ══════════════════════════════════════════════════════════════════════════════
#  20. Daily Cron — Auto Re-Train All Stocks
# ══════════════════════════════════════════════════════════════════════════════

def daily_update(force=False):
    """Re-fine-tunes all registered stocks. Skips stocks already updated today."""
    reg   = load_registry(); today = datetime.now().date().isoformat()
    if not reg:
        print("Registry empty."); return
    print(f"Daily update  {today}  |  {len(reg)} stocks")
    results = {}
    for i, (ticker, info) in enumerate(reg.items(), 1):
        last = info.get("last_trained", "")[:10]
        if last == today and not force:
            print(f"[{i}] {ticker:<15}  already updated today")
            results[ticker] = "skipped"; continue
        print(f"\n[{i}/{len(reg)}] Updating {ticker}...")
        try:
            fine_tune_stock(ticker, force_retrain=True)
            results[ticker] = "updated"
        except Exception as e:
            print(f"  ERROR: {e}"); results[ticker] = f"error: {e}"
    print("\nSummary:")
    for t, s in results.items():
        print(f"  {t:<15}  {s}")
    return results


print("Add this to crontab on your server (Mon-Fri 18:30 IST):")
print("  30 13 * * 1-5  python3 StockSensei_Universal_TGT_v3.py >> /var/log/stocksensei.log 2>&1")
print()
print("To run manual update now:")
print("  daily_update()")
