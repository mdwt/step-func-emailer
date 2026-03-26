export interface ResolvedConfig {
  tableName: string;
  eventsTableName: string;
  templateBucket: string;
  sesConfigSet: string;
  unsubscribeBaseUrl: string;
  unsubscribeSecret: string;
  eventBusName: string;
  dataTtlDays?: number;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function resolveConfig(): ResolvedConfig {
  return {
    tableName: required("TABLE_NAME"),
    eventsTableName: required("EVENTS_TABLE_NAME"),
    templateBucket: required("TEMPLATE_BUCKET"),
    sesConfigSet: required("SES_CONFIG_SET"),
    unsubscribeBaseUrl: process.env.UNSUBSCRIBE_BASE_URL ?? "",
    unsubscribeSecret: required("UNSUBSCRIBE_SECRET"),
    eventBusName: process.env.EVENT_BUS_NAME ?? "",
    dataTtlDays: process.env.DATA_TTL_DAYS ? parseInt(process.env.DATA_TTL_DAYS, 10) : undefined,
  };
}
