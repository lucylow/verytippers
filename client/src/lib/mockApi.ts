import { TipPayload, MetaTx, TxReceipt, User } from '@/types/tip'
import { wait, makeCID, makeTxHash, uid } from '@/lib/utils'

// --- in-memory DB ---
const users: Record<string, User> = {
  u1: { id: 'u1', username: 'alice', displayName: 'Alice', balance: 1200 },
  u2: { id: 'u2', username: 'devMaster', displayName: 'DevMaster', balance: 950 },
  u3: { id: 'u3', username: 'cryptoking', displayName: 'CryptoKing', balance: 1280 },
}

const ledger: TxReceipt[] = []
let nonceCounter = 1000

// simple leaderboard computation
function computeLeaderboard() {
  const tally: Record<string, number> = {}
  for (const tx of ledger) {
    tally[tx.to] = (tally[tx.to] || 0) + tx.amount
  }
  // return top 10
  const arr = Object.entries(tally)
    .map(([username, total]) => ({ username, total }))
    .sort((a, b) => b.total - a.total)
  return arr
}

// API: client signs payload and "sends" it to orchestrator
export async function api_signPayload(payload: TipPayload, signerUserId: string) {
  // simulate client-side signature only, return "signed payload"
  await wait(200)
  return {
    ...payload,
    signedBy: signerUserId,
    signature: 'SIG:' + uid('sig_')
  }
}

// API: ipfs add (encrypted) -> returns CID
export async function api_ipfsAdd(encryptedBlob: string) {
  await wait(300 + Math.random() * 300)
  return { cid: makeCID() }
}

// API: orchestrator -> queue metaTx for relayer
export async function api_createMetaTx(payload: TipPayload, cid: string) {
  await wait(200)
  const metaTx: MetaTx = {
    to: payload.to,
    amount: payload.amount,
    cid,
    nonce: ++nonceCounter
  }
  // store locally in queue by returning it
  return metaTx
}

// Relayer: sign & submit to chain (mock) => returns tx receipt
export async function api_relayerSubmit(metaTx: MetaTx, relayerId = 'relayer1') {
  // simulate policy checks
  await wait(600 + Math.random() * 400)
  // simple fraud policy: max tip 1000
  if (metaTx.amount > 100000) throw new Error('Amount exceeds relayer policy')

  const tx: TxReceipt = {
    txHash: makeTxHash(),
    cid: metaTx.cid,
    from: relayerId,
    to: metaTx.to,
    amount: metaTx.amount,
    blockNumber: Math.floor(1000000 + Math.random() * 10000)
  }
  // push to ledger (indexer later consumes)
  ledger.push(tx)
  return tx
}

// indexer: returns ledger & leaderboard
export async function api_getLedger() {
  await wait(120)
  return ledger.slice().reverse()
}

export async function api_getLeaderboard() {
  await wait(80)
  return computeLeaderboard()
}

// small helper endpoint for starter data
export async function api_getUsers() {
  await wait(80)
  return Object.values(users)
}

