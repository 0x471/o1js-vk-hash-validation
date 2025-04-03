import fs from 'fs/promises';
import {
  Mina,
  PrivateKey,
  Field,
  NetworkId,
} from 'o1js';
import { SelfUpdater, Bar } from '../vkValidation.js';

let deployAlias = process.argv[2];
if (!deployAlias) throw Error(`Missing <deployAlias> argument`);

Error.stackTraceLimit = 1000;

const DEFAULT_NETWORK_ID = 'testnet';

type Config = {
  deployAliases: Record<
    string,
    {
      networkId?: string;
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};

let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];

let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

const Network = Mina.Network({
  archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
  networkId: (config.networkId ?? DEFAULT_NETWORK_ID) as NetworkId,
  mina: config.url,
});

const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);

let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new SelfUpdater(zkAppAddress);

console.log('Deployer public key:', feepayerAddress.toBase58());
console.log('zkApp public key:', zkAppAddress.toBase58());

async function main() {
  console.log('Compiling SelfUpdater contract...');
  await SelfUpdater.compile();
  
  console.log('Compiling Bar contract...');
  await Bar.compile();
  
  // Get Bar's verification key
  const { verificationKey: barVerificationKey } = await Bar.compile();
  
  // Create a mismatched verification key using Bar's data but a different hash
  const mismatchedVk = {
    data: barVerificationKey.data,
    hash: Field(123456789) // Obviously wrong hash
  };

  console.log('Creating update transaction...');
  const tx = await Mina.transaction(
    { sender: feepayerAddress, fee },
    async () => {
      await zkApp.replaceVerificationKey(mismatchedVk);
    }
  );

  console.log('Proving transaction...');
  await tx.prove();
  console.log('Signing transaction...');
  const signedTxn = await tx.sign([feepayerKey]).send();
  
  console.log('Transaction sent...');
  console.log('Transaction hash:', signedTxn.hash);
  
  console.log('Waiting for confirmation...');
  await signedTxn.wait();
  
  console.log('Update attempt completed!');
  
  // Check the new verification key
  const account = await Mina.getAccount(zkAppAddress);
  console.log('Current verification key:', account.zkapp?.verificationKey);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error updating verification key:', err);
    process.exit(1);
  }); 