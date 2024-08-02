import { DirectSecp256k1HdWallet, encodePubkey, makeAuthInfoBytes, makeSignDoc, Registry, TxBodyEncodeObject } from "@cosmjs/proto-signing";
import {calculateFee, GasPrice} from "@cosmjs/stargate";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { fromBase64, toBase64 } from "@cosmjs/encoding";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { coin, coins } from "@cosmjs/amino";

const rpcEndpoint = "http://118.xxx:47657"; // Your RPC endpoint
const mnemonic = "remove clarify notice gesture yard off live equip special stay cotton hospital novel canoe reduce trust payment ostrich mom winner equip jungle shallow regular"; // Your mnemonic
const contractAddress = "me1zqtwuecz2k9g5xs6q4vsahnvj7rkax8gwmanygppeudvmzv6txqqwddezj"; // Your CW20 contract address
const sellId = 4; // ID of the sell order to match

async function raw() {
    try {
        // Create wallet
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "me" });
        const [account] = await wallet.getAccounts();

        // Create client
        const client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, wallet, {
            gasPrice: GasPrice.fromString("0.002umec"),
        });

        // Get account address
        const [firstAccount] = await wallet.getAccounts();
        console.log("Sender address:", firstAccount.address);
        const matchMsg = {
            match: {
                id: sellId,
            },
        };

        // Build MsgExecuteContract message
        const executeContractMsg: MsgExecuteContract = {
            sender: firstAccount.address,
            contract: contractAddress,
            msg: new TextEncoder().encode(JSON.stringify(matchMsg)),
            funds: [coin(1000, "ibc/AFCBD58BDB678E9C1E06D3716999FFB690C09D0E1860F9BFB3E86565E5E7FF55")], // The amount and type of native coins to pay
        };

        // Package the message into EncodeObject
        const executeContractEncodeObject = {
            typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
            value: executeContractMsg,
        };

        const memo = "Use your power wisely";

        // Create and sign TxRaw without using the sign() method
        const registry = new Registry([
            ["/cosmwasm.wasm.v1.MsgExecuteContract", MsgExecuteContract]
        ]);
        const txBodyFields: TxBodyEncodeObject = {
            typeUrl: "/cosmos.tx.v1beta1.TxBody",
            value: {
                messages: [executeContractEncodeObject],
                memo,
            },
        };
        const txBodyBytes = registry.encode(txBodyFields);

        const { accountNumber, sequence } = await client.getSequence(firstAccount.address);
        const feeAmount = coins(2000, "umec");

        const pubkey = encodePubkey({
            type: "tendermint/PubKeySecp256k1",
            value: toBase64(account.pubkey),
        });
        // Package the message into EncodeObject

        // Simulate the transaction to estimate gas usage
        const simulationResult = await client.simulate(firstAccount.address, [executeContractEncodeObject],memo);
        const gasUsed = simulationResult.valueOf();
        console.log(`Estimated gas used: ${gasUsed}`);

        // Calculate the fee using the estimated gas
        const fee = calculateFee(gasUsed * 2, GasPrice.fromString("0.002umec"));
        console.log(`Calculated fee: ${JSON.stringify(fee)}`);

        const authInfoBytes = makeAuthInfoBytes(
            [{ pubkey, sequence }],
            feeAmount,
            gasUsed * 2,
            undefined, // granter
            undefined // signMode
        );

        const chainId = await client.getChainId();
        const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, chainId, accountNumber);
        const { signed, signature } = await wallet.signDirect(firstAccount.address, signDoc);

        const txRaw = TxRaw.fromPartial({
            bodyBytes: signed.bodyBytes,
            authInfoBytes: signed.authInfoBytes,
            signatures: [fromBase64(signature.signature)],
        });

        // Encode TxRaw to generate txBytes
        const txBytes = TxRaw.encode(txRaw).finish();
        // Broadcast the transaction (if needed)
        const broadcastResult = await client.broadcastTx(txBytes);
        // assertIsBroadcastTxSuccess(broadcastResult);
        console.log("Broadcast result:", broadcastResult);

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

raw().catch(console.error);
