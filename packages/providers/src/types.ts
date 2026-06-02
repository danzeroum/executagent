// The provider contract is defined in @executagent/core (so skills and providers
// share one source of truth without a circular import). Re-exported here because
// the original architecture names packages/providers/src/types.ts as the contract.
export type {
  ModelProvider,
  ProviderKind,
  GenParams,
  GenResult,
  EmbedResult,
  Usage,
  Tier,
} from "@executagent/core";
