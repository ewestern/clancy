/* tslint:disable */
/* eslint-disable */
/**
 * ConnectHub API
 * Unified integration, token, and proxy layer for Clancy Digital-Employees
 *
 * The version of the OpenAPI document: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface OauthCallbackProviderGet200Response
 */
export interface OauthCallbackProviderGet200Response {
    /**
     * 
     * @type {string}
     * @memberof OauthCallbackProviderGet200Response
     */
    status: OauthCallbackProviderGet200ResponseStatusEnum;
    /**
     * 
     * @type {string}
     * @memberof OauthCallbackProviderGet200Response
     */
    message: string;
    /**
     * 
     * @type {string}
     * @memberof OauthCallbackProviderGet200Response
     */
    connectionId: string;
    /**
     * 
     * @type {string}
     * @memberof OauthCallbackProviderGet200Response
     */
    provider: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof OauthCallbackProviderGet200Response
     */
    grantedScopes: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof OauthCallbackProviderGet200Response
     */
    redirectUrl?: string;
}


/**
 * @export
 */
export const OauthCallbackProviderGet200ResponseStatusEnum = {
    Completed: 'completed'
} as const;
export type OauthCallbackProviderGet200ResponseStatusEnum = typeof OauthCallbackProviderGet200ResponseStatusEnum[keyof typeof OauthCallbackProviderGet200ResponseStatusEnum];


/**
 * Check if a given object implements the OauthCallbackProviderGet200Response interface.
 */
export function instanceOfOauthCallbackProviderGet200Response(value: object): value is OauthCallbackProviderGet200Response {
    if (!('status' in value) || value['status'] === undefined) return false;
    if (!('message' in value) || value['message'] === undefined) return false;
    if (!('connectionId' in value) || value['connectionId'] === undefined) return false;
    if (!('provider' in value) || value['provider'] === undefined) return false;
    if (!('grantedScopes' in value) || value['grantedScopes'] === undefined) return false;
    return true;
}

export function OauthCallbackProviderGet200ResponseFromJSON(json: any): OauthCallbackProviderGet200Response {
    return OauthCallbackProviderGet200ResponseFromJSONTyped(json, false);
}

export function OauthCallbackProviderGet200ResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): OauthCallbackProviderGet200Response {
    if (json == null) {
        return json;
    }
    return {
        
        'status': json['status'],
        'message': json['message'],
        'connectionId': json['connectionId'],
        'provider': json['provider'],
        'grantedScopes': json['grantedScopes'],
        'redirectUrl': json['redirectUrl'] == null ? undefined : json['redirectUrl'],
    };
}

export function OauthCallbackProviderGet200ResponseToJSON(json: any): OauthCallbackProviderGet200Response {
    return OauthCallbackProviderGet200ResponseToJSONTyped(json, false);
}

export function OauthCallbackProviderGet200ResponseToJSONTyped(value?: OauthCallbackProviderGet200Response | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'status': value['status'],
        'message': value['message'],
        'connectionId': value['connectionId'],
        'provider': value['provider'],
        'grantedScopes': value['grantedScopes'],
        'redirectUrl': value['redirectUrl'],
    };
}

