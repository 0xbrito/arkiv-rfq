import type {
  ArkivPublicClient,
  ArkivEntity,
  WriteEntityOptions,
  QueryOptions,
  QueryResponse,
  WatchEntitiesOptions,
} from '../../src/types/arkiv.js';

/**
 * Mock implementation of Arkiv client for testing
 */
export class ArkivClientMock implements ArkivPublicClient {
  private entities: Map<string, ArkivEntity> = new Map();
  private watchers: Array<{
    options: WatchEntitiesOptions;
    unsubscribe: () => void;
  }> = [];

  async writeEntity(options: WriteEntityOptions): Promise<ArkivEntity> {
    const entity: ArkivEntity = {
      entityKey: options.entityKey,
      data: options.data,
      timestamp: Date.now(),
    };

    this.entities.set(
      `${options.entityType}:${options.entityKey}`,
      entity
    );

    // Trigger watchers
    this.triggerWatchers(options.entityType, entity, 'created');

    return entity;
  }

  async queryEntities(options: QueryOptions): Promise<QueryResponse> {
    const entities: ArkivEntity[] = [];

    for (const [key, entity] of this.entities.entries()) {
      if (key.startsWith(`${options.entityType}:`)) {
        // Apply filters
        if (this.matchesFilters(entity, options.filters)) {
          entities.push(entity);
        }
      }
    }

    // Apply sorting
    if (options.sort) {
      entities.sort((a, b) => {
        const aVal = this.getNestedValue(a.data, options.sort!.field);
        const bVal = this.getNestedValue(b.data, options.sort!.field);
        const order = options.sort!.order === 'asc' ? 1 : -1;
        return (aVal > bVal ? 1 : -1) * order;
      });
    }

    // Apply pagination
    const limit = options.limit || 50;
    const paginatedEntities = entities.slice(0, limit);
    const hasMore = entities.length > limit;

    return {
      entities: paginatedEntities,
      total: entities.length,
      nextCursor: hasMore ? 'mock-cursor' : undefined,
    };
  }

  async getEntity(
    entityType: string,
    entityKey: string
  ): Promise<ArkivEntity | null> {
    return this.entities.get(`${entityType}:${entityKey}`) || null;
  }

  async deleteEntity(entityType: string, entityKey: string): Promise<void> {
    this.entities.delete(`${entityType}:${entityKey}`);
  }

  watchEntities(options: WatchEntitiesOptions): () => void {
    const unsubscribe = () => {
      const index = this.watchers.findIndex(
        (w) => w.options === options
      );
      if (index !== -1) {
        this.watchers.splice(index, 1);
      }
    };

    this.watchers.push({ options, unsubscribe });

    return unsubscribe;
  }

  // Helper methods for testing
  clear(): void {
    this.entities.clear();
    this.watchers = [];
  }

  getEntityCount(): number {
    return this.entities.size;
  }

  simulateEntityUpdate(entity: ArkivEntity, entityType: string): void {
    this.triggerWatchers(entityType, entity, 'updated');
  }

  private triggerWatchers(
    entityType: string,
    entity: ArkivEntity,
    eventType: 'created' | 'updated'
  ): void {
    for (const watcher of this.watchers) {
      if (watcher.options.entityType === entityType) {
        // Apply filters
        if (this.matchesFilters(entity, watcher.options.filters)) {
          if (eventType === 'created' && watcher.options.onCreated) {
            watcher.options.onCreated(entity);
          } else if (eventType === 'updated' && watcher.options.onUpdated) {
            watcher.options.onUpdated(entity);
          }
        }
      }
    }
  }

  private matchesFilters(
    entity: ArkivEntity,
    filters?: Record<string, any>
  ): boolean {
    if (!filters) return true;

    for (const [key, value] of Object.entries(filters)) {
      if (key === '$or') {
        // Handle $or operator
        const orConditions = value as Array<Record<string, any>>;
        const matches = orConditions.some((condition) =>
          this.matchesFilters(entity, condition)
        );
        if (!matches) return false;
      } else {
        const entityValue = this.getNestedValue(entity.data, key);

        if (typeof value === 'object' && !Array.isArray(value)) {
          // Handle operators like $gte, $lte
          if (value.$gte !== undefined && entityValue < value.$gte) {
            return false;
          }
          if (value.$lte !== undefined && entityValue > value.$lte) {
            return false;
          }
        } else {
          // Direct comparison
          if (entityValue !== value) return false;
        }
      }
    }

    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}
