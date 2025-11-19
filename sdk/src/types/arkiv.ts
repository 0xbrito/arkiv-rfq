/**
 * Mock types for Arkiv SDK (to be replaced with actual @arkiv/sdk types)
 * These types represent the expected interface from Arkiv's SDK
 */

export interface ArkivEntity {
  entityKey: string;
  data: Record<string, any>;
  timestamp: number;
}

export interface WriteEntityOptions {
  entityType: string;
  entityKey: string;
  data: Record<string, any>;
  signature?: string;
}

export interface QueryOptions {
  entityType: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  limit?: number;
  cursor?: string;
}

export interface QueryResponse {
  entities: ArkivEntity[];
  total: number;
  nextCursor?: string;
}

export interface WatchEntitiesOptions {
  entityType: string;
  onCreated?: (entity: ArkivEntity) => void;
  onUpdated?: (entity: ArkivEntity) => void;
  onDeleted?: (entityKey: string) => void;
  pollingInterval?: number;
  filters?: Record<string, any>;
}

export interface ArkivPublicClient {
  writeEntity(options: WriteEntityOptions): Promise<ArkivEntity>;
  queryEntities(options: QueryOptions): Promise<QueryResponse>;
  getEntity(entityType: string, entityKey: string): Promise<ArkivEntity | null>;
  deleteEntity(entityType: string, entityKey: string): Promise<void>;
  watchEntities(options: WatchEntitiesOptions): () => void;
}
