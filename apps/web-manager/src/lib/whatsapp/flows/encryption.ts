import { constants, createCipheriv, createDecipheriv, createPrivateKey, privateDecrypt } from "crypto";

export type WhatsAppFlowEncryptedRequest = {
  encrypted_aes_key: string;
  encrypted_flow_data: string;
  initial_vector: string;
};

export type WhatsAppFlowDecryptedPayload = {
  version?: string;
  action?: string;
  screen?: string;
  data?: Record<string, unknown>;
  flow_token?: string;
};

export function decryptWhatsAppFlowRequest(
  body: WhatsAppFlowEncryptedRequest,
  privatePem: string,
  passphrase?: string
): {
  decryptedBody: WhatsAppFlowDecryptedPayload;
  aesKeyBuffer: Buffer;
  initialVectorBuffer: Buffer;
} {
  const privateKey = createPrivateKey({
    key: privatePem,
    passphrase: passphrase || undefined
  });

  const aesKeyBuffer = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256"
    },
    Buffer.from(body.encrypted_aes_key, "base64")
  );

  const flowDataBuffer = Buffer.from(body.encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(body.initial_vector, "base64");
  const tagLength = 16;
  const encryptedBody = flowDataBuffer.subarray(0, -tagLength);
  const authTag = flowDataBuffer.subarray(-tagLength);

  const decipher = createDecipheriv("aes-128-gcm", aesKeyBuffer, initialVectorBuffer);
  decipher.setAuthTag(authTag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encryptedBody),
    decipher.final()
  ]).toString("utf-8");

  return {
    decryptedBody: JSON.parse(decryptedJSONString) as WhatsAppFlowDecryptedPayload,
    aesKeyBuffer,
    initialVectorBuffer
  };
}

export function encryptWhatsAppFlowResponse(
  response: unknown,
  aesKeyBuffer: Buffer,
  initialVectorBuffer: Buffer
): string {
  const flippedIv = Buffer.alloc(initialVectorBuffer.length);
  for (let index = 0; index < initialVectorBuffer.length; index += 1) {
    flippedIv[index] = initialVectorBuffer[index]! ^ 0xff;
  }

  const cipher = createCipheriv("aes-128-gcm", aesKeyBuffer, flippedIv);
  return Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
    cipher.getAuthTag()
  ]).toString("base64");
}
