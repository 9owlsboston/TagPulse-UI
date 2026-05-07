/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Admin payload for attaching a device certificate.
 *
 * Plaintext PEM is **not** stored — only its SHA-256 thumbprint plus the
 * parsed subject. The MQTT broker (Mosquitto with EXTERNAL auth) holds the
 * PKI; the backend uses the thumbprint to map an authenticated cert back
 * to a device row.
 */
export type DeviceCertAttach = {
    cert_pem: string;
};

