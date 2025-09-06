// Utility loader for multi-asset NFTs based on helpers used in App.js
// Provides a class API to load all tokens for a contract and expose
// convenient getters, especially image links for ERC-5773 assets.

import LoadMultiAssetNFT, { LoadTokenAssetsERC5773 } from './component';

// Keep this in sync with App.js
export const DEFAULT_CONTRACT = '0x2499809520bb9A8847a82Fb51126c3483eE87d14';

function normalizeTokenId(tokenId) {
  // Accept hex like 0x1a, or decimal like "26"; return lowercase hex prefixed with 0x if possible
  if (tokenId == null) return null;
  const t = String(tokenId).trim();
  if (t.startsWith('0x') || t.startsWith('0X')) return t.toLowerCase();
  // For non-hex input, just return as-is to avoid relying on BigInt.
  // We also store the raw key elsewhere, so lookups still work.
  return t;
}

function keyFromName(name, fallbackIndex) {
  if (typeof name === 'string' && name.trim()) {
    const k = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (k) return k;
  }
  return `asset_${fallbackIndex + 1}`;
}

export default class NFTLoader {
  constructor({ contract = DEFAULT_CONTRACT, apiKey = process.env.REACT_APP_ALCHEMY_API_KEY, ipfsGatewayBase } = {}) {
    this.contract = contract;
    this.apiKey = apiKey;
    this.ipfsGatewayBase = ipfsGatewayBase;
    this._loaded = false;
    this._data = { contract, items: [], byTokenId: {} };
  }

  // Loads list of tokens, then fetches ERC-5773 assets for each token
  async loadAll({ maxCount = 1000 } = {}) {
    const baseItems = await LoadMultiAssetNFT(this.contract, {
      apiKey: this.apiKey,
      maxCount,
      ipfsGatewayBase: this.ipfsGatewayBase,
      includeDetails: true,
    });

    const outItems = [];
    const byTokenId = {};

    for (const it of baseItems) {
      const tid = normalizeTokenId(it.tokenId);
      let assets = [];
      try {
        assets = await LoadTokenAssetsERC5773(this.contract, it.tokenId, {
          apiKey: this.apiKey,
          ipfsGatewayBase: this.ipfsGatewayBase,
        });
      } catch (_) {
        assets = [];
      }

      // Build attributes map with separate keys per asset
      const attributes = {};
      const imageLinks = [];
      assets.forEach((a, i) => {
        const key = keyFromName(a?.name, i);
        if (!(key in attributes)) attributes[key] = a?.image || null;
        imageLinks.push(a?.image || null);
      });

      const record = {
        tokenId: tid || it.tokenId,
        tokenIdRaw: it.tokenId,
        title: it.title || null,
        previewImage: it.image || null, // from collection listing
        assets,
        attributes, // images keyed by normalized asset name or asset_# fallback
        imageLinks, // array of URLs for convenience
      };
      outItems.push(record);
      if (tid) byTokenId[tid] = record;
      byTokenId[it.tokenId] = record; // keep original key too
    }

    this._data = { contract: this.contract, items: outItems, byTokenId };
    this._loaded = true;
    return this._data;
  }

  // ---- Getters ----
  ensureLoaded() {
    if (!this._loaded) throw new Error('NFTLoader: call loadAll() first');
  }

  getAll() {
    this.ensureLoaded();
    return this._data;
  }

  getTokens() {
    this.ensureLoaded();
    return this._data.items;
  }

  getByTokenId(tokenId) {
    this.ensureLoaded();
    const key = normalizeTokenId(tokenId);
    return this._data.byTokenId[key] || this._data.byTokenId[String(tokenId)] || null;
  }

  getImageLinks(tokenId) {
    const rec = this.getByTokenId(tokenId);
    return rec?.imageLinks || [];
  }

  getAttributes(tokenId) {
    const rec = this.getByTokenId(tokenId);
    return rec?.attributes || {};
  }
}
