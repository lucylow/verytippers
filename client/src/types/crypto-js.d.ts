declare module 'crypto-js' {
  export interface WordArray {
    toString(encoder?: any): string;
  }

  export interface CipherParams {
    ciphertext: WordArray;
    key: WordArray;
    iv: WordArray;
    salt?: WordArray;
    algorithm?: any;
    mode?: any;
    padding?: any;
    blockSize?: number;
    formatter?: any;
  }

  export class AES {
    static encrypt(message: string, passphrase: string): CipherParams;
    static decrypt(encrypted: string, passphrase: string): WordArray;
  }

  export namespace enc {
    export class Utf8 {
      static stringify(wordArray: WordArray): string;
    }
  }
}

