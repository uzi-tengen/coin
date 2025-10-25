
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CoinIcon } from './components/Icons';

// --- TYPE INTERFACES ---
interface Dropper {
  id: string;
  name: string;
  baseCost: number;
  baseCps: number;
  color: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
}

interface Upgrade {
  id:string;
  name: string;
  description: string;
  cost: number;
  effect: (stats: GameStats) => Partial<GameStats>;
  type: 'multiplier' | 'click' | 'dropper' | 'auto_clicker' | 'sell_boost' | 'cooldown' | 'cost_reduction';
}

interface PrestigeUpgrade {
    id: string;
    name: string;
    description: string;
    cost: (level: number) => number;
    maxLevel?: number;
    effect: (level: number) => Partial<PrestigeBonuses>;
}

interface Boost {
    id: string;
    name: string;
    description: string;
    cost: number;
    duration?: number; // in seconds
    effectType: 'multiplier' | 'click_multiplier' | 'instant_gold';
}

interface Mission {
    id: string;
    name: string;
    goal: number; // Total coins earned
    reward: number;
}

interface GameStats {
  cpsMultiplier: number;
  clickPower: number;
  dropperMultipliers: { [dropperName: string]: number };
  autoClickerCps: number;
  sellModifier: number;
  clickCooldown: number;
  dropperCostModifier: number;
}

interface PrestigeBonuses {
    clickPowerBonus: number;
    startingDroppers: number;
    prestigePointBonus: number;
    permanentAutoClicker: number;
}

// --- DATA DEFINITIONS ---
const DROPPER_TYPES: Dropper[] = [
  { id: 'd1', name: '초급 드로퍼', baseCost: 15, baseCps: 1, color: 'bg-green-500', rarity: 'Common' },
  { id: 'd2', name: '중급 드로퍼', baseCost: 100, baseCps: 5, color: 'bg-blue-500', rarity: 'Uncommon' },
  { id: 'd3', name: '상급 드로퍼', baseCost: 1100, baseCps: 25, color: 'bg-purple-500', rarity: 'Rare' },
  { id: 'd4', name: '최상급 드로퍼', baseCost: 12000, baseCps: 120, color: 'bg-yellow-500', rarity: 'Epic' },
  { id: 'd5', name: '엘리트 드로퍼', baseCost: 130000, baseCps: 600, color: 'bg-red-500', rarity: 'Legendary' },
  { id: 'd6', name: '마스터 드로퍼', baseCost: 1400000, baseCps: 3000, color: 'bg-white', rarity: 'Mythic' },
];

const UPGRADE_TYPES: Upgrade[] = [
    { id: 'u1', name: '견고한 컨베이어', description: '모든 드로퍼 생산량 x2', cost: 1000, type: 'multiplier', effect: s => ({ cpsMultiplier: s.cpsMultiplier * 2 }) },
    { id: 'u2', name: '황금 기어', description: '모든 드로퍼 생산량 x3', cost: 10000, type: 'multiplier', effect: s => ({ cpsMultiplier: s.cpsMultiplier * 3 }) },
    { id: 'u3', name: '코인 자석', description: '모든 드로퍼 생산량 x5', cost: 100000, type: 'multiplier', effect: s => ({ cpsMultiplier: s.cpsMultiplier * 5 }) },
    { id: 'u4', name: '단단한 마우스', description: '클릭당 코인 획득량 x2', cost: 500, type: 'click', effect: s => ({ clickPower: s.clickPower * 2 }) },
    { id: 'u5', name: '강철 손가락', description: '클릭당 코인 획득량 x5', cost: 5000, type: 'click', effect: s => ({ clickPower: s.clickPower * 5 }) },
    { id: 'u13', name: '견고한 손가락', description: '클릭당 코인 획득량 +1', cost: 1000, type: 'click', effect: s => ({ clickPower: s.clickPower + 1 }) },
    { id: 'u6', name: '초급 드로퍼 강화', description: '초급 드로퍼 생산량 x2', cost: 800, type: 'dropper', effect: s => ({ dropperMultipliers: { ...s.dropperMultipliers, '초급 드로퍼': (s.dropperMultipliers['초급 드로퍼'] || 1) * 2 } }) },
    { id: 'u7', name: '중급 드로퍼 강화', description: '중급 드로퍼 생산량 x2', cost: 4000, type: 'dropper', effect: s => ({ dropperMultipliers: { ...s.dropperMultipliers, '중급 드로퍼': (s.dropperMultipliers['중급 드로퍼'] || 1) * 2 } }) },
    { id: 'u8', name: '효율적인 설계', description: '모든 드로퍼 구매 비용 10% 감소', cost: 75000, type: 'cost_reduction', effect: s => ({ dropperCostModifier: s.dropperCostModifier * 0.9 }) },
    { id: 'u9', name: '자동 클리커', description: '초당 1회 자동 클릭', cost: 25000, type: 'auto_clicker', effect: s => ({ autoClickerCps: s.autoClickerCps + 1 }) },
    { id: 'u10', name: '재활용 센터', description: '드로퍼 판매 시 75% 환급', cost: 50000, type: 'sell_boost', effect: s => ({ sellModifier: 0.75 }) },
    { id: 'u11', name: '빠른 손놀림', description: '클릭 쿨타임 0.2초 감소', cost: 3000, type: 'cooldown', effect: s => ({ clickCooldown: Math.max(0.1, s.clickCooldown - 0.2) }) },
    { id: 'u12', name: '신속한 클릭', description: '클릭 쿨타임 0.2초 감소', cost: 12000, type: 'cooldown', effect: s => ({ clickCooldown: Math.max(0.1, s.clickCooldown - 0.2) }) },
];

const BOOST_TYPES: Boost[] = [
    { id: 'b1', name: '코인 러쉬', description: '30초 동안 모든 코인 생산량 x2', cost: 500000, duration: 30, effectType: 'multiplier' },
    { id: 'b2', name: '클릭 광란', description: '15초 동안 클릭 파워 x10', cost: 250000, duration: 15, effectType: 'click_multiplier' },
    { id: 'b3', name: '시간 왜곡', description: '즉시 1시간 분량의 코인 획득', cost: 1000000, effectType: 'instant_gold' },
];

const PRESTIGE_UPGRADE_TYPES: PrestigeUpgrade[] = [
    { id: 'p1', name: '황금 손길', description: '클릭 기본 파워 +3', cost: level => 1 + level, effect: level => ({ clickPowerBonus: level * 3 }) },
    { id: 'p2', name: '고대의 지혜', description: '환생 시 초급 드로퍼 3개 보유', cost: () => 5, maxLevel: 1, effect: level => ({ startingDroppers: level > 0 ? 3 : 0 }) },
    { id: 'p3', name: '풍요의 계약', description: '황금 우상 보너스 +2% (5%->7%)', cost: () => 10, maxLevel: 1, effect: level => ({ prestigePointBonus: level > 0 ? 0.02 : 0 }) },
    { id: 'p4', name: '영원한 자동화', description: '환생 후에도 유지되는 자동 클리커 (+1/초)', cost: () => 15, maxLevel: 1, effect: level => ({ permanentAutoClicker: level }) },
];

const MISSION_TYPES: Mission[] = [
    { id: 'm1', name: '초심자의 행운', goal: 100, reward: 50 },
    { id: 'm2', name: '첫걸음', goal: 1000, reward: 250 },
    { id: 'm3', name: '작은 부자', goal: 10000, reward: 1500 },
    { id: 'm4', name: '티끌 모아 태산', goal: 100000, reward: 10000 },
    { id: 'm5', name: '코인 수집가', goal: 1000000, reward: 75000 },
    { id: 'm6', name: '백만장자', goal: 10000000, reward: 500000 },
    { id: 'm7', 'name': '억만장자', goal: 100000000, reward: 3000000 },
    { id: 'm8', name: '코인 군주', goal: 1000000000, reward: 20000000 },
];

const INITIAL_GAME_STATS: GameStats = {
    cpsMultiplier: 1,
    clickPower: 1,
    dropperMultipliers: {},
    autoClickerCps: 0,
    sellModifier: 0.5,
    clickCooldown: 0.7,
    dropperCostModifier: 1,
};

const INITIAL_PRESTIGE_BONUSES: PrestigeBonuses = {
    clickPowerBonus: 0,
    startingDroppers: 0,
    prestigePointBonus: 0,
    permanentAutoClicker: 0,
};

// --- HELPER FUNCTIONS ---
const formatNumber = (num: number): string => {
  if (num < 1000) return num.toFixed(0);
  const suffixes = ["", "K", "M", "B", "T", "q", "Q", "s", "S"];
  const i = Math.floor(Math.log10(num) / 3);
  const shortNum = (num / Math.pow(1000, i));
  return `${shortNum.toFixed(2)}${suffixes[i]}`;
};

// --- MAIN APP COMPONENT ---
export default function App() {
  // Core Game State
  const [coins, setCoins] = useState<number>(100);
  const [droppers, setDroppers] = useState<{ [key: string]: number }>({});
  const [purchasedUpgrades, setPurchasedUpgrades] = useState<Set<string>>(new Set());
  const [activeBoosts, setActiveBoosts] = useState<{ [key: string]: number }>({});
  const [shopTab, setShopTab] = useState<'droppers' | 'upgrades' | 'prestige' | 'altar' | 'items' | 'help' | 'sell'>('droppers');
  
  // Prestige State
  const [prestigePoints, setPrestigePoints] = useState<number>(0);
  const [purchasedPrestigeUpgrades, setPurchasedPrestigeUpgrades] = useState<{ [key: string]: number }>({});

  // Mission State
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(100);
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0);
  const [missionNotification, setMissionNotification] = useState<string | null>(null);

  // Click Cooldown State
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  // Modal States
  const [sellDropper, setSellDropper] = useState<Dropper | null>(null);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);

  // Auto-Sell State
  const [autoSellSettings, setAutoSellSettings] = useState<{ [key in Dropper['rarity']]?: string }>({});

  // --- DERIVED STATS & MEMOS ---
  const prestigeBonuses = useMemo<PrestigeBonuses>(() => {
    const initialBonuses: PrestigeBonuses = { ...INITIAL_PRESTIGE_BONUSES };
    return Object.entries(purchasedPrestigeUpgrades).reduce((acc, [id, level]) => {
      const upgrade = PRESTIGE_UPGRADE_TYPES.find(u => u.id === id);
      if (!upgrade) return acc;
      const bonus = upgrade.effect(level);
      // Manually merge bonuses to handle different properties
      if (bonus.clickPowerBonus) acc.clickPowerBonus = (acc.clickPowerBonus || 0) + bonus.clickPowerBonus;
      if (bonus.startingDroppers) acc.startingDroppers = (acc.startingDroppers || 0) + bonus.startingDroppers;
      if (bonus.prestigePointBonus) acc.prestigePointBonus = (acc.prestigePointBonus || 0) + bonus.prestigePointBonus;
      if (bonus.permanentAutoClicker) acc.permanentAutoClicker = (acc.permanentAutoClicker || 0) + bonus.permanentAutoClicker;
      return acc;
    }, initialBonuses);
  }, [purchasedPrestigeUpgrades]);

  const gameStats = useMemo<GameStats>(() => {
    let stats: GameStats = {
      ...INITIAL_GAME_STATS,
      clickPower: INITIAL_GAME_STATS.clickPower + prestigeBonuses.clickPowerBonus,
      autoClickerCps: INITIAL_GAME_STATS.autoClickerCps + prestigeBonuses.permanentAutoClicker,
    };
    purchasedUpgrades.forEach(upgradeId => {
      const upgrade = UPGRADE_TYPES.find(u => u.id === upgradeId);
      if (upgrade) {
        stats = { ...stats, ...upgrade.effect(stats) };
      }
    });
    return stats;
  }, [purchasedUpgrades, prestigeBonuses]);

  const boostMultipliers = useMemo(() => {
    let multiplier = 1;
    let clickMultiplier = 1;
    Object.entries(activeBoosts).forEach(([boostId, timeLeft]) => {
        if (timeLeft > 0) {
            const boost = BOOST_TYPES.find(b => b.id === boostId);
            if (boost?.effectType === 'multiplier') multiplier *= 2;
            if (boost?.effectType === 'click_multiplier') clickMultiplier *= 10;
        }
    });
    return { multiplier, clickMultiplier };
  }, [activeBoosts]);

  const prestigeBonusCps = useMemo(() => {
      return 1 + prestigePoints * (0.05 + prestigeBonuses.prestigePointBonus);
  }, [prestigePoints, prestigeBonuses]);

  const baseCps = useMemo<number>(() => {
    return DROPPER_TYPES.reduce((acc, dropperType) => {
      const count = droppers[dropperType.name] || 0;
      const individualMultiplier = gameStats.dropperMultipliers[dropperType.name] || 1;
      return acc + (count * dropperType.baseCps * individualMultiplier);
    }, 0);
  }, [droppers, gameStats.dropperMultipliers]);

  const totalCps = useMemo<number>(() => {
    const autoClickerTotalCps = gameStats.autoClickerCps * gameStats.clickPower;
    return (baseCps * gameStats.cpsMultiplier * boostMultipliers.multiplier * prestigeBonusCps) + autoClickerTotalCps;
  }, [baseCps, gameStats, boostMultipliers.multiplier, prestigeBonusCps]);

  const getDropperCost = useCallback((dropper: Dropper) => {
    return dropper.baseCost * gameStats.dropperCostModifier;
  }, [gameStats.dropperCostModifier]);


  // --- CORE GAME LOGIC ---

  // Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const coinsEarnedThisTick = totalCps / 10;
      setCoins(prev => prev + coinsEarnedThisTick);
      setTotalCoinsEarned(prev => prev + coinsEarnedThisTick);
    }, 100);
    return () => clearInterval(interval);
  }, [totalCps]);

  // Boost Timer
  useEffect(() => {
      const interval = setInterval(() => {
          setActiveBoosts(prev => {
              const newBoosts = { ...prev };
              let changed = false;
              for (const key in newBoosts) {
                  if (newBoosts[key] > 0) {
                      newBoosts[key] -= 1;
                      changed = true;
                  }
                  if (newBoosts[key] <= 0) {
                      delete newBoosts[key];
                  }
              }
              return changed ? newBoosts : prev;
          });
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  // Mission Check
  useEffect(() => {
    const currentMission = MISSION_TYPES[currentMissionIndex];
    if (currentMission && totalCoinsEarned >= currentMission.goal) {
        const reward = currentMission.reward;
        setCoins(prev => prev + reward);
        setTotalCoinsEarned(prev => prev + reward);
        setCurrentMissionIndex(prev => prev + 1);
        setMissionNotification(`미션 완료! +${formatNumber(reward)} 코인`);
        setTimeout(() => setMissionNotification(null), 3000);
    }
  }, [totalCoinsEarned, currentMissionIndex]);
  
  // Save/Load Logic
  const saveGame = useCallback(() => {
    try {
        const gameState = {
          coins,
          droppers,
          purchasedUpgrades: Array.from(purchasedUpgrades),
          prestigePoints,
          purchasedPrestigeUpgrades,
          totalCoinsEarned,
          currentMissionIndex,
          autoSellSettings,
        };
        localStorage.setItem('coinTempleTycoonSave', JSON.stringify(gameState));
    } catch(e) {
        console.error("Failed to save game:", e);
    }
  }, [coins, droppers, purchasedUpgrades, prestigePoints, purchasedPrestigeUpgrades, totalCoinsEarned, currentMissionIndex, autoSellSettings]);

  useEffect(() => {
    try {
        const savedState = localStorage.getItem('coinTempleTycoonSave');
        if (savedState) {
          const gameState = JSON.parse(savedState);
          setCoins(gameState.coins || 100);
          setDroppers(gameState.droppers || {});
          setPurchasedUpgrades(new Set(gameState.purchasedUpgrades || []));
          setPrestigePoints(gameState.prestigePoints || 0);
          setPurchasedPrestigeUpgrades(gameState.purchasedPrestigeUpgrades || {});
          setTotalCoinsEarned(gameState.totalCoinsEarned || 100);
          setCurrentMissionIndex(gameState.currentMissionIndex || 0);
          setAutoSellSettings(gameState.autoSellSettings || {});
        }
    } catch (error) {
        console.error("Failed to load game state:", error);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
        saveGame();
    }, 1000);
    return () => clearTimeout(handler);
  }, [saveGame]);
  
  // Auto-Sell Logic
  useEffect(() => {
      const droppersToSell: { [name: string]: number } = {};
      let hasChanges = false;
      
      DROPPER_TYPES.forEach(dropperType => {
          const limitStr = autoSellSettings[dropperType.rarity];
          if (limitStr === undefined || limitStr === '') return;

          const limit = parseInt(limitStr, 10);
          const currentCount = droppers[dropperType.name] || 0;
          
          if (!isNaN(limit) && limit >= 0 && currentCount > limit) {
              const excess = currentCount - limit;
              droppersToSell[dropperType.name] = (droppersToSell[dropperType.name] || 0) + excess;
              hasChanges = true;
          }
      });
      
      if (hasChanges) {
          let totalRefund = 0;
          const newDroppers = { ...droppers };

          Object.entries(droppersToSell).forEach(([name, quantity]) => {
              const dropperType = DROPPER_TYPES.find(d => d.name === name)!;
              totalRefund += dropperType.baseCost * gameStats.sellModifier * quantity;
              newDroppers[name] -= quantity;
              if (newDroppers[name] <= 0) {
                  delete newDroppers[name];
              }
          });
          
          setCoins(prev => prev + totalRefund);
          setDroppers(newDroppers);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppers]);


  const resetGame = (newPrestigePoints: number) => {
      setCoins(100);
      setDroppers( prestigeBonuses.startingDroppers > 0 ? { '초급 드로퍼': prestigeBonuses.startingDroppers } : {});
      setPurchasedUpgrades(new Set());
      setActiveBoosts({});
      setTotalCoinsEarned(100);
      setCurrentMissionIndex(0);
      setPrestigePoints(newPrestigePoints);
  };


  // --- EVENT HANDLERS ---
  const handleCoinClick = () => {
    if (isCoolingDown) return;

    const finalClickPower = gameStats.clickPower * boostMultipliers.clickMultiplier;
    setCoins(prev => prev + finalClickPower);
    setTotalCoinsEarned(prev => prev + finalClickPower);

    setIsCoolingDown(true);
    setTimeout(() => setIsCoolingDown(false), gameStats.clickCooldown * 1000);
  };

  const handleBuyDropper = (dropper: Dropper) => {
    const cost = getDropperCost(dropper);
    if (coins >= cost) {
      setCoins(prev => prev - cost);
      setDroppers(prev => ({ ...prev, [dropper.name]: (prev[dropper.name] || 0) + 1 }));
    }
  };
  
  const handleSellDropperConfirm = () => {
    if (!sellDropper) return;
    const count = droppers[sellDropper.name];
    if (count > 0) {
        const refundAmount = sellDropper.baseCost * gameStats.sellModifier;
        setCoins(prev => prev + refundAmount);
        setDroppers(prev => {
            const newDroppers = { ...prev };
            newDroppers[sellDropper.name]--;
            if (newDroppers[sellDropper.name] === 0) {
                delete newDroppers[sellDropper.name];
            }
            return newDroppers;
        });
    }
    setSellDropper(null);
  };

  const handleSellDropperByName = (name: string, quantity: number) => {
    const dropperType = DROPPER_TYPES.find(d => d.name === name);
    if (!dropperType) return;

    const currentCount = droppers[name] || 0;
    const sellQuantity = Math.min(quantity, currentCount);
    if (sellQuantity <= 0) return;

    const refundAmount = dropperType.baseCost * gameStats.sellModifier * sellQuantity;
    setCoins(prev => prev + refundAmount);
    setDroppers(prev => {
        const newDroppers = { ...prev };
        newDroppers[name] -= sellQuantity;
        if (newDroppers[name] <= 0) {
            delete newDroppers[name];
        }
        return newDroppers;
    });
  };

  const handleBuyUpgrade = (upgrade: Upgrade) => {
    if (coins >= upgrade.cost && !purchasedUpgrades.has(upgrade.id)) {
      setCoins(prev => prev - upgrade.cost);
      setPurchasedUpgrades(prev => new Set(prev).add(upgrade.id));
    }
  };

  const handleBuyPrestigeUpgrade = (upgrade: PrestigeUpgrade) => {
      const currentLevel = purchasedPrestigeUpgrades[upgrade.id] || 0;
      if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) return;

      const cost = typeof upgrade.cost === 'function' ? upgrade.cost(currentLevel) : upgrade.cost;
      if (prestigePoints >= cost) {
          setPrestigePoints(prev => prev - cost);
          setPurchasedPrestigeUpgrades(prev => ({ ...prev, [upgrade.id]: currentLevel + 1 }));
      }
  };
  
  const handleBuyBoost = (boost: Boost) => {
      if (coins >= boost.cost) {
          setCoins(c => c - boost.cost);
          if (boost.effectType === 'instant_gold') {
              const instantGold = totalCps * 3600; // 1 hour
              setCoins(c => c + instantGold);
              setTotalCoinsEarned(t => t + instantGold);
          } else if (boost.duration) {
              setActiveBoosts(prev => ({ ...prev, [boost.id]: boost.duration }));
          }
      }
  };

  const handlePrestige = () => {
    const gain = Math.floor(Math.pow(totalCoinsEarned / 1e8, 0.5));
    if (gain > 0) {
        resetGame(prestigePoints + gain);
    }
    setShowPrestigeModal(false);
  };
  
  const handleAutoSellChange = (rarity: Dropper['rarity'], value: string) => {
    const newSettings = { ...autoSellSettings };
    if (value === '' || parseInt(value, 10) < 0) {
        delete newSettings[rarity];
    } else {
        newSettings[rarity] = value;
    }
    setAutoSellSettings(newSettings);
  };

  // --- RENDER LOGIC ---
  const allDroppers = useMemo(() => {
    const result: { type: Dropper, key: string }[] = [];
    Object.entries(droppers).forEach(([name, count]) => {
      const type = DROPPER_TYPES.find(d => d.name === name);
      if (type) {
        for (let i = 0; i < count; i++) {
          result.push({ type, key: `${name}-${i}` });
        }
      }
    });
    return result;
  }, [droppers]);

  const prestigeGain = Math.floor(Math.pow(totalCoinsEarned / 1e8, 0.5));

  const currentMission = MISSION_TYPES[currentMissionIndex];
  const missionProgress = currentMission ? Math.min(100, (totalCoinsEarned / currentMission.goal) * 100) : 100;

  return (
    <div className="flex flex-col h-screen bg-gd-dark text-gd-light-sand font-sans select-none overflow-hidden">
        {missionNotification && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gd-gold text-gd-dark text-2xl p-6 border-4 border-gd-dark-stone z-50 dropper-anim">
                {missionNotification}
            </div>
        )}
        
        <header className="bg-gd-dark-stone p-2 border-b-4 border-gd-stone text-center space-y-2">
            <h1 className="text-xl text-gd-gold">코인 템플 타이쿤</h1>
            <div className='flex justify-center items-center gap-4 text-sm'>
                <div 
                    className={`relative p-2 border-2 ${isCoolingDown ? 'border-gd-stone' : 'border-gd-gold'} cursor-pointer transition-transform transform hover:scale-110 active:scale-95 group`}
                    onClick={handleCoinClick}
                    title={`클릭 쿨타임: ${gameStats.clickCooldown.toFixed(1)}초`}
                >
                    <CoinIcon className="h-10 w-10 text-gd-gold" />
                    <span className="absolute -top-2 -right-2 bg-gd-blue text-white text-xs px-1.5 py-0.5 border-2 border-gd-dark-stone">+
                        {formatNumber(gameStats.clickPower * boostMultipliers.clickMultiplier)}
                    </span>
                    {isCoolingDown && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs">쿨타임...</div>}
                </div>
                <div className="flex-grow text-left space-y-1">
                    <h2 className="text-2xl text-gd-gold flex items-center">
                        <CoinIcon className="h-6 w-6 mr-2" /> {formatNumber(coins)}
                    </h2>
                    <p className="text-xs text-gd-sand">
                        드로퍼: {formatNumber(baseCps * gameStats.cpsMultiplier * boostMultipliers.multiplier * prestigeBonusCps)}/초 | 
                        자동클릭: {formatNumber(gameStats.autoClickerCps * gameStats.clickPower)}/초
                    </p>
                    <p className="text-xs text-gd-green">
                        총: {formatNumber(totalCps)}/초 (x{prestigeBonusCps.toFixed(2)} 환생)
                    </p>
                </div>
                <div className='text-right'>
                    <h3 className='text-gd-blue'>황금 우상</h3>
                    <p className='text-lg'>{prestigePoints}</p>
                    <p className='text-xs text-gd-sand'>({(prestigeBonusCps * 100 - 100).toFixed(1)}% 보너스)</p>
                </div>
            </div>
            
            {currentMission && (
                <div className="bg-gd-dark p-2 border-2 border-gd-stone">
                    <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                            <p className="text-gd-gold">{currentMission.name}</p>
                            <p className="text-gd-sand">보상: <CoinIcon className="h-3 w-3 inline-block" /> {formatNumber(currentMission.reward)}</p>
                        </div>
                        <div className="w-full bg-gd-stone h-4 border border-gd-dark-stone">
                            <div className="bg-gd-green h-full" style={{ width: `${missionProgress}%` }}></div>
                        </div>
                        <p className="text-center text-xs mt-1">{formatNumber(totalCoinsEarned)} / {formatNumber(currentMission.goal)}</p>
                    </div>
                </div>
            )}
            <div className="h-6 flex items-center justify-center gap-4 text-xs">
                {Object.entries(activeBoosts).map(([id, timeLeft]) => {
                    const boost = BOOST_TYPES.find(b => b.id === id);
                    if (timeLeft > 0 && boost) {
                        return <div key={id} className="bg-gd-blue text-white px-2 py-1 border border-gd-dark-stone">{boost.name}: {Math.ceil(timeLeft)}초</div>
                    }
                    return null;
                })}
            </div>
        </header>

        <main className="flex-grow bg-gd-dark overflow-hidden relative p-2">
             <div className="h-full w-full overflow-y-auto overflow-x-hidden flex flex-wrap gap-2 content-start p-2 bg-gd-dark-stone border-4 border-gd-stone">
                {allDroppers.map(({type, key}) => (
                    <div 
                        key={key} 
                        className={`dropper-anim h-8 w-8 ${type.color} border-2 border-gd-dark-stone cursor-pointer transition-transform transform hover:scale-110`}
                        onClick={() => setSellDropper(type)}
                        title={`${type.name} 판매`}
                    />
                ))}
            </div>
        </main>

        <footer className="bg-gd-dark-stone border-t-4 border-gd-stone">
             <div className="flex">
                {['droppers', 'upgrades', 'items', 'altar', 'prestige', 'sell', 'help'].map(tab => (
                    <button key={tab} onClick={() => setShopTab(tab as any)} className={`flex-1 p-2 text-sm ${shopTab === tab ? 'bg-gd-sand text-gd-dark' : 'bg-gd-dark-stone text-gd-sand'}`}>
                        {tab === 'droppers' && '드로퍼'}
                        {tab === 'upgrades' && '업그레이드'}
                        {tab === 'items' && '아이템'}
                        {tab === 'altar' && '신성한 제단'}
                        {tab === 'prestige' && '승천'}
                        {tab === 'sell' && '일괄 판매'}
                        {tab === 'help' && '도움말'}
                    </button>
                ))}
            </div>
            <div className="p-2 h-48 overflow-y-auto">
                {shopTab === 'droppers' && (
                    <div className="grid grid-cols-2 gap-2">
                        {DROPPER_TYPES.map(dropper => {
                            const cost = getDropperCost(dropper);
                            const canAfford = coins >= cost;
                            return (
                                <button key={dropper.id} onClick={() => handleBuyDropper(dropper)} disabled={!canAfford} className="bg-gd-stone p-2 border-2 border-gd-dark-stone text-left flex flex-col justify-between h-full min-h-[90px]">
                                    <div className="flex justify-between">
                                        <h3 className={`text-sm ${dropper.color.replace('bg-', 'text-')}`}>{dropper.name}</h3>
                                        <p className="text-sm text-gd-light-sand">x{droppers[dropper.name] || 0}</p>
                                    </div>
                                    <p className="text-xs text-gd-sand">초당 +{dropper.baseCps}</p>
                                    <p className="text-sm text-gd-gold flex items-center">
                                        <CoinIcon className="h-4 w-4 mr-1" />{formatNumber(cost)}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                )}
                {shopTab === 'upgrades' && (
                     <div className="grid grid-cols-2 gap-2">
                        {UPGRADE_TYPES.map(upgrade => {
                            const isPurchased = purchasedUpgrades.has(upgrade.id);
                            const canAfford = coins >= upgrade.cost;
                            return (
                                <button key={upgrade.id} onClick={() => handleBuyUpgrade(upgrade)} disabled={isPurchased || !canAfford} className="bg-gd-stone p-2 border-2 border-gd-dark-stone text-left flex flex-col justify-between h-full min-h-[90px]">
                                    <div>
                                        <h3 className="text-sm text-gd-gold">{upgrade.name}</h3>
                                        <p className="text-xs text-gd-sand">{upgrade.description}</p>
                                    </div>
                                    <p className="text-sm text-gd-gold flex items-center">
                                        {isPurchased ? '구매 완료' : <><CoinIcon className="h-4 w-4 mr-1" />{formatNumber(upgrade.cost)}</>}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                )}
                {shopTab === 'items' && (
                     <div className="grid grid-cols-2 gap-2">
                        {BOOST_TYPES.map(boost => {
                             const canAfford = coins >= boost.cost;
                             const isActive = activeBoosts[boost.id] > 0;
                             return (
                                 <button key={boost.id} onClick={() => handleBuyBoost(boost)} disabled={!canAfford || isActive} className="bg-gd-stone p-2 border-2 border-gd-dark-stone text-left flex flex-col justify-between h-full min-h-[90px]">
                                     <div>
                                         <h3 className="text-sm text-gd-blue">{boost.name}</h3>
                                         <p className="text-xs text-gd-sand">{boost.description}</p>
                                     </div>
                                     <p className="text-sm text-gd-gold flex items-center">
                                        {isActive ? `활성 중... (${Math.ceil(activeBoosts[boost.id])}s)` : <><CoinIcon className="h-4 w-4 mr-1" />{formatNumber(boost.cost)}</>}
                                     </p>
                                 </button>
                             );
                        })}
                    </div>
                )}
                 {shopTab === 'altar' && (
                     <div className="grid grid-cols-2 gap-2">
                        {PRESTIGE_UPGRADE_TYPES.map(upgrade => {
                            const level = purchasedPrestigeUpgrades[upgrade.id] || 0;
                            const isMaxLevel = upgrade.maxLevel && level >= upgrade.maxLevel;
                            const cost = typeof upgrade.cost === 'function' ? upgrade.cost(level) : upgrade.cost;
                            const canAfford = prestigePoints >= cost;
                            return (
                                <button key={upgrade.id} onClick={() => handleBuyPrestigeUpgrade(upgrade)} disabled={isMaxLevel || !canAfford} className="bg-gd-dark-stone p-2 border-2 border-gd-blue text-left flex flex-col justify-between h-full min-h-[90px]">
                                     <div>
                                         <h3 className="text-sm text-gd-blue">{upgrade.name} {upgrade.maxLevel ? `(${level}/${upgrade.maxLevel})` : `(Lv. ${level})`}</h3>
                                         <p className="text-xs text-gd-sand">{upgrade.description}</p>
                                     </div>
                                     <p className="text-sm text-gd-blue">
                                         {isMaxLevel ? '최대 레벨' : `비용: ${cost} 우상`}
                                     </p>
                                </button>
                            );
                        })}
                    </div>
                )}
                {shopTab === 'prestige' && (
                    <div className="col-span-2 bg-gd-dark-stone p-4 border-2 border-gd-gold text-center flex flex-col items-center justify-center h-full">
                        <h3 className="text-lg text-gd-gold">사원 승천</h3>
                        <p className="text-xs text-gd-sand mt-2 mb-4">
                            총 획득 코인이 1억 이상일 때 진행할 수 있습니다.
                            모든 진행 상황을 초기화하고 '황금 우상'을 얻습니다.
                        </p>
                        <p className='mb-1'>현재 획득 가능한 우상:</p>
                        <p className="text-2xl text-gd-blue mb-4">{prestigeGain}</p>
                        <button onClick={() => setShowPrestigeModal(true)} disabled={prestigeGain <= 0} className="bg-gd-gold text-gd-dark p-2 text-sm border-2 border-gd-dark">승천하기</button>
                        <p className="text-xs text-gd-stone mt-2">필요 코인: {formatNumber(1e8)}</p>
                    </div>
                )}
                {shopTab === 'sell' && (
                    <div className="space-y-2">
                        <div className='p-2 bg-gd-dark border border-gd-stone mb-4'>
                            <h4 className="text-center text-md text-gd-gold mb-2">자동 판매 설정</h4>
                            <p className='text-center text-xs text-gd-stone mb-3'>설정한 개수를 초과하는 드로퍼를 자동으로 판매합니다. 비워두면 비활성화됩니다.</p>
                            <div className='grid grid-cols-3 gap-2 text-xs'>
                                {DROPPER_TYPES.map(dt => (
                                    <div key={dt.rarity} className='flex flex-col items-center'>
                                        <label htmlFor={`autosell-${dt.rarity}`} className={`${dt.color.replace('bg-','text-')} mb-1`}>{dt.rarity}</label>
                                        <input 
                                            id={`autosell-${dt.rarity}`}
                                            type="number"
                                            min="0"
                                            value={autoSellSettings[dt.rarity] || ''}
                                            onChange={(e) => handleAutoSellChange(dt.rarity, e.target.value)}
                                            className="w-20 bg-gd-dark-stone text-gd-light-sand text-center border border-gd-stone p-1"
                                            placeholder='끄기'
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <h3 className="text-center text-lg text-gd-gold">일괄 판매</h3>
                        <div className="space-y-1">
                            {Object.keys(droppers).length > 0 ? Object.entries(droppers).map(([name, count]) => {
                                const dropperType = DROPPER_TYPES.find(d => d.name === name);
                                if (!dropperType || count === 0) return null;
                                const refundAmount = dropperType.baseCost * gameStats.sellModifier;
                                return (
                                    <div key={name} className="flex items-center justify-between bg-gd-dark p-2 border border-gd-stone">
                                        <div className="flex items-center">
                                            <div className={`h-6 w-6 ${dropperType.color} border border-gd-dark-stone mr-3`}></div>
                                            <div>
                                                <p className="text-sm text-gd-light-sand">{name} (x{count})</p>
                                                <p className="text-xs text-gd-gold flex items-center">
                                                    <CoinIcon className="h-3 w-3 mr-1" />
                                                    {formatNumber(refundAmount)}/개
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleSellDropperByName(name, 1)} className="bg-gd-stone text-white px-3 py-1 text-xs">1개 판매</button>
                                            <button onClick={() => handleSellDropperByName(name, count)} className="bg-gd-red text-white px-3 py-1 text-xs">전체 판매</button>
                                        </div>
                                    </div>
                                )
                            }) : <p className="text-center text-gd-stone pt-8">판매할 드로퍼가 없습니다.</p>}
                        </div>
                    </div>
                )}
                {shopTab === 'help' && (
                    <div className="text-xs text-gd-sand space-y-3 p-2">
                         <h3 className="text-sm text-gd-gold">게임 방법</h3>
                         <p><span className="text-gd-gold">코인:</span> 화면 상단의 코인 아이콘을 클릭하거나, 드로퍼들로부터 자동으로 코인을 얻습니다.</p>
                         <p><span className="text-gd-gold">드로퍼:</span> 코인을 사용하여 원하는 드로퍼를 직접 구매하고 생산량을 늘립니다.</p>
                         <p><span className="text-gd-gold">업그레이드:</span> 코인 생산량, 클릭 파워 등 다양한 능력치를 영구적으로 강화합니다.</p>
                         <p><span className="text-gd-gold">아이템:</span> 일시적으로 강력한 효과를 발휘하는 부스트 아이템을 구매할 수 있습니다.</p>
                         <p><span className="text-gd-gold">승천:</span> 가장 중요한 시스템입니다. 총 획득 코인이 1억을 넘으면 모든 것을 초기화하는 대신, 영구적인 보너스를 주는 '황금 우상'을 얻습니다. 반복적인 승천이 성장의 핵심입니다!</p>
                         <p><span className="text-gd-gold">신성한 제단:</span> '황금 우상'을 사용하여 환생 후에도 사라지지 않는 강력한 특전을 구매할 수 있습니다.</p>
                    </div>
                )}
            </div>
        </footer>
        
        {sellDropper && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20" onClick={() => setSellDropper(null)}>
                <div className="bg-gd-dark-stone p-6 border-4 border-gd-stone text-center" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg text-gd-gold mb-2">{sellDropper.name} 판매</h3>
                    <p className="text-gd-sand mb-4">
                        판매 시 <span className="text-gd-gold">{formatNumber(sellDropper.baseCost * gameStats.sellModifier)}</span> 코인을 돌려받습니다.
                    </p>
                    <div className="flex gap-4">
                        <button onClick={handleSellDropperConfirm} className="flex-1 bg-gd-red text-white p-2 text-sm">판매</button>
                        <button onClick={() => setSellDropper(null)} className="flex-1 bg-gd-stone text-white p-2 text-sm">취소</button>
                    </div>
                </div>
            </div>
        )}
        
        {showPrestigeModal && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20" onClick={() => setShowPrestigeModal(false)}>
                <div className="bg-gd-dark-stone p-6 border-4 border-gd-red text-center" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg text-gd-red mb-2">정말 승천하시겠습니까?</h3>
                    <p className="text-gd-sand mb-4">
                        모든 코인, 드로퍼, 업그레이드가 초기화됩니다. (황금 우상 및 제단 업그레이드 제외)
                    </p>
                    <p className="text-gd-sand mb-4">
                        <span className="text-gd-blue text-xl">{prestigeGain}</span>개의 황금 우상을 얻게 됩니다.
                    </p>
                    <div className="flex gap-4">
                        <button onClick={handlePrestige} className="flex-1 bg-gd-red text-white p-2 text-sm">확인</button>
                        <button onClick={() => setShowPrestigeModal(false)} className="flex-1 bg-gd-stone text-white p-2 text-sm">취소</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
