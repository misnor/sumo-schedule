export type Env = {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_WEBHOOK_URL: string;
  SUMO_WEBHOOK_SECRET: string;
  TZ: string; // kept for compatibility; Discord timestamps are TZ-agnostic
};

export type Basho = {
  bashoId: string;
  startDate?: string;
  endDate?: string;
  city?: string;
  venue?: string;
};

export type Division = 'Makuuchi' | 'Juryo';

export type BanzukeApiRow = {
  side: 'East' | 'West';
  rikishiID: number;
  shikonaEn: string;
  shikonaJp?: string;
  rankValue: number;
  rank: string;
  wins?: number;
  losses?: number;
  absences?: number;
};

export type BanzukeApi = {
  bashoId: string;
  division: Division;
  east: BanzukeApiRow[];
  west: BanzukeApiRow[];
};

export type BanzukeRow = {
  rikishiID: number;
  shikona: string;
  side: 'East' | 'West';
  rankValue: number;
  rankLabel: string;  
};

export type Banzuke = {
  bashoId: string;
  division: Division;
  rows: BanzukeRow[];
};

export type Band = 'Yokozuna' | 'Ozeki' | 'Sekiwake' | 'Komusubi' | 'Maegashira';

export type RankedEntry = {
  rikishiID: number;
  ordinal: number;
  rankValue: number;
  side: 'East' | 'West';
  rankLabel: string;
  shikona: string;
};

export type DiffRow = {
  rikishiID: number;
  shikona: string;
  rankLabel: string;
  rankValue: number;
  side: 'East' | 'West';
  ordinal: number;
  band: Band;
  delta: number | null;       // in 0.5 steps; null when not comparable
  deltaLabel: string;         // "+0.5" | "-1.0" | "0" | "↑ from Juryo" | "NEW"
};

export type DiffResult = {
  currentId: string;
  prevId: string;
  rows: DiffRow[];            // sorted by ordinal asc
};

export type RenderRow = {
  band: Band;
  rankLabel: string;
  shikona: string;
  deltaLabel: string;
  side: 'East' | 'West';
  rankNum: number;     // 1..N within band
};

export type RenderInput = {
  title: string;     // e.g., "September 2025 Basho"
  subtitle: string;  // e.g., "vs July 2025"
  rows: RenderRow[]; // in visual order, band headers inferred from band changes
};
