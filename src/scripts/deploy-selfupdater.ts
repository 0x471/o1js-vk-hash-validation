import fs from 'fs/promises';
import {
  Mina,
  PrivateKey,
  AccountUpdate,
  NetworkId,
} from 'o1js';
import { SelfUpdater } from '../vkValidation.js';

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
let zkAppKey = PrivateKey.random();

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
  console.log('Compiling smart contract...');
  await SelfUpdater.compile();
  
  console.log('Creating deployment transaction...');
  const deployTxn = await Mina.transaction(
    { sender: feepayerAddress, fee },
    async () => {
      AccountUpdate.fundNewAccount(feepayerAddress);
      await zkApp.deploy();
    }
  );

  console.log('Proving transaction...');
  await deployTxn.prove();
  
  console.log('Signing transaction...');
  const signedTxn = await deployTxn.sign([feepayerKey, zkAppKey]).send();
  
  console.log('Transaction sent...');
  console.log('Transaction hash:', signedTxn.hash);
  
  console.log('Waiting for confirmation...');
  await signedTxn.wait();
  
  console.log('Deployment successful!');
  console.log('zkApp address:', zkAppAddress.toBase58());
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error deploying zkApp:', err);
    process.exit(1);
  }); 