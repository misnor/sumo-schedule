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
