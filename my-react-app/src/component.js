import React, { Component } from 'react';
// Optional: ethers is used only for ERC-5773 calls
// Install with: npm i ethers
// eslint-disable-next-line no-unused-vars
import { ethers } from 'ethers';

// LoadMultiAssetNFT
// Given a Polygon NFT contract address, returns an array of image URLs
// for all NFTs in that collection using the Alchemy NFT API.
//
// Usage:
// - Set an env var `REACT_APP_ALCHEMY_API_KEY` (recommended), or
//   pass an `apiKey` in the options argument.
// - Optionally adjust `maxCount` to limit how many images to fetch.
// - Supports IPFS URLs by rewriting them through a configurable gateway.
//
// Example:
//   const images = await LoadMultiAssetNFT("0x...", { maxCount: 300 });
//
// Notes:
// - Enumerating all tokens for a contract reliably requires an indexer.
//   This implementation uses Alchemy's `getNFTsForCollection` endpoint,
//   which supports Polygon and handles pagination via `startToken`.

function normalizeIpfsUrl(url, gatewayBase) {
  if (!url) return null;
  const base = gatewayBase || "https://ipfs.io/ipfs/"; // You can swap for a different gateway

  // Handle ipfs://CID[/path]
  if (url.startsWith("ipfs://")) {
    const path = url.replace("ipfs://", "");
    return base + path;
  }

  // Some metadata may already have gateway URLs or http(s)
  return url;
}

function pickImageFromMetadata(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const tryKeys = [
    'image', 'image_url', 'imageUrl', 'animation_url', 'mediaUri', 'thumbnailUri', 'thumbnail', 'icon', 'content', 'src', 'url'
  ];
  for (const k of tryKeys) {
    const v = meta[k];
    if (typeof v === 'string' && v) return v;
  }
  // RMRK-style nested files
  const files = meta?.properties?.files || meta?.files;
  if (Array.isArray(files) && files.length) {
    for (const f of files) {
      const v = f?.uri || f?.src || f?.url || f?.path;
      if (typeof v === 'string' && v) return v;
    }
  }
  // Assets array
  const assets = meta?.assets;
  if (Array.isArray(assets) && assets.length) {
    for (const a of assets) {
      const v = a?.image || a?.src || a?.uri || a?.url;
      if (typeof v === 'string' && v) return v;
    }
  }
  return null;
}

function extractImageUrlFromNft(nft, gatewayBase) {
  // Prefer media[0].gateway if present
  const mediaGateway = nft?.media?.[0]?.gateway || nft?.media?.[0]?.thumbnail;
  if (mediaGateway) return normalizeIpfsUrl(mediaGateway, gatewayBase);

  // Fallback to metadata.image
  const metadataImage = nft?.metadata?.image || nft?.metadata?.image_url;
  if (metadataImage) return normalizeIpfsUrl(metadataImage, gatewayBase);

  // Fallback to tokenUri.gateway/raw
  const tokenUriGateway = nft?.tokenUri?.gateway || nft?.tokenUri?.raw;
  if (tokenUriGateway) return normalizeIpfsUrl(tokenUriGateway, gatewayBase);

  return null;
}

function pickNameFromMetadata(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const tryKeys = ['name', 'title', 'assetName', 'displayName'];
  for (const k of tryKeys) {
    const v = meta[k];
    if (typeof v === 'string' && v) return v;
  }
  // Sometimes nested
  const attrs = meta.attributes;
  if (Array.isArray(attrs)) {
    const nameAttr = attrs.find((a) => (a?.trait_type || a?.key || '').toLowerCase() === 'name');
    if (nameAttr && typeof nameAttr.value === 'string') return nameAttr.value;
  }
  return null;
}

async function fetchCollectionPage({ apiKey, contractAddress, startToken, limit = 100, withMetadata = true }) {
  // Polygon NFT API (Alchemy routes both /v2 and /nft/v2 for many endpoints; keep /v2 since it's working)
  const base = `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`;
  const params = new URLSearchParams({
    contractAddress,
    withMetadata: String(withMetadata),
    limit: String(limit),
  });
  if (startToken) params.set("startToken", String(startToken));

  const url = `${base}/getNFTsForCollection?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Alchemy API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function LoadMultiAssetNFT(contractAddress, options = {}) {
  if (!contractAddress || typeof contractAddress !== "string") {
    throw new Error("LoadMultiAssetNFT: 'contractAddress' must be a non-empty string");
  }

  const {
    apiKey = process.env.REACT_APP_ALCHEMY_API_KEY,
    maxCount = 1000, // safety cap to avoid fetching extremely large collections by default
    ipfsGatewayBase, // e.g., "https://cloudflare-ipfs.com/ipfs/"
    includeDetails = false, // when true, return objects with more info instead of just URLs
  } = options;

  if (!apiKey) {
    throw new Error(
      "LoadMultiAssetNFT: missing Alchemy API key. Set REACT_APP_ALCHEMY_API_KEY or pass options.apiKey."
    );
  }

  let nextToken = undefined;
  const results = [];
  const seen = new Set();

  while (results.length < maxCount) {
    const page = await fetchCollectionPage({ apiKey, contractAddress, startToken: nextToken, limit: 100, withMetadata: true });
    const nfts = page?.nfts || [];

    for (const nft of nfts) {
      const img = extractImageUrlFromNft(nft, ipfsGatewayBase);
      if (img && !seen.has(img)) {
        seen.add(img);
        if (includeDetails) {
          results.push({
            image: img,
            contractAddress: nft?.contract?.address || contractAddress,
            tokenId: nft?.id?.tokenId,
            title: nft?.title,
          });
        } else {
          results.push(img);
        }
        if (results.length >= maxCount) break;
      }
    }

    // Alchemy v2 returns `nextToken` for pagination
    nextToken = page?.nextToken;
    if (!nextToken || nfts.length === 0) break;
  }

  return results;
}

// ---- ERC-5773 (Multi-Asset) helpers ----

const ERC5773_MIN_ABI = [
  // Active / pending asset IDs for a token
  "function getActiveAssets(uint256 tokenId) view returns (uint64[])",
  "function getPendingAssets(uint256 tokenId) view returns (uint64[])",
  // Overloaded metadata getters in the wild
  "function getAssetMetadata(uint256 tokenId, uint64 assetId) view returns (string)",
  "function getAssetMetadata(uint256 tokenId, uint256 assetId) view returns (string)",
  "function getAssetMetadata(uint64 assetId) view returns (string)",
  "function getAssetMetadata(uint256 assetId) view returns (string)",
];

async function tryGetAssetMetadata(contract, tokenId, assetId) {
  // Use explicit signatures to avoid overloaded-call ambiguity
  const candidates = [
    "getAssetMetadata(uint256,uint64)",
    "getAssetMetadata(uint256,uint256)",
    "getAssetMetadata(uint64)",
    "getAssetMetadata(uint256)",
  ];
  for (const sig of candidates) {
    try {
      const fn = contract.getFunction(sig);
      if (sig.includes(",")) {
        // two-arg variant
        return await fn(tokenId, assetId);
      }
      // single-arg variant
      return await fn(assetId);
    } catch (e) {
      // try next signature
      // eslint-disable-next-line no-console
      console.debug("getAssetMetadata candidate failed", sig, e?.reason || e?.message || e);
    }
  }
  throw new Error("No working getAssetMetadata signature on contract");
}

async function fetchMaybeJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json,*/*' } });
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  if (contentType.includes('application/json') || text.trim().startsWith('{')) {
    try { return { json: JSON.parse(text) }; } catch { /* fallthrough */ }
  }
  return { text };
}

// Given a contract + tokenId on Polygon, fetch image URLs for active assets (ERC-5773)
export async function LoadTokenAssetsERC5773(contractAddress, tokenId, options = {}) {
  if (!contractAddress) throw new Error('contractAddress required');
  if (tokenId === undefined || tokenId === null) throw new Error('tokenId required');

  const {
    apiKey = process.env.REACT_APP_ALCHEMY_API_KEY,
    rpcUrl = `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`,
    ipfsGatewayBase,
  } = options;

  if (!apiKey && (!rpcUrl || !rpcUrl.includes('alchemy.com'))) {
    throw new Error('Missing Alchemy API key or rpcUrl');
  }

  // ethers v6
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, ERC5773_MIN_ABI, provider);

  // Normalize tokenId: can be hex string or decimal string. Ethers accepts strings directly.
  const tid = tokenId;

  // 1) Get active asset IDs; if empty or fails, try pending as a fallback
  let assetIds = [];
  try {
    const fnActive = contract.getFunction("getActiveAssets(uint256)");
    assetIds = await fnActive(tid);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug('getActiveAssets failed', e?.reason || e?.message || e);
  }
  if (!assetIds || assetIds.length === 0) {
    try {
      const fnPending = contract.getFunction("getPendingAssets(uint256)");
      const alt = await fnPending(tid);
      assetIds = Array.isArray(alt) ? alt : [];
    } catch (e2) {
      // eslint-disable-next-line no-console
      console.debug('getPendingAssets failed', e2?.reason || e2?.message || e2);
      assetIds = [];
    }
  }

  // 2) For each assetId, get metadata URI, resolve image
  const out = [];
  for (const a of assetIds) {
    // Keep as BigNumberish: bigint, number, or string are fine for ethers
    const assetId = typeof a === 'bigint' ? a : (typeof a === 'number' ? a : a?.toString?.() ?? a);
    let metaUri = await tryGetAssetMetadata(contract, tid, assetId).catch((err) => {
      // eslint-disable-next-line no-console
      console.debug('getAssetMetadata failed', err?.reason || err?.message || err);
      return null;
    });
    metaUri = normalizeIpfsUrl(metaUri, ipfsGatewayBase);
    if (!metaUri) continue;

    let imageUrl = null;
    try {
      const { json } = await fetchMaybeJson(metaUri);
      if (json) {
        const picked = pickImageFromMetadata(json);
        imageUrl = normalizeIpfsUrl(picked, ipfsGatewayBase) || metaUri;
        const name = pickNameFromMetadata(json);
        if (imageUrl) out.push({ image: imageUrl, name: name || null, metaUri });
      } else {
        imageUrl = metaUri; // not json: assume direct image
        out.push({ image: imageUrl, name: null, metaUri });
      }
    } catch {
      imageUrl = metaUri; // fallback
      out.push({ image: imageUrl, name: null, metaUri });
    }
  }

  return out;
}

// ---- ERC-7401 (Nestable) helpers ----
const ERC7401_MIN_ABI_A = [
  // Some impls: returns array of tuples (contractAddress, tokenId)
  "function childrenOf(uint256 tokenId) view returns (tuple(address,uint256)[])",
];
const ERC7401_MIN_ABI_B = [
  // Others add extra fields; we decode only first two
  "function childrenOf(uint256 tokenId) view returns (tuple(address,uint256,uint256)[])",
];

async function tryChildrenOf(provider, contractAddress, tokenId) {
  try {
    const c = new ethers.Contract(contractAddress, ERC7401_MIN_ABI_A, provider);
    return await c.childrenOf(tokenId);
  } catch (_) {
    const c2 = new ethers.Contract(contractAddress, ERC7401_MIN_ABI_B, provider);
    return await c2.childrenOf(tokenId);
  }
}

async function fetchNftImageViaAlchemy(apiKey, contractAddress, tokenId, ipfsGatewayBase) {
  const base = `https://polygon-mainnet.g.alchemy.com/nft/v2/${apiKey}`;
  const params = new URLSearchParams({ contractAddress, tokenId, refreshCache: 'false' });
  const url = `${base}/getNFTMetadata?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`getNFTMetadata ${res.status}`);
  const data = await res.json();
  // Prefer media[0].gateway
  const media = data?.media?.[0]?.gateway || data?.media?.[0]?.raw;
  if (media) return { image: normalizeIpfsUrl(media, ipfsGatewayBase), name: data?.title || data?.metadata?.name || null };
  // Fallback to metadata.image
  const img = data?.metadata?.image || data?.metadata?.image_url;
  if (img) return { image: normalizeIpfsUrl(img, ipfsGatewayBase), name: data?.title || data?.metadata?.name || null };
  return { image: null, name: data?.title || data?.metadata?.name || null };
}

// Loads images for direct child NFTs of a token (ERC-7401 Nestable)
export async function LoadTokenChildrenERC7401(contractAddress, tokenId, options = {}) {
  if (!contractAddress) throw new Error('contractAddress required');
  if (tokenId === undefined || tokenId === null) throw new Error('tokenId required');

  const {
    apiKey = process.env.REACT_APP_ALCHEMY_API_KEY,
    rpcUrl = `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`,
    ipfsGatewayBase,
  } = options;
  if (!apiKey && (!rpcUrl || !rpcUrl.includes('alchemy.com'))) {
    throw new Error('Missing Alchemy API key or rpcUrl');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const children = await tryChildrenOf(provider, contractAddress, tokenId).catch(() => []);
  if (!children || children.length === 0) return [];

  const images = [];
  for (const ch of children) {
    // ch may be array-like: [address, tokenId, ...]
    const childAddress = ch.contractAddress || ch[0];
    const childTokenId = ch.tokenId || ch[1];
    try {
      const meta = await fetchNftImageViaAlchemy(apiKey, childAddress, childTokenId, ipfsGatewayBase);
      if (meta?.image) images.push({ image: meta.image, name: meta.name || null, contractAddress: childAddress, tokenId: childTokenId });
    } catch (_) {
      // ignore
    }
  }
  return images;
}

export default LoadMultiAssetNFT;
