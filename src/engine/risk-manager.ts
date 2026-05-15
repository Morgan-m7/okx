import type { Account, Position } from '../types/trading';
import type { TradeSignal, StrategyConfig, RiskParams } from '../types/strategy';
import type { Candle } from '../types/market';
import type { EventBus } from '../events/event-bus';
import { EventType } from '../types/events';
import { calculateADX } from '../strategies/indicators/adx';
import { DEFAULTS } from '../constants/defaults';

export class RiskManager {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  validateOpenPosition(
    signal: TradeSignal,
    existingPositions: Position[],
    account: Account,
    riskParams?: RiskParams
  ): { allowed: boolean; reason?: string } {
    const defaultRisk: RiskParams = {
      maxLossPercent: DEFAULTS.maxLossPercentDefault,
      balanceProtectionPercent: DEFAULTS.balanceProtectionPercentDefault,
      maxMartingaleLayers: DEFAULTS.maxMartingaleLayers,
      adxProtectionEnabled: true,
    };
    const rp = riskParams || defaultRisk;

    const balanceCheck = this.checkBalanceProtection(account, rp);
    if (!balanceCheck.allowed) return balanceCheck;

    const maxLossCheck = this.checkMaxLoss(existingPositions, account, rp);
    if (!maxLossCheck.allowed) return maxLossCheck;

    if (signal.martingaleLayer !== undefined && signal.martingaleLayer > 0) {
      const layerCheck = this.checkMaxLayers(signal.martingaleLayer, rp);
      if (!layerCheck.allowed) return layerCheck;
    }

    return { allowed: true };
  }

  validateMartingaleSignal(
    signal: TradeSignal,
    adxValue: number,
    existingPositions: Position[],
    account: Account,
    riskParams?: RiskParams
  ): { allowed: boolean; reason?: string } {
    const rp = riskParams || {
      maxLossPercent: DEFAULTS.maxLossPercentDefault,
      balanceProtectionPercent: DEFAULTS.balanceProtectionPercentDefault,
      maxMartingaleLayers: DEFAULTS.maxMartingaleLayers,
      adxProtectionEnabled: true,
    };

    if (rp.adxProtectionEnabled && adxValue < DEFAULTS.adxThreshold) {
      this.eventBus.emit(EventType.RISK_ADX_REJECTED, {
        strategyId: signal.strategyId,
        adxValue,
      });
      this.eventBus.emit(EventType.RISK_ALERT, {
        strategyId: signal.strategyId,
        message: `ADX protection: ADX(${adxValue.toFixed(1)}) < ${DEFAULTS.adxThreshold}, martingale disabled in ranging market`,
        level: 'warning',
      });
      return { allowed: false, reason: `ADX ${adxValue.toFixed(1)} < ${DEFAULTS.adxThreshold}, ranging market` };
    }

    if (signal.martingaleLayer && signal.martingaleLayer > rp.maxMartingaleLayers) {
      this.eventBus.emit(EventType.RISK_MARTINGALE_LIMIT, {
        strategyId: signal.strategyId,
        layer: signal.martingaleLayer,
      });
      return { allowed: false, reason: `Max martingale layers (${rp.maxMartingaleLayers}) exceeded` };
    }

    return this.validateOpenPosition(signal, existingPositions, account, rp);
  }

  checkAdxProtection(
    candles: Candle[],
    period: number = 14,
    threshold: number = DEFAULTS.adxThreshold
  ): { adxValue: number; isTrending: boolean } {
    if (candles.length < period * 2) {
      return { adxValue: 0, isTrending: false };
    }

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);

    const adxValues = calculateADX(highs, lows, closes, period);
    const currentADX = adxValues[adxValues.length - 1] ?? 0;

    return {
      adxValue: Math.round(currentADX * 10) / 10,
      isTrending: currentADX >= threshold,
    };
  }

  private checkBalanceProtection(
    account: Account,
    riskParams: RiskParams
  ): { allowed: boolean; reason?: string } {
    const initialBalance = DEFAULTS.initialBalance;
    const totalLoss = initialBalance - account.balance;
    const lossPercent = (totalLoss / initialBalance) * 100;

    if (lossPercent >= riskParams.balanceProtectionPercent) {
      return {
        allowed: false,
        reason: `Balance protection: total loss ${lossPercent.toFixed(1)}% >= ${riskParams.balanceProtectionPercent}%`,
      };
    }

    return { allowed: true };
  }

  private checkMaxLoss(
    positions: Position[],
    account: Account,
    riskParams: RiskParams
  ): { allowed: boolean; reason?: string } {
    const totalLoss = positions
      .filter(p => p.profit < 0)
      .reduce((sum, p) => sum + Math.abs(p.profit), 0);

    const lossPercent = (totalLoss / account.balance) * 100;

    if (lossPercent >= riskParams.maxLossPercent) {
      return {
        allowed: false,
        reason: `Max loss exceeded: ${lossPercent.toFixed(1)}% >= ${riskParams.maxLossPercent}%`,
      };
    }

    return { allowed: true };
  }

  private checkMaxLayers(
    currentLayer: number,
    riskParams: RiskParams
  ): { allowed: boolean; reason?: string } {
    if (currentLayer > riskParams.maxMartingaleLayers) {
      return {
        allowed: false,
        reason: `Max martingale layers (${riskParams.maxMartingaleLayers}) exceeded, current: ${currentLayer}`,
      };
    }
    return { allowed: true };
  }
}
