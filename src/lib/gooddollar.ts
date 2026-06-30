// Client-side helpers for the GoodDollar face verification flow.
// Mirrors the reference repo logic: generate a random wallet, sign two
// fixed messages, then build a goodid.gooddollar.org URL the user can
// open. After they finish FV we check Celo's GoodDollar Identity
// contract for `isWhitelisted(address)`.

import { ethers } from "ethers";
import { compressToEncodedURIComponent } from "lz-string";

const FV_LOGIN_MSG = `Sign this message to login into GoodDollar Unique Identity service.
WARNING: do not sign this message unless you trust the website/application requesting this signature.
nonce:`;

const FV_IDENTIFIER_MSG2 = `Sign this message to request verifying your account <account> and to create your own secret unique identifier for your anonymized record.
You can use this identifier in the future to delete this anonymized record.
WARNING: do not sign this message unless you trust the website/application requesting this signature.`;

const IDENTITY_URL = "https://goodid.gooddollar.org";
const CELO_RPC = "https://forno.celo.org";
const GD_IDENTITY_ADDRESS = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42";
const GD_IDENTITY_ABI = ["function isWhitelisted(address account) view returns (bool)"];

export async function buildVerifyUrl(privateKey: string, displayName: string): Promise<{ url: string; address: string }> {
  const wallet = new ethers.Wallet(privateKey);
  const address = wallet.address;
  const nonce = (Date.now() / 1000).toFixed(0);
  const loginSig = await wallet.signMessage(FV_LOGIN_MSG + nonce);
  const fvSig = await wallet.signMessage(FV_IDENTIFIER_MSG2.replace("<account>", address));
  const params = {
    account: address,
    nonce,
    fvsig: fvSig,
    firstname: displayName || "User",
    sg: loginSig,
    chain: 42220,
  };
  const url = new URL(IDENTITY_URL);
  url.searchParams.append("lz", compressToEncodedURIComponent(JSON.stringify(params)));
  return { url: url.toString(), address };
}

export async function generateNewIdentity(displayName: string) {
  const wallet = ethers.Wallet.createRandom();
  const { url, address } = await buildVerifyUrl(wallet.privateKey, displayName);
  return { privateKey: wallet.privateKey, address, verifyUrl: url };
}

export async function isWhitelisted(address: string): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(CELO_RPC);
    const contract = new ethers.Contract(GD_IDENTITY_ADDRESS, GD_IDENTITY_ABI, provider);
    return await contract.isWhitelisted(address);
  } catch (e) {
    console.error("isWhitelisted failed:", e);
    return false;
  }
}
