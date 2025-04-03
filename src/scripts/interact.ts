import {
  Mina,
  AccountUpdate,
  Provable,
  Field,
} from 'o1js';
import { SelfUpdater, Bar } from '../vkValidation.js';

async function main() {
  // setup
  const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);

  const contractAccount = Mina.TestPublicKey.random();
  const contract = new SelfUpdater(contractAccount);

  const [deployer] = Local.testAccounts;

  // deploy first verification key
  await SelfUpdater.compile();

  const originalVk = SelfUpdater._verificationKey;
  Provable.log('original verification key data:', originalVk?.data);
  Provable.log('original verification key hash:', originalVk?.hash);

  const tx = await Mina.transaction(deployer, async () => {
    AccountUpdate.fundNewAccount(deployer);
    await contract.deploy();
  });
  await tx.prove();
  await tx.sign([deployer.key, contractAccount.key]).send();

  const fooVerificationKey = Mina.getAccount(contractAccount).zkapp?.verificationKey;
  Provable.log('original verification key on chain', fooVerificationKey);

  // update verification key with mismatched hash
  const { verificationKey: barVerificationKey } = await Bar.compile();

  // Create a mismatched verification key by using Bar's data but a different hash
  const mismatchedVk = {
    data: barVerificationKey.data,
    hash: Field(123456789) // Obviously wrong hash
  };

  Provable.log("attempting to set mismatched verification key");
  const tx2 = await Mina.transaction(deployer, async () => {
    await contract.replaceVerificationKey(mismatchedVk);
  });

  try {
    await tx2.prove();
    await tx2.sign([deployer.key]).send();
    Provable.log("Transaction succeeded (unexpected)");
  } catch (error) {
    Provable.log("Transaction failed as expected:", error);
  }

  const updatedVerificationKey = Mina.getAccount(contractAccount).zkapp?.verificationKey;
  Provable.log('verification key after failed update:', updatedVerificationKey);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  }); 