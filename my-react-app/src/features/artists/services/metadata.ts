export type MultiAssetMetadata = {
  name: string;
  description?: string;
  image: string; // Primary image
  assets?: { type: 'image' | 'audio' | 'video' | 'model'; uri: string; label?: string }[];
  attributes?: { trait_type: string; value: string | number }[];
  external_url?: string;
};

export function buildMetadata(input: MultiAssetMetadata): MultiAssetMetadata {
  // In real code, normalize/validate and ensure required fields exist
  return input;
}

