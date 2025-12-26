export type User = {
  id: string
  username: string
  displayName?: string
  balance: number
}

export type TipPayload = {
  from: string // user id
  to: string   // username or user id depending
  amount: number
  message?: string
  timestamp: number
}

export type MetaTx = {
  to: string
  amount: number
  cid: string
  nonce: number
  signer?: string
}

export type TxReceipt = {
  txHash: string
  cid?: string
  from: string
  to: string
  amount: number
  blockNumber?: number
}

