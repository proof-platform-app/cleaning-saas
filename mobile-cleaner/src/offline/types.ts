// mobile-cleaner/src/offline/types.ts
// OFFLINE QUEUE MODEL v0
// ------------------------------------------
// Здесь только типы и договорённости.
// Реальную оффлайн-очередь (запись в AsyncStorage,
// ретраи и т.п.) будем делать в отдельной фазе.

export type ChecklistBulkOutboxItem = {
  type: "checklist_bulk";
  jobId: number;
  payload: { id: number; is_completed: boolean }[];
};

export type PhotoOutboxItem = {
  type: "photo";
  jobId: number;
  photoType: "before" | "after";
  localUri: string;
};

/**
 * Допустимые элементы оффлайн-очереди.
 *
 * ВАЖНО:
 * - сюда не добавляем check-in / check-out;
 * - только "мягкие" операции, которые можно
 *   безопасно повторять.
 */
export type OutboxItem = ChecklistBulkOutboxItem | PhotoOutboxItem;
