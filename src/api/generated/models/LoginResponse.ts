/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LoginUserInfo } from './LoginUserInfo';
/**
 * Successful login response with JWT token.
 */
export type LoginResponse = {
    access_token: string;
    token_type?: string;
    expires_in: number;
    user: LoginUserInfo;
};

