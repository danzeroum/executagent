// The documented swap point for self-hosted inference (vLLM / TensorRT-LLM).
// Implementing ModelProvider here — and registering it in registry.ts — lets
// self-hosting replace managed APIs WITHOUT touching any skill. Scale-vision.
import type { ModelProvider, ProviderKind, GenParams, GenResult } from "@executagent/core";

export class SelfHostedProvider implements ModelProvider {
  readonly name = "self-hosted";
  supports(_kind: ProviderKind): boolean {
    return false;
  }
  generate(_prompt: string, _params: GenParams): Promise<GenResult> {
    return Promise.reject(
      new Error("NotImplemented: self-hosted vLLM/TensorRT provider is scale-vision (see docs/02-scale-vision.md)"),
    );
  }
}
