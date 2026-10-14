export type StoreRole = "owner" | "seller";

export interface StoreMember {
  id: string;
  role: StoreRole;
  removedAt?: string | null;
}

export interface StoreAction {
  memberId: string;
  actionId: string;
  type: string;
  payload?: Record<string, unknown>;
}

export interface StoreHost {
  submitAction(action: StoreAction): Promise<{
    ok: boolean;
    actionId?: string;
    error?: string;
    version: number;
    state?: Record<string, unknown>;
    duplicate?: boolean;
  }>;
  getSnapshot(memberId: string, sinceVersion?: number): {
    unchanged: boolean;
    version: number;
    state?: Record<string, unknown>;
  };
  addMember(member: StoreMember): void;
  updateMember(memberId: string, updates: Partial<StoreMember>): void;
  removeMember(memberId: string): boolean;
  readonly version: number;
}

export function createStoreHost(options: {
  initialState: Record<string, unknown>;
  initialVersion?: number;
  members?: StoreMember[];
  persist?: (state: Record<string, unknown>, version: number) => Promise<void>;
  actionResultLimit?: number;
}): StoreHost;
