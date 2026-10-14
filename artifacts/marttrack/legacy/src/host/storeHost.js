import { martTrackReducer } from "../state/martTrackReducer.js";
import { createActionQueue } from "./actionQueue.js";
import { filterState } from "./filterState.js";
import { canPerformAction } from "./permissions.js";

const DEFAULT_RESULT_LIMIT = 500;

const clone = value => JSON.parse(JSON.stringify(value));

const normaliseMembers = members => {
  if (members instanceof Map) return new Map(members);
  if (!Array.isArray(members)) return new Map();
  return new Map(members.map(member => [member.id, { ...member }]));
};

export const createStoreHost = ({
  initialState,
  initialVersion = 0,
  members = [],
  persist = async () => {},
  actionResultLimit = DEFAULT_RESULT_LIMIT,
}) => {
  if (!initialState || typeof initialState !== "object") {
    throw new TypeError("A valid initial store state is required");
  }
  if (!Number.isInteger(initialVersion) || initialVersion < 0) {
    throw new TypeError("The initial version must be a non-negative integer");
  }
  if (!Number.isInteger(actionResultLimit) || actionResultLimit < 1) {
    throw new TypeError("The action result limit must be a positive integer");
  }

  let state = clone(initialState);
  let version = initialVersion;
  const memberMap = normaliseMembers(members);
  const actionResults = new Map();
  const enqueue = createActionQueue();

  const memberFor = memberId => {
    const member = memberMap.get(memberId);
    if (!member || member.removedAt) throw new Error("Store member not found");
    return member;
  };

  const snapshotFor = member => filterState(state, member.role);
  const rememberResult = (actionId, result) => {
    actionResults.set(actionId, result);
    while (actionResults.size > actionResultLimit) {
      actionResults.delete(actionResults.keys().next().value);
    }
  };

  return {
    async submitAction({ memberId, actionId, type, payload }) {
      return enqueue(async () => {
        let member;
        try {
          member = memberFor(memberId);
        } catch (error) {
          return { ok: false, error: error.message, version };
        }

        if (typeof actionId !== "string" || actionId.length < 8 || actionId.length > 128) {
          return { ok: false, error: "A valid actionId is required", version };
        }

        const previous = actionResults.get(actionId);
        if (previous) {
          if (previous.memberId !== memberId) {
            return { ok: false, error: "actionId has already been used", version };
          }
          if (!previous.result.ok) return { ...previous.result, version };
          return {
            ...previous.result,
            version,
            state: snapshotFor(member),
            duplicate: true,
          };
        }

        if (!canPerformAction(member.role, type)) {
          const result = {
            ok: false,
            actionId,
            error: `Role "${member.role}" cannot perform ${type || "this action"}`,
            version,
          };
          rememberResult(actionId, { memberId, result });
          return result;
        }

        const nextState = martTrackReducer(state, { type, payload });
        if (nextState.lastActionError) {
          const result = {
            ok: false,
            actionId,
            error: nextState.lastActionError,
            version,
          };
          rememberResult(actionId, { memberId, result });
          return result;
        }

        const nextVersion = version + 1;
        try {
          await persist(clone(nextState), nextVersion);
        } catch (error) {
          return {
            ok: false,
            actionId,
            error: error instanceof Error ? error.message : "Unable to save this action",
            version,
          };
        }

        state = nextState;
        version = nextVersion;
        const result = {
          ok: true,
          actionId,
          version,
          state: snapshotFor(member),
        };
        rememberResult(actionId, { memberId, result });
        return result;
      });
    },

    getSnapshot(memberId, sinceVersion = -1) {
      const member = memberFor(memberId);
      if (
        Number.isInteger(sinceVersion) &&
        sinceVersion >= version
      ) {
        return { unchanged: true, version };
      }
      return {
        unchanged: false,
        version,
        state: snapshotFor(member),
      };
    },

    addMember(member) {
      if (!member?.id || memberMap.has(member.id)) {
        throw new Error("A unique member id is required");
      }
      memberMap.set(member.id, { ...member });
    },

    updateMember(memberId, updates) {
      const member = memberFor(memberId);
      memberMap.set(memberId, { ...member, ...updates, id: member.id });
    },

    removeMember(memberId) {
      return memberMap.delete(memberId);
    },

    get version() {
      return version;
    },
  };
};
