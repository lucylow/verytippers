import { ethers } from 'ethers';

const CONTRACT_ADDRESSES = {
    TIP_CONTRACT: '0xTipContractAddress',
    VERY_TOKEN: '0xVeryTokenAddress',
};

export async function signTipMetaTx(
    senderAddress: string,
    recipientAddress: string,
    amount: string,
    token: string,
    messageHash: string
) {
    if (!window.ethereum) throw new Error("No crypto wallet found");
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const domain = {
        name: 'VeryTippers',
        version: '1',
        chainId: 12345, // Very Chain ID
        verifyingContract: CONTRACT_ADDRESSES.TIP_CONTRACT
    };

    const types = {
        Tip: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'messageHash', type: 'string' }
        ]
    };

    const value = {
        from: senderAddress,
        to: recipientAddress,
        token: token,
        amount: ethers.parseUnits(amount, 18),
        messageHash: messageHash
    };

    const signature = await signer.signTypedData(domain, types, value);
    return signature;
}

export async function sendTipToBackend(
    senderId: string,
    recipientId: string,
    amount: number,
    message: string,
    signature?: string
): Promise<{ success: boolean, message: string }> {
    try {
        const response = await fetch('/api/v1/tip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                senderId,
                recipientId,
                amount: amount.toString(),
                token: CONTRACT_ADDRESSES.VERY_TOKEN,
                message,
                signature // Real signature from EIP-712
            }),
        });

        const data = await response.json();
        return { success: response.ok, message: data.message };
    } catch (error) {
        console.error('Frontend tip error:', error);
        return { success: false, message: 'Network error or server unreachable.' };
    }
}
