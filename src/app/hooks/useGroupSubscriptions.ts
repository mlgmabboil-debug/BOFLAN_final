import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readGroupSubscriptions,
  subscribeGroupSubscriptions,
  upsertGroupSubscription,
  markCreatorPayoutDone,
  type GroupSubscriptionRecord,
} from "../utils/groupSubscriptionsStore";

export function useGroupSubscriptions() {
  const [v, setV] = useState(0);
  useEffect(() => subscribeGroupSubscriptions(() => setV((x) => x + 1)), []);

  const subs = useMemo(() => readGroupSubscriptions(), [v]);

  const getFor = useCallback(
    (userId: string | undefined, groupId: string) => {
      if (!userId) return null;
      return subs.find((s) => s.userId === userId && s.groupId === groupId) ?? null;
    },
    [subs]
  );

  const upsert = useCallback((rec: GroupSubscriptionRecord) => {
    upsertGroupSubscription(rec);
  }, []);

  const completeCreator = useCallback((userId: string, groupId: string) => {
    markCreatorPayoutDone(userId, groupId);
  }, []);

  return { subs, getFor, upsert, completeCreator, version: v };
}
