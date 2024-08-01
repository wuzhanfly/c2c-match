import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import {calculateFee, coin, GasPrice} from "@cosmjs/stargate";

const rpcEndpoint = "http://118.175.0.246:47657"; // Your RPC endpoint
const mnemonic = "remove clarify notice gesture yard off live equip special stay cotton hospital novel canoe reduce trust payment ostrich mom winner equip jungle shallow regular"; // Your mnemonic
const contractAddress = "me1zqtwuecz2k9g5xs6q4vsahnvj7rkax8gwmanygppeudvmzv6txqqwddezj"; // Your CW20 contract address
const sellId = 4; // ID of the sell order to match

async function main() {
    try {
        // Create wallet
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "me" });

        // Create client
        const client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, wallet, {
            gasPrice: GasPrice.fromString("0.002umec"),
        });

        // Get account address
        const [firstAccount] = await wallet.getAccounts();
        console.log("Sender address:", firstAccount.address);

        // Build the matching method message
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

        // Simulate the transaction to estimate gas usage
        const simulationResult = await client.simulate(firstAccount.address, [executeContractEncodeObject],undefined);
        const gasUsed = simulationResult.valueOf();
        console.log(`Estimated gas used: ${gasUsed}`);

        // Calculate the fee using the estimated gas
        const fee = calculateFee(gasUsed * 2, GasPrice.fromString("0.002umec"));
        console.log(`Calculated fee: ${JSON.stringify(fee)}`);

        // Execute the contract call
        const result = await client.execute(firstAccount.address, contractAddress, matchMsg, fee, undefined, executeContractMsg.funds);
        console.log("Matching result:", result);
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();