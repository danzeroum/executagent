// Image-generation provider. Concrete vendor is configurable via endpoint/key;
// the contract is what matters. Tier → resolution/steps. Returns real image
// bytes + usage. This is where the prototype's fake SVG specimen is permanently
// replaced by real generated images. (CI/e2e use MockProvider; this path needs a key.)
import type { ModelProvider, ProviderKind, GenParams, GenResult } from "@executagent/core";

export const TIER_IMAGE_PARAMS: Record<GenParams["tier"], { size: number; steps: number }> = {
  S: { size: 512, steps: 20 },
  M: { size: 768, steps: 30 },
  L: { size: 1024, steps: 45 },
};

export interface ImageProviderConfig {
  apiKey: string;
  /** POST endpoint returning image bytes (or a JSON { image_base64 }). */
  apiUrl: string;
  model?: string;
}

export class ImageProvider implements ModelProvider {
  readonly name = "image";
  constructor(private readonly cfg: ImageProviderConfig) {}

  supports(kind: ProviderKind): boolean {
    return kind === "image";
  }

  async generate(prompt: string, params: GenParams): Promise<GenResult> {
    const tp = TIER_IMAGE_PARAMS[params.tier];
    const start = performance.now();
    const res = await fetch(this.cfg.apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.model ?? "image-default",
        prompt,
        width: tp.size,
        height: tp.size,
        steps: tp.steps,
        seed: params.seed,
      }),
    });
    if (!res.ok) throw new Error(`Image API ${res.status}: ${await res.text()}`);

    const ct = res.headers.get("content-type") ?? "";
    let bytes: Uint8Array;
    let contentType = "image/png";
    if (ct.includes("application/json")) {
      const data = (await res.json()) as { image_base64?: string; content_type?: string };
      if (!data.image_base64) throw new Error("Image API returned no image_base64");
      bytes = base64ToBytes(data.image_base64);
      if (data.content_type) contentType = data.content_type;
    } else {
      bytes = new Uint8Array(await res.arrayBuffer());
      if (ct) contentType = ct;
    }

    return {
      kind: "image",
      bytes,
      contentType,
      model: this.cfg.model ?? "image-default",
      provider: this.name,
      usage: { images: 1, latencyMs: Math.round(performance.now() - start) },
    };
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
