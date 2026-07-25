import { hashObject } from "./determinism.js";

export type PublishingSourceTier = "A_OFFICIAL" | "B_MEASURED" | "C_ESTIMATED";

export interface PublishingSourceRecord {
  readonly sourceId: "R14" | "R15" | "R16" | "R17";
  readonly title: string;
  readonly sourceUrl: string;
  readonly sourceTier: PublishingSourceTier;
  readonly publishedAt: string;
  readonly collectedAt: string;
  readonly platformScope: readonly string[];
  readonly methodology: string;
  readonly licenseStatus: "PUBLIC_REFERENCE_ONLY";
  readonly facts: readonly string[];
  readonly contentHash: string;
}

export interface HistoricalAnalog {
  id: "miyabi-1.4" | "astra-1.5" | "yixuan-2.0" | "yuzuha-2.1";
  character: string;
  version: string;
  launchDate: string;
  previousDayRank: number;
  launchDayRank: number;
  nextDayBestRank: number;
  monthlyEstimateLabel: string;
  comparableFactors: string[];
  nonComparableFactors: string[];
  sourceId: "R17";
}

export interface PublishingSnapshot {
  snapshotId: string;
  versionId: "3.1";
  market: "JP";
  targetCharacter: "remiel";
  targetCharacterJa: "レミエール";
  releaseAt: "2026-07-29T00:00:00+09:00";
  dataCutoffAt: string;
  publicSourceBundleHash: string;
  sources: readonly PublishingSourceRecord[];
  historicalAnalogs: readonly HistoricalAnalog[];
  fixedConfounders: readonly string[];
  materialIds: readonly string[];
  status: "AWAITING_POSTLAUNCH_OBSERVATION";
}

const COLLECTED_AT = "2026-07-25T13:35:00+09:00";

const SOURCE_INPUTS = [
  {
    sourceId: "R14",
    title: "『ゼンレスゾーンゼロ』Ver.3.1『ロング・グッドバイ』予告番組｜情報まとめ",
    sourceUrl: "https://zenless.hoyoverse.com/ja-jp/news/165248",
    sourceTier: "A_OFFICIAL",
    publishedAt: "2026-07-17T20:45:00+09:00",
    collectedAt: COLLECTED_AT,
    platformScope: ["OFFICIAL_JP_WEB"],
    methodology: "Official Japanese version announcement; facts are manually bounded to the public page.",
    licenseStatus: "PUBLIC_REFERENCE_ONLY",
    facts: [
      "Version 3.1 launches on 2026-07-29 JST.",
      "Remiel and Sigrid are announced for Version 3.1.",
      "Lucy costume Princess no Kyuujitsu is distributed as an event reward.",
      "First top-up double bonus resets during the version window.",
    ],
  },
  {
    sourceId: "R15",
    title: "Ver.3.1『ゼンレスゾーンゼロ』2ndアニバーサリー特典速報",
    sourceUrl: "https://zenless.hoyoverse.com/ja-jp/news/165249",
    sourceTier: "A_OFFICIAL",
    publishedAt: "2026-07-17T20:25:00+09:00",
    collectedAt: COLLECTED_AT,
    platformScope: ["OFFICIAL_JP_WEB"],
    methodology: "Official Japanese anniversary-benefit announcement.",
    licenseStatus: "PUBLIC_REFERENCE_ONLY",
    facts: [
      "Anniversary rewards include a free limited S-rank Agent and W-Engine.",
      "Anniversary rewards include 1600 Polychromes and 20 pulls.",
    ],
  },
  {
    sourceId: "R16",
    title: "New Eridan Vol.06 I シャドウ・ソリスト＆月夜のささやき",
    sourceUrl: "https://zenless.hoyoverse.com/ja-jp/news/165348",
    sourceTier: "A_OFFICIAL",
    publishedAt: "2026-07-24T18:30:00+09:00",
    collectedAt: COLLECTED_AT,
    platformScope: ["OFFICIAL_JP_WEB"],
    methodology: "Official Japanese costume announcement.",
    licenseStatus: "PUBLIC_REFERENCE_ONLY",
    facts: [
      "Remiel costumes Shadow Soloist and Whisper of the Moonlit Night are announced.",
    ],
  },
  {
    sourceId: "R17",
    title: "ゼンレスゾーンゼロ【売上ランキング・推移】",
    sourceUrl: "https://game-i.daa.jp/?APP/1606356401",
    sourceTier: "C_ESTIMATED",
    publishedAt: "2026-07-25T13:35:00+09:00",
    collectedAt: COLLECTED_AT,
    platformScope: ["JP_IOS_APP_STORE"],
    methodology: "Third-party ordinal ranking history and explicitly rough monthly estimate; not disclosed revenue.",
    licenseStatus: "PUBLIC_REFERENCE_ONLY",
    facts: [
      "Historical daily Japan iOS ranking windows for Versions 1.4, 1.5, 2.0 and 2.1.",
      "Monthly G labels are third-party rough estimates and must not be treated as revenue.",
    ],
  },
] as const;

export const HISTORICAL_ANALOGS: readonly HistoricalAnalog[] = Object.freeze([
  {
    id: "miyabi-1.4",
    character: "星見雅",
    version: "1.4",
    launchDate: "2024-12-18",
    previousDayRank: 55,
    launchDayRank: 33,
    nextDayBestRank: 2,
    monthlyEstimateLabel: "15.03 億 G (Game-i rough estimate)",
    comparableFactors: ["limited-character release", "Japan iOS daily rank window"],
    nonComparableFactors: ["different version scale", "different roster need", "not an anniversary window"],
    sourceId: "R17",
  },
  {
    id: "astra-1.5",
    character: "耀嘉音",
    version: "1.5",
    launchDate: "2025-01-22",
    previousDayRank: 44,
    launchDayRank: 32,
    nextDayBestRank: 1,
    monthlyEstimateLabel: "12.61 億 G (Game-i rough estimate)",
    comparableFactors: ["limited-character release", "Japan iOS daily rank window"],
    nonComparableFactors: ["different role and banner mix", "different seasonal window"],
    sourceId: "R17",
  },
  {
    id: "yixuan-2.0",
    character: "仪玄",
    version: "2.0",
    launchDate: "2025-06-06",
    previousDayRank: 79,
    launchDayRank: 57,
    nextDayBestRank: 1,
    monthlyEstimateLabel: "13.65 億 G (Game-i rough estimate)",
    comparableFactors: ["anniversary-scale version", "limited-character release", "Japan iOS daily rank window"],
    nonComparableFactors: ["first-anniversary package", "different benefits and top-up context"],
    sourceId: "R17",
  },
  {
    id: "yuzuha-2.1",
    character: "浮波柚叶",
    version: "2.1",
    launchDate: "2025-07-16",
    previousDayRank: 116,
    launchDayRank: 82,
    nextDayBestRank: 2,
    monthlyEstimateLabel: "8.92 億 G (Game-i rough estimate)",
    comparableFactors: ["summer version", "limited-character release", "Japan iOS daily rank window"],
    nonComparableFactors: ["different anniversary proximity", "different costume and banner package"],
    sourceId: "R17",
  },
]);

export const MARKET_FIT_SNAPSHOT = Object.freeze({
  market: "JP",
  category: "cross-platform action RPG with character collection and live operations",
  opportunities: [
    "Existing Japanese official publishing surface and observable mobile ranking history.",
    "Character, combat and cosmetic motivations can be represented as separate synthetic attributes.",
    "The 42-day cadence provides a fixed pre-release decision window.",
  ],
  entryFriction: [
    "Action-combat learning and account progression burden for new or returning players.",
    "Anniversary multi-banner competition and limited pull budgets.",
    "Public mobile ranks do not cover PlayStation or PC revenue.",
  ],
  platformScope: {
    observed: ["Japan iOS ordinal ranking", "Japan Android lagged ranking when publicly available", "official JP content interactions"],
    unavailable: ["Japan all-platform revenue", "single-character disclosed revenue", "private player-level conversion"],
  },
  dataGaps: [
    "No public randomized release-strategy branches exist.",
    "No official single-character Japan revenue disclosure is available.",
    "PlayStation and PC signals cannot be added to mobile estimates as total revenue.",
  ],
});

export function createPublicSourceBundle(): readonly PublishingSourceRecord[] {
  return Object.freeze(SOURCE_INPUTS.map((source) => Object.freeze({
    ...source,
    platformScope: Object.freeze([...source.platformScope]),
    facts: Object.freeze([...source.facts]),
    contentHash: hashObject(source),
  }))) as readonly PublishingSourceRecord[];
}

export function createPublishingSnapshot(
  dataCutoffAt = "2026-07-25T13:35:00+09:00",
): PublishingSnapshot {
  const sources = createPublicSourceBundle();
  const publicSourceBundleHash = hashObject(sources);
  const body = {
    versionId: "3.1" as const,
    market: "JP" as const,
    targetCharacter: "remiel" as const,
    targetCharacterJa: "レミエール" as const,
    releaseAt: "2026-07-29T00:00:00+09:00" as const,
    dataCutoffAt,
    publicSourceBundleHash,
    sources,
    historicalAnalogs: HISTORICAL_ANALOGS,
    fixedConfounders: Object.freeze([
      "second-anniversary rewards",
      "free limited S-rank Agent and W-Engine",
      "1600 Polychromes",
      "20 pulls",
      "rerun and custom banners",
      "first top-up double reset",
      "Lucy free swimsuit costume",
      "other Version 3.1 characters and costumes",
    ]),
    materialIds: Object.freeze(["R14:version-overview", "R15:anniversary-benefits", "R16:remiel-costumes"]),
    status: "AWAITING_POSTLAUNCH_OBSERVATION" as const,
  };
  return Object.freeze({ ...body, snapshotId: `zzz-3.1-jp-${hashObject(body).slice(0, 16)}` });
}
