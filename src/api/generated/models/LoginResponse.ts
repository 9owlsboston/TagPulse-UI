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
    expires_in: number;
    token_type?: string;
    user: LoginUserInfo;
};

