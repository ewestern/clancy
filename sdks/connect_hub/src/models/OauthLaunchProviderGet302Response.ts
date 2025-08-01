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
 * @interface OauthLaunchProviderGet302Response
 */
export interface OauthLaunchProviderGet302Response {
    /**
     * 
     * @type {string}
     * @memberof OauthLaunchProviderGet302Response
     */
    location: string;
}

/**
 * Check if a given object implements the OauthLaunchProviderGet302Response interface.
 */
export function instanceOfOauthLaunchProviderGet302Response(value: object): value is OauthLaunchProviderGet302Response {
    if (!('location' in value) || value['location'] === undefined) return false;
    return true;
}

export function OauthLaunchProviderGet302ResponseFromJSON(json: any): OauthLaunchProviderGet302Response {
    return OauthLaunchProviderGet302ResponseFromJSONTyped(json, false);
}

export function OauthLaunchProviderGet302ResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): OauthLaunchProviderGet302Response {
    if (json == null) {
        return json;
    }
    return {
        
        'location': json['location'],
    };
}

export function OauthLaunchProviderGet302ResponseToJSON(json: any): OauthLaunchProviderGet302Response {
    return OauthLaunchProviderGet302ResponseToJSONTyped(json, false);
}

export function OauthLaunchProviderGet302ResponseToJSONTyped(value?: OauthLaunchProviderGet302Response | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'location': value['location'],
    };
}

