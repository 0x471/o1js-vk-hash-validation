import {
  SmartContract,
  VerificationKey,
  method,
  Permissions,
  Mina,
  AccountUpdate,
  Provable,
  Field,
} from 'o1js';

export class SelfUpdater extends SmartContract {
  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey: Permissions.VerificationKey.proofDuringCurrentVersion(),
    });
  }

  @method async replaceVerificationKey(verificationKey: VerificationKey) {
    this.account.verificationKey.set(verificationKey);
  }
}

export class Bar extends SmartContract {
  @method async call() {
    Provable.log('Bar');
  }
} 